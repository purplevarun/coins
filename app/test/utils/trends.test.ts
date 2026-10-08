import { describe, expect, it } from "vitest";

import type Transaction from "@/types/Transaction";
import { getTrendSeries, getYear } from "@/utils/trends";

const buildTransaction = (
	overrides: Partial<Transaction> & Pick<Transaction, "transactionAt">,
): Transaction => ({
	id: "t1",
	classification: "GENERAL",
	type: "CREDIT",
	sourceId: "s1",
	destinationSourceId: null,
	amount: "100",
	toAmount: null,
	categoryId: "c1",
	tripId: null,
	investmentId: null,
	reason: "",
	createdAt: 0,
	updatedAt: 0,
	sourceName: "Source",
	sourceCurrencyCode: "INR",
	destinationSourceName: null,
	destinationCurrencyCode: null,
	categoryName: "Category",
	tripName: null,
	investmentName: null,
	hasAttachment: false,
	items: [],
	...overrides,
});

describe("trends utils", () => {
	it("builds a year string from a timestamp", () => {
		expect(getYear(new Date("2024-01-15").getTime())).toBe("2024");
	});

	it("returns an empty series when there are no transactions", () => {
		expect(getTrendSeries([])).toEqual([]);
	});

	it("converts income and expenses to INR and excludes missing rates", () => {
		const transactionAt = new Date(2026, 0, 15).getTime();
		expect(
			getTrendSeries(
				[
					buildTransaction({ transactionAt, amount: "100" }),
					buildTransaction({
						transactionAt,
						amount: "100",
						sourceCurrencyCode: "USD",
					}),
					buildTransaction({
						transactionAt,
						amount: "10",
						type: "DEBIT",
						sourceCurrencyCode: "USD",
					}),
					buildTransaction({
						transactionAt,
						amount: "999",
						sourceCurrencyCode: "EUR",
					}),
				],
				new Map([["USD", "83"]]),
			),
		).toEqual([
			{ year: "2026", income: "8400", expenses: "830", networth: "7570" },
		]);
		expect(
			getTrendSeries([
				buildTransaction({ transactionAt, sourceCurrencyCode: "EUR" }),
			]),
		).toEqual([]);
	});

	it("counts an itemized expense once without a parent category", () => {
		const transaction = buildTransaction({
			id: "split-expense",
			transactionAt: new Date(2026, 0, 15).getTime(),
			type: "DEBIT",
			categoryId: null,
			categoryName: null,
			amount: "200",
			items: ["food", "grocery"].map((categoryId, position) => ({
				id: `item-${categoryId}`,
				transactionId: "split-expense",
				categoryId,
				categoryName: categoryId,
				amount: "100",
				position,
				createdAt: 1,
				updatedAt: 1,
			})),
		});
		expect(getTrendSeries([transaction])).toEqual([
			{ year: "2026", income: "0", expenses: "200", networth: "-200" },
		]);
	});

	it("subtracts refund credits from expenses without counting income", () => {
		const transactionAt = new Date(2026, 0, 15).getTime();
		expect(
			getTrendSeries([
				buildTransaction({
					transactionAt,
					categoryKind: "REFUND",
					amount: "25",
				}),
			]),
		).toEqual([
			{ year: "2026", income: "0", expenses: "-25", networth: "25" },
		]);
	});

	it("aggregates every transaction into yearly income/expense/networth points", () => {
		const transactions: readonly Transaction[] = [
			buildTransaction({
				transactionAt: new Date("2020-01-10").getTime(),
				classification: "GENERAL",
				type: "CREDIT",
				categoryId: "c1",
				amount: "100",
			}),
			buildTransaction({
				transactionAt: new Date("2021-02-10").getTime(),
				classification: "INVESTMENT",
				type: "CREDIT",
				categoryId: "c1",
				amount: "20",
			}),
			buildTransaction({
				transactionAt: new Date("2022-03-10").getTime(),
				classification: "GENERAL",
				type: "DEBIT",
				categoryId: "c1",
				amount: "40",
			}),
			buildTransaction({
				transactionAt: new Date("2023-04-10").getTime(),
				classification: "GENERAL",
				type: "CREDIT",
				categoryId: null,
				amount: "30",
			}),
			buildTransaction({
				transactionAt: new Date("2024-05-10").getTime(),
				classification: "INVESTMENT",
				type: "DEBIT",
				categoryId: "c1",
				amount: "15",
			}),
			buildTransaction({
				transactionAt: new Date("2025-06-10").getTime(),
				classification: "GENERAL",
				type: "DEBIT",
				categoryId: null,
				amount: "10",
			}),
		];

		expect(getTrendSeries(transactions)).toEqual([
			{ year: "2020", income: "100", expenses: "0", networth: "100" },
			{ year: "2021", income: "0", expenses: "0", networth: "100" },
			{ year: "2022", income: "0", expenses: "40", networth: "60" },
			{ year: "2023", income: "0", expenses: "0", networth: "60" },
			{ year: "2024", income: "0", expenses: "0", networth: "60" },
			{ year: "2025", income: "0", expenses: "0", networth: "60" },
		]);
	});
});
