import type Transaction from "@/types/Transaction";
import type TransactionCursor from "@/types/TransactionCursor";
import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import type { SQLiteDatabase } from "expo-sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	return {
		createTransactionRow: vi
			.fn<TestAsyncFunction>()
			.mockResolvedValue(undefined),
		createTransactionItemRow: vi
			.fn<TestAsyncFunction>()
			.mockResolvedValue(undefined),
		deleteTransactionItemRows: vi
			.fn<TestAsyncFunction>()
			.mockResolvedValue(undefined),
		deleteTransactionRow: vi
			.fn<TestAsyncFunction>()
			.mockResolvedValue(undefined),
		getCategoryRow: vi.fn<TestAsyncFunction>().mockResolvedValue(null),
		getInvestmentRow: vi.fn<TestAsyncFunction>(),
		getSourceRow: vi.fn<TestAsyncFunction>().mockResolvedValue(null),
		getTransactionPageRows: vi
			.fn<
				(
					database: SQLiteDatabase,
					limit: number,
					cursor?: TransactionCursor,
				) => Promise<readonly Transaction[]>
			>()
			.mockResolvedValue([]),
		getTransactionRow: vi.fn<TestAsyncFunction>().mockResolvedValue(null),
		getTransactionRows: vi.fn<TestAsyncFunction>().mockResolvedValue([]),
		invalidateTransactionSources: vi
			.fn<TestAsyncFunction>()
			.mockResolvedValue(undefined),
		updateTransactionRow: vi
			.fn<TestAsyncFunction>()
			.mockResolvedValue(undefined),
		createId: vi.fn(() => "new-transaction-id"),
	};
});

vi.mock("@/repositories/financeRepository", () => ({
	default: {
		createTransactionRow: mocks.createTransactionRow,
		createTransactionItemRow: mocks.createTransactionItemRow,
		deleteTransactionItemRows: mocks.deleteTransactionItemRows,
		deleteTransactionRow: mocks.deleteTransactionRow,
		getCategoryRow: mocks.getCategoryRow,
		getInvestmentRow: mocks.getInvestmentRow,
		getSourceRow: mocks.getSourceRow,
		getTransactionPageRows: mocks.getTransactionPageRows,
		getTransactionRow: mocks.getTransactionRow,
		getTransactionRows: mocks.getTransactionRows,
		invalidateTransactionSources: mocks.invalidateTransactionSources,
		updateTransactionRow: mocks.updateTransactionRow,
	},
}));

vi.mock("@/utils/id", () => ({
	default: mocks.createId,
}));

import transactionService from "@/services/transactionService";

const database = {
	withTransactionAsync: async (callback: () => Promise<void>) => callback(),
} as unknown as SQLiteDatabase;

describe("transactionService", () => {
	beforeEach(() => {
		mocks.getSourceRow.mockResolvedValue({
			id: "source",
			currencyCode: "INR",
		});
		mocks.getInvestmentRow.mockResolvedValue({
			id: "inv1",
			name: " Nifty Fund ",
		});
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-25T12:00:00.000Z"));
		Object.values(mocks).forEach((mockFn) => {
			if (typeof mockFn === "function" && "mockClear" in mockFn) {
				mockFn.mockClear();
			}
		});
	});

	it("queries only the requested day without paging metadata", async () => {
		mocks.getTransactionRows.mockResolvedValueOnce([]);

		expect(
			await transactionService.getTransactions(database, {
				start: 100,
				end: 200,
			}),
		).toEqual([]);
		expect(mocks.getTransactionRows).toHaveBeenCalledWith(
			database,
			100,
			200,
		);
		expect(mocks.getTransactionPageRows).not.toHaveBeenCalled();
	});

	it.each([0, 1, 9, 10, 11])(
		"returns at most ten transactions from %i rows and checks for another page",
		async (count) => {
			const rows: readonly Transaction[] = Array.from(
				{ length: count },
				(_, index) => ({
					id: `00000000-0000-4000-8000-${String(11 - index).padStart(12, "0")}`,
					classification: "GENERAL",
					type: "DEBIT",
					sourceId: "00000000-0000-4000-8000-000000000100",
					destinationSourceId: null,
					amount: "10",
					toAmount: null,
					categoryId: "00000000-0000-4000-8000-000000000101",
					tripId: null,
					investmentId: null,
					reason: "Expense",
					transactionAt: new Date(2020 + index, 0, 1).getTime(),
					createdAt: 100,
					updatedAt: 100,
					sourceName: "Cash",
					sourceCurrencyCode: "INR",
					destinationSourceName: null,
					destinationCurrencyCode: null,
					categoryName: "Food",
					tripName: null,
					investmentName: null,
					items: [],
				}),
			);
			mocks.getTransactionPageRows.mockResolvedValueOnce(rows);

			expect(
				await transactionService.getTransactionPage(database),
			).toEqual({ transactions: rows.slice(0, 10), hasMore: count > 10 });
			expect(
				mocks.getTransactionPageRows,
			).toHaveBeenCalledExactlyOnceWith(
				database,
				11,
				undefined,
				undefined,
			);
			expect(mocks.getTransactionRows).not.toHaveBeenCalled();
		},
	);

	it("forwards the cursor and classification when fetching the next ten", async () => {
		const cursor = {
			transactionAt: 0,
			createdAt: 0,
			id: "00000000-0000-4000-8000-000000000010",
		};
		mocks.getTransactionPageRows.mockResolvedValueOnce([]);

		expect(
			await transactionService.getTransactionPage(
				database,
				cursor,
				"INVESTMENT",
			),
		).toEqual({ transactions: [], hasMore: false });
		expect(mocks.getTransactionPageRows).toHaveBeenCalledExactlyOnceWith(
			database,
			11,
			cursor,
			"INVESTMENT",
		);
	});

	it("propagates a failed page query", async () => {
		mocks.getTransactionPageRows.mockRejectedValueOnce(
			new Error("page failed"),
		);

		await expect(
			transactionService.getTransactionPage(database),
		).rejects.toThrow("page failed");
	});

	it("returns transaction records and handles a missing transaction", async () => {
		mocks.getTransactionRows.mockResolvedValueOnce([
			{
				id: "t1",
				sourceId: "s1",
				destinationSourceId: null,
				categoryId: null,
				tripId: null,
				investmentId: null,
				classification: "GENERAL",
				type: "DEBIT",
				amount: "10",
				toAmount: null,
				reason: "x",
				createdAt: 1,
				updatedAt: 1,
				transactionAt: 1,
				sourceName: "A",
				sourceCurrencyCode: "INR",
				destinationSourceName: null,
				destinationCurrencyCode: null,
				categoryName: null,
				tripName: null,
				investmentName: null,
			},
		]);
		mocks.getTransactionRow.mockResolvedValueOnce({
			id: "t2",
			sourceId: "s1",
			destinationSourceId: null,
			categoryId: null,
			tripId: null,
			investmentId: null,
			classification: "GENERAL",
			type: "DEBIT",
			amount: "10",
			toAmount: null,
			reason: "x",
			createdAt: 1,
			updatedAt: 1,
			transactionAt: 1,
			sourceName: "A",
			sourceCurrencyCode: "INR",
			destinationSourceName: null,
			destinationCurrencyCode: null,
			categoryName: null,
			tripName: null,
			investmentName: null,
		});

		const list = await transactionService.getTransactions(database);
		expect(list).toEqual(
			await mocks.getTransactionRows.mock.results[0]?.value,
		);

		const one = await transactionService.getTransaction(database, "t2");
		expect(one).toEqual(
			await mocks.getTransactionRow.mock.results[0]?.value,
		);
		expect(
			await transactionService.getTransaction(database, "missing"),
		).toBeNull();
	});

	it("filters linked transactions by kind", async () => {
		mocks.getTransactionRows.mockResolvedValue([
			{
				id: "a",
				sourceId: "s1",
				destinationSourceId: "s2",
				categoryId: "c1",
				tripId: "tr1",
				investmentId: "i1",
				items: [],
			},
			{
				id: "b",
				sourceId: "s3",
				destinationSourceId: null,
				categoryId: "c2",
				tripId: "tr2",
				investmentId: "i2",
				items: [],
			},
		]);

		expect(
			(
				await transactionService.getLinkedTransactions(database, {
					kind: "SOURCE",
					entityId: "s2",
				})
			).map((transaction) => transaction.id),
		).toEqual(["a"]);
		expect(
			(
				await transactionService.getLinkedTransactions(database, {
					kind: "CATEGORY",
					entityId: "c2",
				})
			).map((transaction) => transaction.id),
		).toEqual(["b"]);
		expect(
			(
				await transactionService.getLinkedTransactions(database, {
					kind: "TRIP",
					entityId: "tr1",
				})
			).map((transaction) => transaction.id),
		).toEqual(["a"]);
		expect(
			(
				await transactionService.getLinkedTransactions(database, {
					kind: "INVESTMENT",
					entityId: "i2",
				})
			).map((transaction) => transaction.id),
		).toEqual(["b"]);
	});

	it("links transactions through investment items", async () => {
		mocks.getTransactionRows.mockResolvedValue([
			{
				id: "a",
				sourceId: "s1",
				destinationSourceId: null,
				categoryId: null,
				tripId: null,
				investmentId: null,
				items: [
					{
						investmentId: "i1",
						amount: "10",
					},
				],
			},
		]);

		expect(
			(
				await transactionService.getLinkedTransactions(database, {
					kind: "INVESTMENT",
					entityId: "i1",
				})
			).map((transaction) => transaction.id),
		).toEqual(["a"]);
		expect(
			await transactionService.getLinkedTransactions(database, {
				kind: "INVESTMENT",
				entityId: "i2",
			}),
		).toEqual([]);
	});

	it("links transactions through item sources and destinations", async () => {
		mocks.getTransactionRows.mockResolvedValue([
			{
				id: "a",
				sourceId: "s1",
				destinationSourceId: null,
				categoryId: null,
				tripId: null,
				investmentId: null,
				items: [{ sourceId: "s9", amount: "10" }],
			},
			{
				id: "b",
				sourceId: "s1",
				destinationSourceId: null,
				categoryId: null,
				tripId: null,
				investmentId: null,
				items: [
					{
						sourceId: "s5",
						destinationSourceId: "s9",
						amount: "10",
					},
				],
			},
		]);
		expect(
			(
				await transactionService.getLinkedTransactions(database, {
					kind: "SOURCE",
					entityId: "s9",
				})
			).map((transaction) => transaction.id),
		).toEqual(["a", "b"]);
		expect(
			(
				await transactionService.getLinkedTransactions(database, {
					kind: "SOURCE",
					entityId: "s2",
				})
			).map((transaction) => transaction.id),
		).toEqual([]);
	});

	it("requires sourceId in saveTransaction", async () => {
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "GENERAL",
				type: "DEBIT",
				sourceId: "",
				amount: "10",
				reason: "ok",
			}),
		).rejects.toMatchObject({ code: "SOURCE_REQUIRED" });
	});

	it("requires a source on each item", async () => {
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "GENERAL",
				type: "DEBIT",
				sourceId: "s1",
				amount: "10",
				reason: "ok",
				items: [{ categoryId: "c1", amount: "10", sourceId: "" }],
			}),
		).rejects.toMatchObject({ code: "SOURCE_REQUIRED" });
	});

	it("rejects investment items with a missing source", async () => {
		mocks.getInvestmentRow.mockResolvedValueOnce({ id: "i1" });
		mocks.getSourceRow.mockResolvedValueOnce(null);
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "INVESTMENT",
				type: "DEBIT",
				sourceId: "gone",
				investmentId: "i1",
				amount: "10",
				reason: "ok",
			}),
		).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND" });
	});

	it("validates the investment marker on transfer items", async () => {
		mocks.getInvestmentRow.mockResolvedValueOnce(null);
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "GENERAL",
				type: "TRANSFER",
				sourceId: "s1",
				destinationSourceId: "s2",
				investmentId: "gone",
				amount: "10",
				reason: "ok",
			}),
		).rejects.toMatchObject({ code: "INVESTMENT_NOT_FOUND" });

		await transactionService.saveTransaction(database, {
			transactionAt: 1,
			classification: "GENERAL",
			type: "TRANSFER",
			sourceId: "s1",
			destinationSourceId: "s2",
			investmentId: "i1",
			amount: "10",
			reason: "ok",
		});
		expect(mocks.createTransactionItemRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({ investmentId: "i1" }),
		);
	});

	it("validates non-transfer categories", async () => {
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "GENERAL",
				type: "DEBIT",
				sourceId: "s1",
				amount: "10",
				reason: "ok",
				items: [{ categoryId: "", amount: "10" }],
			}),
		).rejects.toMatchObject({ code: "CATEGORY_REQUIRED" });
	});

	it("defaults a blank non-transfer reason to the category name", async () => {
		mocks.getCategoryRow.mockResolvedValueOnce({
			id: "c1",
			name: "Groceries",
			isIncome: false,
			createdAt: 1,
			updatedAt: 1,
			archived: false,
		});

		const id = await transactionService.saveTransaction(database, {
			classification: "GENERAL",
			type: "DEBIT",
			sourceId: "s1",
			categoryId: "c1",
			amount: "10",
			reason: "   ",
			transactionAt: 1,
			items: [{ categoryId: "c1", amount: "10" }],
		});

		expect(id).toBe("new-transaction-id");
		expect(mocks.getCategoryRow).toHaveBeenCalledWith(database, "c1");
		expect(mocks.createTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				reason: "Groceries",
			}),
			"new-transaction-id",
			expect.any(Number),
		);
	});

	it("rejects a trip when an expense item category is trip agnostic", async () => {
		mocks.getCategoryRow.mockResolvedValueOnce({
			id: "c1",
			name: "Fuel",
			tripAgnostic: 1,
		});

		await expect(
			transactionService.saveTransaction(database, {
				classification: "GENERAL",
				type: "DEBIT",
				sourceId: "s1",
				tripId: "tr1",
				amount: "10",
				reason: "ok",
				transactionAt: 1,
				items: [{ categoryId: "c1", amount: "10" }],
			}),
		).rejects.toMatchObject({
			code: "TRIP_AGNOSTIC_CATEGORY",
			message:
				'Item 1: "Fuel" is trip agnostic. Remove the trip or pick another category.',
		});
		expect(mocks.createTransactionRow).not.toHaveBeenCalled();
	});

	it("saves a trip-agnostic expense when no trip is selected", async () => {
		mocks.getCategoryRow.mockResolvedValueOnce({
			id: "c1",
			name: "Fuel",
			tripAgnostic: 1,
		});

		await transactionService.saveTransaction(database, {
			classification: "GENERAL",
			type: "DEBIT",
			sourceId: "s1",
			amount: "10",
			reason: "ok",
			transactionAt: 1,
			items: [{ categoryId: "c1", amount: "10" }],
		});
		const savedInput = mocks.createTransactionRow.mock.calls[0]?.[1] as {
			tripId?: string;
		};
		expect(savedInput.tripId).toBeUndefined();
	});

	it("rejects a trip when the credit category is trip agnostic", async () => {
		mocks.getCategoryRow.mockResolvedValueOnce({
			id: "c1",
			name: "Refund",
			tripAgnostic: 1,
		});

		await expect(
			transactionService.saveTransaction(database, {
				classification: "GENERAL",
				type: "CREDIT",
				sourceId: "s1",
				categoryId: "c1",
				tripId: "tr1",
				amount: "10",
				reason: "ok",
				transactionAt: 1,
			}),
		).rejects.toMatchObject({ code: "TRIP_AGNOSTIC_CATEGORY" });
	});

	it("keeps the trip when the credit category is not trip agnostic", async () => {
		mocks.getCategoryRow.mockResolvedValueOnce({
			id: "c1",
			name: "Salary",
			tripAgnostic: 0,
		});

		await transactionService.saveTransaction(database, {
			classification: "GENERAL",
			type: "CREDIT",
			sourceId: "s1",
			categoryId: "c1",
			tripId: "tr1",
			amount: "10",
			reason: "ok",
			transactionAt: 1,
		});
		expect(mocks.createTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({ tripId: "tr1" }),
			"new-transaction-id",
			expect.any(Number),
		);
	});

	it("fails when a blank non-transfer reason has no matching category", async () => {
		mocks.getCategoryRow.mockResolvedValueOnce(null);

		await expect(
			transactionService.saveTransaction(database, {
				classification: "GENERAL",
				type: "DEBIT",
				sourceId: "s1",
				categoryId: "missing-category",
				amount: "10",
				reason: "   ",
				transactionAt: 1,
				items: [{ categoryId: "missing-category", amount: "10" }],
			}),
		).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
	});

	it("fails when a blank general credit references a missing category", async () => {
		mocks.getCategoryRow.mockResolvedValueOnce(null);

		await expect(
			transactionService.saveTransaction(database, {
				classification: "GENERAL",
				type: "CREDIT",
				sourceId: "s1",
				categoryId: "missing-category",
				amount: "10",
				reason: "   ",
				transactionAt: 1,
			}),
		).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
	});

	it("validates investment inputs", async () => {
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "INVESTMENT",
				type: "DEBIT",
				sourceId: "s1",
				amount: "10",
				reason: "ok",
			}),
		).rejects.toMatchObject({ code: "INVESTMENT_REQUIRED" });

		await transactionService.saveTransaction(database, {
			classification: "INVESTMENT",
			type: "DEBIT",
			sourceId: "s1",
			investmentId: "inv1",
			amount: "10",
			reason: "   ",
			transactionAt: 1,
		});
		expect(mocks.createTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				classification: "INVESTMENT",
				reason: "Nifty Fund",
			}),
			expect.any(String),
			expect.any(Number),
		);

		mocks.getInvestmentRow.mockResolvedValueOnce(null);
		await expect(
			transactionService.saveTransaction(database, {
				classification: "INVESTMENT",
				type: "DEBIT",
				sourceId: "s1",
				investmentId: "missing-investment",
				amount: "10",
				reason: "invest",
				transactionAt: 1,
			}),
		).rejects.toMatchObject({ code: "INVESTMENT_NOT_FOUND" });

		const id = await transactionService.saveTransaction(database, {
			transactionAt: 1,
			classification: "INVESTMENT",
			type: "TRANSFER",
			sourceId: "s1",
			investmentId: "inv1",
			amount: "10.00",
			reason: "  invest  ",
		});
		expect(id).toBe("new-transaction-id");
		expect(mocks.createTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				classification: "INVESTMENT",
				type: "DEBIT",
				categoryId: undefined,
				tripId: undefined,
				destinationSourceId: undefined,
				toAmount: undefined,
				reason: "invest",
			}),
			"new-transaction-id",
			new Date("2026-08-25T12:00:00.000Z").getTime(),
		);

		await transactionService.saveTransaction(database, {
			transactionAt: 1,
			classification: "INVESTMENT",
			type: "CREDIT",
			sourceId: "s1",
			investmentId: "inv2",
			amount: "11",
			reason: " interest ",
		});
		expect(mocks.createTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				classification: "INVESTMENT",
				type: "CREDIT",
				reason: "interest",
			}),
			expect.any(String),
			expect.any(Number),
		);
	});

	it("saves investment transactions with per-item investments", async () => {
		mocks.getInvestmentRow.mockResolvedValue({
			id: "inv1",
			name: " Fund ",
		});
		const id = await transactionService.saveTransaction(database, {
			transactionAt: 1,
			classification: "INVESTMENT",
			type: "DEBIT",
			sourceId: "s1",
			amount: "0",
			reason: "  ",
			items: [
				{ investmentId: "inv1", amount: "6" },
				{ investmentId: "inv1", amount: "4" },
			],
		});
		expect(id).toBe("new-transaction-id");
		expect(mocks.createTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				classification: "INVESTMENT",
				amount: "10",
				reason: "Fund",
				categoryId: undefined,
				investmentId: undefined,
				tripId: undefined,
			}),
			"new-transaction-id",
			expect.any(Number),
		);
		expect(mocks.createTransactionItemRow).toHaveBeenCalledTimes(2);
		expect(mocks.createTransactionItemRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				transactionId: "new-transaction-id",
				investmentId: "inv1",
				categoryId: null,
				position: 1,
			}),
		);
	});

	it("validates investment item inputs", async () => {
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "INVESTMENT",
				type: "DEBIT",
				sourceId: "s1",
				amount: "10",
				reason: "ok",
				items: [{ investmentId: "", amount: "10" }],
			}),
		).rejects.toMatchObject({
			code: "INVESTMENT_REQUIRED",
			message: "Item 1: Select an investment.",
		});

		mocks.getInvestmentRow.mockResolvedValueOnce(null);
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "INVESTMENT",
				type: "DEBIT",
				sourceId: "s1",
				amount: "10",
				reason: "ok",
				items: [{ investmentId: "gone", amount: "10" }],
			}),
		).rejects.toMatchObject({
			code: "INVESTMENT_NOT_FOUND",
			message: "Item 1: The selected investment no longer exists.",
		});
	});

	it("validates transfer destination rules", async () => {
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "GENERAL",
				type: "TRANSFER",
				sourceId: "s1",
				amount: "10",
				reason: "ok",
			}),
		).rejects.toMatchObject({ code: "DESTINATION_REQUIRED" });

		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "GENERAL",
				type: "TRANSFER",
				sourceId: "s1",
				destinationSourceId: "s1",
				amount: "10",
				reason: "ok",
			}),
		).rejects.toMatchObject({ code: "SAME_TRANSFER_SOURCE" });
	});

	it("handles cross-currency transfer by normalizing toAmount", async () => {
		mocks.getSourceRow.mockResolvedValueOnce({
			id: "s1",
			currencyCode: "INR",
		});
		mocks.getSourceRow.mockResolvedValueOnce({
			id: "s2",
			currencyCode: "USD",
		});

		await transactionService.saveTransaction(database, {
			transactionAt: 1,
			classification: "GENERAL",
			type: "TRANSFER",
			sourceId: "s1",
			destinationSourceId: "s2",
			amount: "100",
			toAmount: " 1.25 ",
			reason: " move ",
		});

		expect(mocks.createTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				classification: "GENERAL",
				amount: "100",
				toAmount: "1.25",
				reason: "move",
				categoryId: undefined,
				tripId: undefined,
				investmentId: undefined,
			}),
			expect.any(String),
			expect.any(Number),
		);

		mocks.getSourceRow.mockResolvedValueOnce({
			id: "s1",
			currencyCode: "INR",
		});
		mocks.getSourceRow.mockResolvedValueOnce({
			id: "s2",
			currencyCode: "USD",
		});

		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "GENERAL",
				type: "TRANSFER",
				sourceId: "s1",
				destinationSourceId: "s2",
				amount: "100",
				reason: " move ",
			}),
		).rejects.toMatchObject({
			code: "INVALID_TO_AMOUNT",
			message: "Enter a valid positive received amount.",
		});
	});

	it("rejects missing transfer sources and same-currency mismatch", async () => {
		mocks.getSourceRow.mockResolvedValueOnce(null);
		mocks.getSourceRow.mockResolvedValueOnce({
			id: "s2",
			currencyCode: "INR",
		});
		await expect(
			transactionService.saveTransaction(database, {
				transactionAt: 1,
				classification: "GENERAL",
				type: "TRANSFER",
				sourceId: "s1",
				destinationSourceId: "s2",
				amount: "10",
				toAmount: "10",
				reason: "ok",
			}),
		).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND" });

		mocks.getSourceRow.mockResolvedValueOnce({
			id: "s1",
			currencyCode: "INR",
		});
		mocks.getSourceRow.mockResolvedValueOnce({
			id: "s2",
			currencyCode: "INR",
		});
		await transactionService.saveTransaction(database, {
			transactionAt: 1,
			classification: "GENERAL",
			type: "TRANSFER",
			sourceId: "s1",
			destinationSourceId: "s2",
			amount: "10",
			toAmount: "12",
			reason: "ok",
		});
		expect(mocks.createTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({ toAmount: "10" }),
			expect.any(String),
			expect.any(Number),
		);
	});

	it("updates existing transaction when id is provided", async () => {
		mocks.getTransactionRow.mockResolvedValueOnce({
			id: "existing",
			items: [],
		});
		mocks.getCategoryRow.mockResolvedValueOnce({ id: "c1", name: "Food" });
		await transactionService.saveTransaction(database, {
			transactionAt: 1,
			id: "existing",
			classification: "GENERAL",
			type: "DEBIT",
			sourceId: "s1",
			categoryId: "c1",
			amount: "10",
			reason: "ok",
			items: [{ categoryId: "c1", amount: "10" }],
		});

		expect(mocks.updateTransactionRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				categoryId: undefined,
				investmentId: undefined,
			}),
			"existing",
			new Date("2026-08-25T12:00:00.000Z").getTime(),
		);
		expect(mocks.createTransactionRow).not.toHaveBeenCalled();
	});

	it("retains existing item ids on update", async () => {
		mocks.getTransactionRow.mockResolvedValueOnce({
			id: "existing",
			items: [{ id: "item-1" }],
		});
		mocks.getCategoryRow.mockResolvedValueOnce({ id: "c1", name: "Food" });
		await transactionService.saveTransaction(database, {
			transactionAt: 1,
			id: "existing",
			classification: "GENERAL",
			type: "DEBIT",
			sourceId: "s1",
			amount: "10",
			reason: "ok",
			items: [{ id: "item-1", categoryId: "c1", amount: "10" }],
		});
		expect(mocks.createTransactionItemRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({ id: "item-1" }),
		);
	});

	it("deletes transaction via repository wrapper", async () => {
		await transactionService.deleteTransaction(database, "tx-delete");
		expect(mocks.deleteTransactionRow).toHaveBeenCalledWith(
			database,
			"tx-delete",
		);
	});

	it("builds display reason fallbacks", () => {
		expect(
			transactionService.getTransactionDisplayReason({
				reason: "Groceries",
				type: "DEBIT",
				sourceName: "Cash",
				destinationSourceName: null,
			} as any),
		).toBe("Groceries");

		expect(
			transactionService.getTransactionDisplayReason({
				reason: "   ",
				type: "TRANSFER",
				sourceName: "Cash",
				destinationSourceName: "Bank",
			} as any),
		).toBe("Cash to Bank");

		expect(
			transactionService.getTransactionDisplayReason({
				reason: "   ",
				type: "TRANSFER",
				sourceName: "Cash",
				destinationSourceName: null,
			} as any),
		).toBe("Transaction");
	});

	it("deletes transaction and builds display reason", async () => {
		await transactionService.deleteTransaction(database, "t1");
		expect(mocks.deleteTransactionRow).toHaveBeenCalledWith(database, "t1");

		expect(
			transactionService.getTransactionDisplayReason({
				reason: "  custom  ",
				type: "DEBIT",
				sourceName: "A",
				destinationSourceName: "B",
			} as any),
		).toBe("  custom  ");
		expect(
			transactionService.getTransactionDisplayReason({
				reason: " ",
				type: "TRANSFER",
				sourceName: "A",
				destinationSourceName: "B",
			} as any),
		).toBe("A to B");
		expect(
			transactionService.getTransactionDisplayReason({
				reason: " ",
				type: "DEBIT",
				sourceName: "A",
				destinationSourceName: null,
			} as any),
		).toBe("Transaction");
	});
});
