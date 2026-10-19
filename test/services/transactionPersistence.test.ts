import type TransactionInput from "@/types/TransactionInput";
import createTestDatabase from "@test/helpers/sqliteTestDatabase";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/id", () => ({ default: () => randomUUID() }));

import SCHEMA_MIGRATIONS from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import financeRepository from "@/repositories/financeRepository";
import analysisService from "@/services/analysisService";
import sourceService from "@/services/sourceService";
import transactionService from "@/services/transactionService";
import tripTotalService from "@/services/tripTotalService";
import moneyUtils from "@/utils/money";
import { getTrendSeries } from "@/utils/trends";

const createFixture = async (): Promise<
	ReturnType<typeof createTestDatabase>
> => {
	const result = createTestDatabase();
	await result.database.execAsync(SCHEMA_SQL);
	for (const migration of SCHEMA_MIGRATIONS) {
		await result.database.execAsync(migration);
	}
	result.sqlite.exec(`
		INSERT INTO sources VALUES ('bank', 'Bank', 'INR', NULL, NULL, 1, 2);
		INSERT INTO categories (id, name, kind, created_at, updated_at) VALUES ('food', 'Food', 'EXPENSE', 1, 2);
		INSERT INTO categories (id, name, kind, created_at, updated_at) VALUES ('grocery', 'Grocery', 'EXPENSE', 1, 2);
		INSERT INTO categories (id, name, kind, created_at, updated_at) VALUES ('salary', 'Salary', 'INCOME', 1, 2);
	`);
	return result;
};

const expense: TransactionInput = {
	classification: "GENERAL",
	type: "DEBIT",
	sourceId: "bank",
	amount: "0",
	reason: "Supermart shopping",
	transactionAt: 100,
	items: [
		{ categoryId: "food", amount: "100" },
		{ categoryId: "grocery", amount: "100" },
	],
};

describe("split expense persistence", () => {
	it.each(["edit", "delete"])(
		"clears source validation after a payment %s",
		async (operation) => {
			const { database } = await createFixture();
			await sourceService.validateSource(database, "bank");
			const id = await transactionService.saveTransaction(
				database,
				expense,
			);
			expect(
				(await sourceService.getSource(database, "bank"))?.validatedAt,
			).toBeNull();
			await sourceService.validateSource(database, "bank");
			expect(
				(await sourceService.getSource(database, "bank"))?.validatedAt,
			).not.toBeNull();
			if (operation === "edit") {
				await transactionService.saveTransaction(database, {
					...expense,
					id,
					items: [{ categoryId: "food", amount: "250" }],
				});
			} else {
				await transactionService.deleteTransaction(database, id);
			}
			expect(await sourceService.getSources(database)).toMatchObject([
				{
					balance: operation === "edit" ? "-250" : "0",
					validatedAt: null,
				},
			]);
		},
	);

	it("invalidates both old and new transfer accounts and preserves unrelated validation", async () => {
		const { database } = await createFixture();
		const oldDestination = await sourceService.createSource(
			database,
			"Old destination",
			"INR",
		);
		const newSource = await sourceService.createSource(
			database,
			"New source",
			"INR",
		);
		const newDestination = await sourceService.createSource(
			database,
			"New destination",
			"INR",
		);
		const unrelated = await sourceService.createSource(
			database,
			"Unrelated",
			"INR",
		);
		const transfer: TransactionInput = {
			classification: "GENERAL",
			type: "TRANSFER",
			sourceId: "bank",
			destinationSourceId: oldDestination,
			amount: "10",
			reason: "Transfer",
			transactionAt: 100,
		};
		const id = await transactionService.saveTransaction(database, transfer);
		const allSources = [
			"bank",
			oldDestination,
			newSource,
			newDestination,
			unrelated,
		];
		for (const sourceId of allSources)
			await sourceService.validateSource(database, sourceId);
		await transactionService.saveTransaction(database, {
			...transfer,
			id,
			sourceId: newSource,
			destinationSourceId: newDestination,
		});
		for (const sourceId of allSources.slice(0, -1)) {
			expect(
				(await sourceService.getSource(database, sourceId))
					?.validatedAt,
			).toBeNull();
		}
		expect(
			(await sourceService.getSource(database, unrelated))?.validatedAt,
		).not.toBeNull();
		for (const sourceId of allSources)
			await sourceService.validateSource(database, sourceId);
		await transactionService.deleteTransaction(database, id);
		for (const sourceId of [newSource, newDestination]) {
			expect(
				(await sourceService.getSource(database, sourceId))
					?.validatedAt,
			).toBeNull();
		}
		expect(
			(await sourceService.getSource(database, "bank"))?.validatedAt,
		).not.toBeNull();
	});

	it("uses persisted rates consistently in summary and yearly trends", async () => {
		const { database } = await createFixture();
		const sourceId = await sourceService.createSource(
			database,
			"Dollar bank",
			"USD",
		);
		await financeRepository.upsertExchangeRateRow(database, {
			currencyCode: "USD",
			rateToInr: "83",
			source: "MANUAL",
			fetchedAt: null,
			updatedAt: 1,
		});
		for (const selectedSource of ["bank", sourceId]) {
			await transactionService.saveTransaction(database, {
				classification: "GENERAL",
				type: "CREDIT",
				sourceId: selectedSource,
				categoryId: "salary",
				amount: "100",
				reason: "Income",
				transactionAt: 100,
			});
		}
		const summary = await analysisService.getAnalysisSummary(database, {
			dateRange: { start: 0, end: 200 },
			isNativeCurrency: false,
		});
		const [point] = getTrendSeries(
			await transactionService.getTransactions(database),
			moneyUtils.getRateMap(
				await financeRepository.getExchangeRateRows(database),
			),
		);
		expect(summary.totalIncome).toBe("8400");
		expect(point?.income).toBe(summary.totalIncome);
	});

	it("returns empty analysis and trip totals without transactions", async () => {
		const { database } = await createFixture();
		expect(
			await analysisService.getAnalysisSummary(database, {
				dateRange: { start: 0, end: 200 },
				isNativeCurrency: false,
			}),
		).toMatchObject({
			categories: [],
			investments: [],
			totalIncome: "0",
			totalExpense: "0",
			netProfit: "0",
			missingCurrencies: [],
		});
		expect(await tripTotalService.getTripTotals(database)).toEqual([]);
	});

	it("preserves cents in large category, investment, trip, and source totals", async () => {
		const { database, sqlite } = await createFixture();
		sqlite.exec(
			"INSERT INTO trips (id, name) VALUES ('trip', 'Trip'); INSERT INTO investments (id, name) VALUES ('fund', 'Fund');",
		);
		await transactionService.saveTransaction(database, {
			...expense,
			tripId: "trip",
			items: [
				{ categoryId: "food", amount: "100000000000.01" },
				{ categoryId: "food", amount: "0.02" },
			],
		});
		expect(await sourceService.getSources(database)).toMatchObject([
			{ balance: "-100000000000.03" },
		]);
		await transactionService.saveTransaction(database, {
			classification: "INVESTMENT",
			type: "DEBIT",
			sourceId: "bank",
			investmentId: "fund",
			amount: "100000000000.01",
			reason: "Invested",
			transactionAt: 100,
		});
		await transactionService.saveTransaction(database, {
			classification: "INVESTMENT",
			type: "CREDIT",
			sourceId: "bank",
			investmentId: "fund",
			amount: "0.02",
			reason: "Redeemed",
			transactionAt: 100,
		});
		const summary = await analysisService.getAnalysisSummary(database, {
			dateRange: { start: 0, end: 200 },
			isNativeCurrency: true,
		});
		expect(summary.totalExpense).toBe("100000000000.03");
		expect(summary.investments).toMatchObject([{ net: "99999999999.99" }]);
		expect(await tripTotalService.getTripTotals(database)).toMatchObject([
			{ total: "100000000000.03" },
		]);
	});

	it("keeps credit category validation and reason defaults intact", async () => {
		const { database } = await createFixture();
		const income: TransactionInput = {
			classification: "GENERAL",
			type: "CREDIT",
			sourceId: "bank",
			categoryId: "salary",
			amount: "1",
			reason: "  ",
			transactionAt: 100,
		};
		const id = await transactionService.saveTransaction(database, income);
		expect(
			await transactionService.getTransaction(database, id),
		).toMatchObject({ reason: "Salary", items: [], amount: "1" });
		await expect(
			transactionService.saveTransaction(database, {
				...income,
				categoryId: "missing",
			}),
		).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
		await expect(
			transactionService.saveTransaction(database, {
				...income,
				categoryId: undefined,
			}),
		).rejects.toMatchObject({ code: "CATEGORY_REQUIRED" });
	});

	it("propagates lookup failures and rejects missing sources without foreign keys", async () => {
		const { database, sqlite } = await createFixture();
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				sourceId: "missing",
			}),
		).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND" });
		const lookup = vi
			.spyOn(database, "getFirstAsync")
			.mockRejectedValueOnce(new Error("lookup failed"));
		await expect(
			transactionService.saveTransaction(database, expense),
		).rejects.toThrow("lookup failed");
		lookup.mockRestore();
		expect(sqlite.prepare("SELECT * FROM transactions").all()).toEqual([]);
	});
	it("saves one payment and two items without double counting", async () => {
		const { sqlite, database } = await createFixture();
		const id = await transactionService.saveTransaction(database, expense);
		const saved = await transactionService.getTransaction(database, id);
		expect(saved).toMatchObject({
			id,
			amount: "200",
			reason: "Supermart shopping",
			categoryId: null,
		});
		expect(
			saved?.items.map((item) => [
				item.categoryName,
				item.amount,
				item.position,
			]),
		).toEqual([
			["Food", "100", 0],
			["Grocery", "100", 1],
		]);
		expect(new Set(saved?.items.map((item) => item.id)).size).toBe(2);
		expect(await sourceService.getSources(database)).toMatchObject([
			{ balance: "-200" },
		]);
		const analysis = await analysisService.getAnalysisSummary(database, {
			dateRange: { start: 0, end: 200 },
			isNativeCurrency: true,
		});
		expect(analysis.totalExpense).toBe("200");
		expect(
			analysis.categories.map((category) => [
				category.categoryId,
				category.debits,
			]),
		).toEqual([
			["food", "100"],
			["grocery", "100"],
		]);
		expect(
			(await transactionService.getTransactionPage(database))
				.transactions,
		).toHaveLength(1);
		expect(
			await transactionService.getLinkedTransactions(database, {
				kind: "CATEGORY",
				entityId: "grocery",
			}),
		).toHaveLength(1);
		expect(
			sqlite
				.prepare(
					"SELECT name FROM sqlite_master WHERE name = 'attachments'",
				)
				.all(),
		).toEqual([]);
	});

	it("keeps retained item IDs through reordering and deletes the payment and items together", async () => {
		const { sqlite, database } = await createFixture();
		const id = await transactionService.saveTransaction(database, expense);
		const saved = await transactionService.getTransaction(database, id);
		const items = saved?.items;
		if (!items) throw new Error("Missing saved items");
		await transactionService.saveTransaction(database, {
			...expense,
			id,
			items: [...items]
				.reverse()
				.map((item) => ({ ...item, amount: "50.05" })),
		});
		const updated = await transactionService.getTransaction(database, id);
		expect(updated?.amount).toBe("100.1");
		expect(updated?.items.map((item) => item.id)).toEqual(
			[...items].reverse().map((item) => item.id),
		);
		expect(updated?.items.map((item) => item.createdAt)).toEqual(
			[...items].reverse().map((item) => item.createdAt),
		);
		await transactionService.saveTransaction(database, {
			...expense,
			id,
			items: updated?.items.slice(0, 1),
		});
		expect(
			(await transactionService.getTransaction(database, id))?.items,
		).toHaveLength(1);
		await transactionService.deleteTransaction(database, id);
		expect(sqlite.prepare("SELECT * FROM transaction_items").all()).toEqual(
			[],
		);
		expect(await sourceService.getSources(database)).toMatchObject([
			{ balance: "0" },
		]);
	});

	it("rolls back new payments if an item write fails", async () => {
		const { sqlite, database } = await createFixture();
		sqlite.exec(
			"CREATE TRIGGER fail_item BEFORE INSERT ON transaction_items WHEN NEW.position = 1 BEGIN SELECT RAISE(ABORT, 'item failure'); END;",
		);
		await expect(
			transactionService.saveTransaction(database, expense),
		).rejects.toThrow("item failure");
		expect(sqlite.prepare("SELECT * FROM transactions").all()).toEqual([]);
		expect(sqlite.prepare("SELECT * FROM transaction_items").all()).toEqual(
			[],
		);
	});

	it("restores the original split and source validation when an edit fails", async () => {
		const { sqlite, database } = await createFixture();
		const id = await transactionService.saveTransaction(database, expense);
		const original = await transactionService.getTransaction(database, id);
		await sourceService.validateSource(database, "bank");
		const originalSources = await sourceService.getSources(database);
		sqlite.exec(
			"CREATE TRIGGER fail_item_edit BEFORE INSERT ON transaction_items BEGIN SELECT RAISE(ABORT, 'item failure'); END;",
		);
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				id,
				items: [{ categoryId: "food", amount: "1" }],
			}),
		).rejects.toThrow("item failure");
		expect(await transactionService.getTransaction(database, id)).toEqual(
			original,
		);
		expect(await sourceService.getSources(database)).toEqual(
			originalSources,
		);
	});

	it("validates all items and disallows stale or duplicated item identities", async () => {
		const { database } = await createFixture();
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				items: [],
			}),
		).rejects.toMatchObject({ code: "TRANSACTION_ITEMS_REQUIRED" });
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				items: undefined,
			}),
		).rejects.toMatchObject({ code: "TRANSACTION_ITEMS_REQUIRED" });
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				items: [
					{ categoryId: "food", amount: "100" },
					{ categoryId: "grocery", amount: "0" },
				],
			}),
		).rejects.toThrow("Item 2");
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				id: "missing",
			}),
		).rejects.toMatchObject({ code: "TRANSACTION_NOT_FOUND" });
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				items: [{ id: "foreign", categoryId: "food", amount: "1" }],
			}),
		).rejects.toMatchObject({ code: "TRANSACTION_ITEM_INVALID" });
		const id = await transactionService.saveTransaction(database, expense);
		const first = (await transactionService.getTransaction(database, id))
			?.items[0];
		if (!first) throw new Error("Missing item");
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				id,
				items: [first, first],
			}),
		).rejects.toMatchObject({ code: "TRANSACTION_ITEM_INVALID" });
		await expect(
			transactionService.saveTransaction(database, {
				...expense,
				type: "CREDIT",
			}),
		).rejects.toMatchObject({ code: "TRANSACTION_ITEMS_UNSUPPORTED" });
	});

	it("preserves decimal precision, allows repeated categories, and uses shared reason defaults", async () => {
		const { database } = await createFixture();
		const id = await transactionService.saveTransaction(database, {
			...expense,
			reason: "  ",
			items: [
				{ categoryId: "food", amount: "0.1" },
				{ categoryId: "grocery", amount: "0.2" },
				{ categoryId: "food", amount: "0.3" },
			],
		});
		expect(
			await transactionService.getTransaction(database, id),
		).toMatchObject({ amount: "0.6", reason: "Food, Grocery" });
		expect(
			(await financeRepository.getCategoryRows(database)).map(
				(category) => category.name,
			),
		).toEqual(["Food", "Grocery", "Salary"]);
		await transactionService.saveTransaction(database, {
			...expense,
			id,
			type: "CREDIT",
			categoryId: "salary",
			amount: "10",
			items: undefined,
		});
		expect(
			await transactionService.getTransaction(database, id),
		).toMatchObject({ amount: "10", categoryId: "salary", items: [] });
		expect(await sourceService.getSources(database)).toMatchObject([
			{ balance: "10" },
		]);
	});
});
