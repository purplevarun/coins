import createTestDatabase from "@test/helpers/sqliteTestDatabase";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/id", () => ({ default: () => randomUUID() }));

import SCHEMA_MIGRATIONS from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import analysisService from "@/services/analysisService";
import categoryService from "@/services/categoryService";
import relationConversionService from "@/services/relationConversionService";
import sourceService from "@/services/sourceService";

const { convertCategoryToInvestment, convertInvestmentToCategory } =
	relationConversionService;

const createFixture = async (): Promise<
	ReturnType<typeof createTestDatabase>
> => {
	const result = createTestDatabase();
	await result.database.execAsync(SCHEMA_SQL);
	for (const migration of SCHEMA_MIGRATIONS) {
		await result.database.execAsync(migration);
	}
	result.sqlite.exec(`
		INSERT INTO sources (id, name, currency_code, validated_at, created_at, updated_at)
			VALUES ('bank', 'Bank', 'INR', 50, 1, 2);
		INSERT INTO categories (id, name, kind, created_at, updated_at) VALUES
			('pf', 'Employee PF', 'EXPENSE', 1, 2),
			('food', 'Food', 'EXPENSE', 1, 2),
			('grocery', 'Grocery', 'EXPENSE', 1, 2),
			('salary', 'Salary', 'INCOME', 1, 2);
		INSERT INTO investments (id, name, created_at, updated_at) VALUES
			('existing', 'Existing EPF', 1, 2),
			('nps', 'NPS', 1, 2);
		INSERT INTO transactions (id, classification, type, source_id, amount, category_id, trip_id, investment_id, reason, transaction_at, created_at, updated_at) VALUES
			('pf-credit', 'GENERAL', 'CREDIT', 'bank', '100', 'pf', 'trip', NULL, '', 10, 1, 1),
			('pf-debit', 'GENERAL', 'DEBIT', 'bank', '200', NULL, 'trip', NULL, 'PF deduction', 20, 1, 1),
			('mixed', 'GENERAL', 'DEBIT', 'bank', '300', NULL, 'trip', NULL, 'Payroll', 30, 1, 1),
			('grocery-refund', 'GENERAL', 'CREDIT', 'bank', '15', 'grocery', NULL, NULL, 'Refund', 40, 1, 1),
			('grocery-item', 'GENERAL', 'DEBIT', 'bank', '25', NULL, NULL, NULL, 'Mart', 50, 1, 1),
			('nps-buy', 'INVESTMENT', 'DEBIT', 'bank', '500', NULL, NULL, 'nps', 'NPS buy', 60, 1, 1),
			('nps-sell', 'INVESTMENT', 'CREDIT', 'bank', '200', NULL, NULL, 'nps', 'NPS sell', 70, 1, 1);
		INSERT INTO transaction_items (id, transaction_id, category_id, amount, position, created_at, updated_at) VALUES
			('pf-debit-item', 'pf-debit', 'pf', '200', 0, 1, 1),
			('mixed-pf', 'mixed', 'pf', '120.50', 0, 1, 1),
			('mixed-food', 'mixed', 'food', '179.50', 1, 1, 1),
			('grocery-line', 'grocery-item', 'grocery', '25', 0, 1, 1);
		INSERT INTO budgets (id, category_id, amount, period, created_at, updated_at) VALUES
			('pf-budget', 'pf', '1000', 'MONTHLY', 1, 1),
			('food-monthly', 'food', '500', 'MONTHLY', 1, 1),
			('grocery-monthly', 'grocery', '300', 'MONTHLY', 1, 1),
			('grocery-yearly', 'grocery', '3000', 'YEARLY', 1, 1);
	`);
	return result;
};

const transactionRow = (
	sqlite: ReturnType<typeof createTestDatabase>["sqlite"],
	id: string,
): Record<string, unknown> | undefined =>
	sqlite
		.prepare(
			"SELECT classification, type, amount, category_id, trip_id, investment_id, reason FROM transactions WHERE id = ?",
		)
		.get(id);

const itemCategories = (
	sqlite: ReturnType<typeof createTestDatabase>["sqlite"],
	transactionId: string,
): unknown[] =>
	sqlite
		.prepare(
			"SELECT category_id, amount FROM transaction_items WHERE transaction_id = ? ORDER BY position",
		)
		.all(transactionId);

const balanceAndValidation = async (
	database: ReturnType<typeof createTestDatabase>["database"],
): Promise<unknown> =>
	(await sourceService.getSources(database)).map((source) => ({
		balance: source.balance,
		validatedAt: source.validatedAt,
	}));

describe("relation conversion persistence", () => {
	it("preserves exclusions when splitting and round-tripping category history", async () => {
		const { database, sqlite } = await createFixture();
		sqlite.exec(
			"UPDATE transactions SET is_applicable = 0 WHERE id IN ('pf-credit', 'pf-debit', 'mixed');",
		);
		const before = await balanceAndValidation(database);
		const investmentId = await convertCategoryToInvestment(database, "pf", {
			id: null,
			name: "Pending fund",
			investmentTypeId: null,
			platformId: null,
		});
		const converted = sqlite
			.prepare(
				"SELECT is_applicable FROM transactions WHERE investment_id = ?;",
			)
			.all(investmentId);
		expect(converted).toHaveLength(3);
		expect(converted.every((row) => row.is_applicable === 0)).toBe(true);
		expect(
			sqlite
				.prepare(
					"SELECT is_applicable FROM transactions WHERE id = 'mixed';",
				)
				.get(),
		).toEqual({ is_applicable: 0 });
		expect(await balanceAndValidation(database)).toEqual(before);
		await convertInvestmentToCategory(database, investmentId, {
			id: "food",
			name: "Food",
			kind: "EXPENSE",
		});
		expect(
			sqlite
				.prepare(
					"SELECT COUNT(*) AS count FROM transactions WHERE is_applicable = 0;",
				)
				.get(),
		).toEqual({ count: 4 });
		expect(await balanceAndValidation(database)).toEqual(before);
	});

	it("converts a category to a new investment without changing balances", async () => {
		const { database, sqlite } = await createFixture();
		const before = await balanceAndValidation(database);

		const investmentId = await convertCategoryToInvestment(database, "pf", {
			id: null,
			name: "EPF",
			investmentTypeId: null,
			platformId: null,
		});

		expect(
			sqlite
				.prepare("SELECT name FROM investments WHERE id = ?")
				.get(investmentId),
		).toEqual({ name: "EPF" });
		expect(transactionRow(sqlite, "pf-credit")).toEqual({
			classification: "INVESTMENT",
			type: "CREDIT",
			amount: "100",
			category_id: null,
			trip_id: null,
			investment_id: investmentId,
			reason: "Employee PF",
		});
		expect(transactionRow(sqlite, "pf-debit")).toMatchObject({
			classification: "INVESTMENT",
			type: "DEBIT",
			amount: "200",
			investment_id: investmentId,
			reason: "PF deduction",
		});
		expect(itemCategories(sqlite, "pf-debit")).toEqual([]);
		expect(transactionRow(sqlite, "mixed")).toMatchObject({
			classification: "GENERAL",
			amount: "179.5",
			trip_id: "trip",
			investment_id: null,
		});
		expect(itemCategories(sqlite, "mixed")).toEqual([
			{ category_id: "food", amount: "179.50" },
		]);
		expect(
			sqlite
				.prepare(
					"SELECT type, amount, reason, transaction_at FROM transactions WHERE investment_id = ? AND id NOT IN ('pf-credit', 'pf-debit')",
				)
				.all(investmentId),
		).toEqual([
			{
				type: "DEBIT",
				amount: "120.5",
				reason: "Payroll",
				transaction_at: 30,
			},
		]);
		expect(
			sqlite
				.prepare("SELECT id FROM budgets WHERE category_id = 'pf'")
				.all(),
		).toEqual([]);
		expect(
			sqlite.prepare("SELECT id FROM categories WHERE id = 'pf'").get(),
		).toBeUndefined();
		expect(await balanceAndValidation(database)).toEqual(before);
		const summary = await analysisService.getAnalysisSummary(database, {
			dateRange: { start: 0, end: 100 },
			isNativeCurrency: true,
		});
		expect(
			summary.investments.find(
				(investment) => investment.investmentId === investmentId,
			),
		).toMatchObject({
			totalInvested: "320.5",
			totalRedeemed: "100",
			net: "220.5",
		});
	});

	it("splits a mixed expense without a trip", async () => {
		const { database, sqlite } = await createFixture();
		sqlite.exec(`
			INSERT INTO transactions (id, classification, type, source_id, amount, reason, transaction_at, created_at, updated_at)
				VALUES ('untagged', 'GENERAL', 'DEBIT', 'bank', '50', 'Untagged', 80, 1, 1);
			INSERT INTO transaction_items (id, transaction_id, category_id, amount, position, created_at, updated_at) VALUES
				('untagged-pf', 'untagged', 'pf', '10', 0, 1, 1),
				('untagged-food', 'untagged', 'food', '40', 1, 1, 1);
		`);
		await convertCategoryToInvestment(database, "pf", {
			id: "existing",
			name: "ignored",
			investmentTypeId: null,
			platformId: null,
		});
		expect(transactionRow(sqlite, "untagged")).toMatchObject({
			amount: "40",
			trip_id: null,
		});
	});

	it("converts into an existing investment and round-trips back to a category", async () => {
		const { database, sqlite } = await createFixture();
		const before = await balanceAndValidation(database);
		await expect(
			convertCategoryToInvestment(database, "pf", {
				id: "existing",
				name: "ignored",
				investmentTypeId: null,
				platformId: null,
			}),
		).resolves.toBe("existing");
		const categoryId = await convertInvestmentToCategory(
			database,
			"existing",
			{ id: null, name: "Employee PF", kind: "EXPENSE" },
		);
		expect(
			sqlite
				.prepare(
					"SELECT COUNT(*) AS count FROM transactions WHERE investment_id = 'existing'",
				)
				.get(),
		).toEqual({ count: 0 });
		expect(
			sqlite
				.prepare("SELECT kind FROM categories WHERE id = ?")
				.get(categoryId),
		).toEqual({ kind: "EXPENSE" });
		expect(transactionRow(sqlite, "pf-credit")).toMatchObject({
			classification: "GENERAL",
			category_id: categoryId,
		});
		expect(await balanceAndValidation(database)).toEqual(before);
	});

	it("converts an investment to existing and new categories", async () => {
		const { database, sqlite } = await createFixture();
		const before = await balanceAndValidation(database);
		await expect(
			convertInvestmentToCategory(database, "nps", {
				id: "food",
				name: "ignored",
				kind: "INCOME",
			}),
		).resolves.toBe("food");
		expect(transactionRow(sqlite, "nps-buy")).toEqual({
			classification: "GENERAL",
			type: "DEBIT",
			amount: "500",
			category_id: null,
			trip_id: null,
			investment_id: null,
			reason: "NPS buy",
		});
		expect(itemCategories(sqlite, "nps-buy")).toEqual([
			{ category_id: "food", amount: "500" },
		]);
		expect(transactionRow(sqlite, "nps-sell")).toMatchObject({
			classification: "GENERAL",
			type: "CREDIT",
			category_id: "food",
			investment_id: null,
		});
		expect(
			sqlite.prepare("SELECT id FROM investments WHERE id = 'nps'").get(),
		).toBeUndefined();
		expect(await balanceAndValidation(database)).toEqual(before);
		await expect(
			convertInvestmentToCategory(database, "existing", {
				id: null,
				name: "Unused savings",
				kind: "INCOME",
			}),
		).resolves.toEqual(expect.any(String));
	});

	it.each([
		[
			"missing category",
			() => ({
				categoryId: "missing",
				target: {
					id: null,
					name: "Rolled",
					investmentTypeId: null,
					platformId: null,
				},
			}),
			"CATEGORY_NOT_FOUND",
		],
		[
			"missing investment",
			() => ({
				categoryId: "pf",
				target: {
					id: "missing",
					name: "Rolled",
					investmentTypeId: null,
					platformId: null,
				},
			}),
			"INVESTMENT_NOT_FOUND",
		],
		[
			"duplicate investment name",
			() => ({
				categoryId: "pf",
				target: {
					id: null,
					name: "nps",
					investmentTypeId: null,
					platformId: null,
				},
			}),
			"INVESTMENT_NAME_DUPLICATE",
		],
	] as const)(
		"rejects category conversion with %s",
		async (_name, input, code) => {
			const { database, sqlite } = await createFixture();
			const { categoryId, target } = input();
			await expect(
				convertCategoryToInvestment(database, categoryId, target),
			).rejects.toMatchObject({ code });
			expect(transactionRow(sqlite, "pf-credit")).toMatchObject({
				category_id: "pf",
			});
		},
	);

	it("rolls back a created target when a linked transaction is orphaned", async () => {
		const { database, sqlite } = await createFixture();
		sqlite.exec(`
			INSERT INTO transactions (id, classification, type, source_id, amount, category_id, investment_id, reason, transaction_at, created_at, updated_at) VALUES
				('orphan-category', 'GENERAL', 'CREDIT', 'deleted-source', '1', 'pf', NULL, 'Orphan', 1, 1, 1),
				('orphan-investment', 'INVESTMENT', 'CREDIT', 'deleted-source', '1', NULL, 'nps', 'Orphan', 1, 1, 1);
		`);
		await expect(
			convertCategoryToInvestment(database, "pf", {
				id: null,
				name: "Rolled",
				investmentTypeId: null,
				platformId: null,
			}),
		).rejects.toMatchObject({ code: "TRANSACTION_NOT_FOUND" });
		await expect(
			convertInvestmentToCategory(database, "nps", {
				id: null,
				name: "Rolled category",
				kind: "EXPENSE",
			}),
		).rejects.toMatchObject({ code: "TRANSACTION_NOT_FOUND" });
		expect(
			sqlite
				.prepare(
					"SELECT COUNT(*) AS count FROM investments WHERE name = 'Rolled'",
				)
				.get(),
		).toEqual({ count: 0 });
		expect(
			sqlite
				.prepare(
					"SELECT COUNT(*) AS count FROM categories WHERE name = 'Rolled category'",
				)
				.get(),
		).toEqual({ count: 0 });
		expect(transactionRow(sqlite, "pf-credit")).toMatchObject({
			category_id: "pf",
		});
	});

	it.each([
		["missing investment", "missing", { id: null }, "INVESTMENT_NOT_FOUND"],
		["missing category", "nps", { id: "missing" }, "CATEGORY_NOT_FOUND"],
		[
			"blank category name",
			"nps",
			{ id: null, name: " " },
			"CATEGORY_NAME_REQUIRED",
		],
	] as const)(
		"rejects investment conversion with %s",
		async (_name, investmentId, target, code) => {
			const { database, sqlite } = await createFixture();
			await expect(
				convertInvestmentToCategory(database, investmentId, {
					name: "Retirement",
					kind: "EXPENSE",
					...target,
				}),
			).rejects.toMatchObject({ code });
			expect(transactionRow(sqlite, "nps-buy")).toMatchObject({
				investment_id: "nps",
			});
		},
	);
});

describe("category merge persistence", () => {
	it("keeps merged excluded payments excluded", async () => {
		const { database, sqlite } = await createFixture();
		sqlite.exec(
			"UPDATE transactions SET is_applicable = 0 WHERE id IN ('grocery-refund', 'grocery-item');",
		);
		const before = await balanceAndValidation(database);
		await categoryService.mergeCategories(database, "grocery", "food");
		expect(
			sqlite
				.prepare(
					"SELECT COUNT(*) AS count FROM transactions WHERE id IN ('grocery-refund', 'grocery-item') AND is_applicable = 0;",
				)
				.get(),
		).toEqual({ count: 2 });
		expect(itemCategories(sqlite, "grocery-item")).toEqual([
			{ category_id: "food", amount: "25" },
		]);
		expect(await balanceAndValidation(database)).toEqual(before);
	});

	it("moves transactions, items and non-conflicting budgets", async () => {
		const { database, sqlite } = await createFixture();
		const before = await balanceAndValidation(database);
		await categoryService.mergeCategories(database, "grocery", "food");
		expect(transactionRow(sqlite, "grocery-refund")).toMatchObject({
			category_id: "food",
		});
		expect(itemCategories(sqlite, "grocery-item")).toEqual([
			{ category_id: "food", amount: "25" },
		]);
		expect(
			sqlite
				.prepare(
					"SELECT id, category_id, period FROM budgets WHERE id LIKE 'grocery%' OR id = 'food-monthly' ORDER BY id",
				)
				.all(),
		).toEqual([
			{ id: "food-monthly", category_id: "food", period: "MONTHLY" },
			{ id: "grocery-yearly", category_id: "food", period: "YEARLY" },
		]);
		expect(
			sqlite
				.prepare("SELECT id FROM categories WHERE id = 'grocery'")
				.get(),
		).toBeUndefined();
		expect(await balanceAndValidation(database)).toEqual(before);
	});

	it.each([
		["", "CATEGORY_REQUIRED"],
		["grocery", "CATEGORY_MERGE_SAME"],
		["missing", "CATEGORY_NOT_FOUND"],
		["salary", "CATEGORY_KIND_MISMATCH"],
	])("rejects merging into %j", async (targetId, code) => {
		const { database, sqlite } = await createFixture();
		await expect(
			categoryService.mergeCategories(database, "grocery", targetId),
		).rejects.toMatchObject({ code });
		expect(transactionRow(sqlite, "grocery-refund")).toMatchObject({
			category_id: "grocery",
		});
	});

	it("requires the category being merged", async () => {
		const { database } = await createFixture();
		await expect(
			categoryService.mergeCategories(database, "", "food"),
		).rejects.toMatchObject({ code: "CATEGORY_REQUIRED" });
	});
});
