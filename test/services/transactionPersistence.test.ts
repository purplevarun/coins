import type TransactionInput from "@/types/TransactionInput";
import createTestDatabase from "@test/helpers/sqliteTestDatabase";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/id", () => ({ default: () => randomUUID() }));

import SCHEMA_MIGRATIONS from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import financeRepository from "@/repositories/financeRepository";
import analysisService from "@/services/analysisService";
import categoryService from "@/services/categoryService";
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
	it("keeps excluded payments linked and prevents deleting their required relations", async () => {
		const { database } = await createFixture();
		const id = await transactionService.saveTransaction(database, {
			...expense,
			isApplicable: false,
		});
		expect(
			await transactionService.getLinkedTransactions(database, {
				kind: "CATEGORY",
				entityId: "food",
			}),
		).toMatchObject([{ id, isApplicable: false }]);
		await expect(
			sourceService.deleteSource(database, "bank"),
		).rejects.toThrow("Source is referenced by transactions");
		await expect(
			categoryService.deleteCategory(database, "food"),
		).rejects.toThrow();
	});

	it("excludes every non-applicable payment mode from balances, analysis, trip totals, trends, dates, and missing rates", async () => {
		const { database, sqlite } = await createFixture();
		const tripId = randomUUID();
		const investmentId = randomUUID();
		sqlite
			.prepare("INSERT INTO trips (id, name) VALUES (?, 'Pending trip');")
			.run(tripId);
		sqlite
			.prepare(
				"INSERT INTO investments (id, name) VALUES (?, 'Pending fund');",
			)
			.run(investmentId);
		const foreignSourceId = await sourceService.createSource(
			database,
			"Foreign pending source",
			"USD",
		);
		const credit: TransactionInput = {
			classification: "GENERAL",
			type: "CREDIT",
			sourceId: "bank",
			amount: "100",
			categoryId: "salary",
			reason: "Applied income",
			transactionAt: 100,
		};
		await transactionService.saveTransaction(database, credit);
		await transactionService.saveTransaction(database, {
			...expense,
			items: [{ categoryId: "food", amount: "30" }],
		});
		const pending: readonly TransactionInput[] = [
			{ ...expense, tripId, transactionAt: 9000 },
			{ ...credit, amount: "600", tripId, transactionAt: 9000 },
			{
				...credit,
				sourceId: foreignSourceId,
				amount: "50",
				transactionAt: 9000,
			},
			{
				classification: "INVESTMENT",
				type: "DEBIT",
				sourceId: "bank",
				amount: "100",
				investmentId,
				reason: "Pending investment",
				transactionAt: 9000,
			},
			{
				classification: "INVESTMENT",
				type: "CREDIT",
				sourceId: "bank",
				amount: "20",
				investmentId,
				reason: "Pending redemption",
				transactionAt: 9000,
			},
			{
				classification: "GENERAL",
				type: "TRANSFER",
				sourceId: "bank",
				destinationSourceId: foreignSourceId,
				amount: "400",
				toAmount: "5",
				reason: "Pending transfer",
				transactionAt: 9000,
			},
		];
		for (const input of pending)
			await transactionService.saveTransaction(database, {
				...input,
				isApplicable: false,
			});
		const transactions = await transactionService.getTransactions(database);
		expect(transactions).toHaveLength(8);
		expect(
			transactions.filter(
				(transaction) => transaction.isApplicable === false,
			),
		).toHaveLength(6);
		expect(
			await financeRepository.getApplicableTransactionRows(database),
		).toHaveLength(2);
		expect(await sourceService.getSources(database)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: "bank", balance: "70" }),
				expect.objectContaining({ id: foreignSourceId, balance: "0" }),
			]),
		);
		expect(
			await financeRepository.getTransactionMinMaxDate(database),
		).toEqual({ minDate: 100, maxDate: 100 });
		expect(
			await financeRepository.getTransactionCurrencyRows(
				database,
				0,
				10000,
			),
		).toEqual([{ currencyCode: "INR" }]);
		expect(await tripTotalService.getTripTotals(database)).toEqual([]);
		const summary = await analysisService.getAnalysisSummary(database, {
			dateRange: { start: 0, end: 10000 },
			isNativeCurrency: false,
		});
		expect(summary).toMatchObject({
			totalIncome: "100",
			totalExpense: "30",
			netProfit: "70",
			investments: [],
			missingCurrencies: [],
		});
		expect(
			summary.categories.find(
				(category) => category.categoryId === "food",
			),
		).toMatchObject({ debits: "30" });
		expect(getTrendSeries(transactions)).toMatchObject([
			{ income: "100", expenses: "30", networth: "70" },
		]);
		await sourceService.setSourceArchived(database, "bank", true);
		expect(await sourceService.getArchivedSources(database)).toMatchObject([
			{ id: "bank", balance: "70" },
		]);
	});

	it("ignores excluded writes for source validation but invalidates both sides when applicability changes", async () => {
		const { database } = await createFixture();
		const destinationSourceId = await sourceService.createSource(
			database,
			"Pending destination",
			"INR",
		);
		const transfer: TransactionInput = {
			classification: "GENERAL",
			type: "TRANSFER",
			sourceId: "bank",
			destinationSourceId,
			amount: "15",
			reason: "Pending",
			transactionAt: 500,
			isApplicable: false,
		};
		for (const sourceId of ["bank", destinationSourceId])
			await sourceService.validateSource(database, sourceId);
		const id = await transactionService.saveTransaction(database, transfer);
		await transactionService.saveTransaction(database, {
			...transfer,
			id,
			amount: "20",
		});
		for (const sourceId of ["bank", destinationSourceId]) {
			expect(
				await sourceService.getSource(database, sourceId),
			).toMatchObject({
				validatedAt: expect.any(Number),
				latestTransactionCreatedAt: null,
			});
		}
		await transactionService.saveTransaction(database, {
			...transfer,
			id,
			isApplicable: true,
		});
		for (const sourceId of ["bank", destinationSourceId]) {
			expect(
				(await sourceService.getSource(database, sourceId))
					?.validatedAt,
			).toBeNull();
			await sourceService.validateSource(database, sourceId);
		}
		expect(await sourceService.getSources(database)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: "bank", balance: "-15" }),
				expect.objectContaining({
					id: destinationSourceId,
					balance: "15",
				}),
			]),
		);
		await transactionService.saveTransaction(database, { ...transfer, id });
		for (const sourceId of ["bank", destinationSourceId]) {
			expect(
				(await sourceService.getSource(database, sourceId))
					?.validatedAt,
			).toBeNull();
			await sourceService.validateSource(database, sourceId);
		}
		await transactionService.deleteTransaction(database, id);
		for (const sourceId of ["bank", destinationSourceId])
			expect(
				(await sourceService.getSource(database, sourceId))
					?.validatedAt,
			).not.toBeNull();
	});

	it.each([true, false])(
		"persists applicability %s while retaining transactions and split items in lists",
		async (isApplicable) => {
			const { database, sqlite } = await createFixture();
			const id = await transactionService.saveTransaction(database, {
				...expense,
				isApplicable,
			});
			expect(
				sqlite
					.prepare(
						"SELECT is_applicable FROM transactions WHERE id = ?;",
					)
					.get(id),
			).toEqual({ is_applicable: Number(isApplicable) });
			expect(
				await transactionService.getTransaction(database, id),
			).toMatchObject({
				id,
				isApplicable,
				items: [{ amount: "100" }, { amount: "100" }],
			});
			expect(
				await transactionService.getTransactions(database),
			).toMatchObject([{ id, isApplicable }]);
			expect(
				(await transactionService.getTransactionPage(database))
					.transactions,
			).toMatchObject([{ id, isApplicable }]);
		},
	);

	it("defaults new payments to applicable and preserves explicit exclusions when editing without a flag", async () => {
		const { database } = await createFixture();
		const id = await transactionService.saveTransaction(database, expense);
		expect(
			(await transactionService.getTransaction(database, id))
				?.isApplicable,
		).toBe(true);
		await transactionService.saveTransaction(database, {
			...expense,
			id,
			isApplicable: false,
		});
		await transactionService.saveTransaction(database, {
			...expense,
			id,
			reason: "Still pending",
		});
		expect(
			await transactionService.getTransaction(database, id),
		).toMatchObject({ isApplicable: false, reason: "Still pending" });
		await transactionService.saveTransaction(database, {
			...expense,
			id,
			isApplicable: true,
		});
		expect(
			(await transactionService.getTransaction(database, id))
				?.isApplicable,
		).toBe(true);
	});

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
		).toMatchObject({
			reason: "Salary",
			items: [expect.objectContaining({ categoryId: "salary" })],
			amount: "1",
		});
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
			categoryId: "food",
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
		).rejects.toMatchObject({ code: "INVALID_AMOUNT" });
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
				type: "TRANSFER",
			}),
		).rejects.toMatchObject({ code: "DESTINATION_REQUIRED" });
	});

	it("saves a multi-item credit with a null parent category", async () => {
		const { database } = await createFixture();
		const id = await transactionService.saveTransaction(database, {
			...expense,
			type: "CREDIT",
		});
		const saved = await transactionService.getTransaction(database, id);
		expect(saved?.type).toBe("CREDIT");
		expect(saved?.categoryId).toBe("food");
		expect(saved?.amount).toBe("200");
		expect(saved?.items.map((item) => item.categoryId)).toEqual([
			"food",
			"grocery",
		]);
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
		).toMatchObject({
			amount: "10",
			categoryId: "salary",
			items: [expect.objectContaining({ categoryId: "salary" })],
		});
		expect(await sourceService.getSources(database)).toMatchObject([
			{ balance: "10" },
		]);
	});
});
