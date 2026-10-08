import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getTripTotalRows: vi.fn<TestAsyncFunction>().mockResolvedValue([]),
}));

vi.mock("@/repositories/financeRepository", () => ({
	default: {
		getTripTotalRows: mocks.getTripTotalRows,
	},
}));

import tripTotalService from "@/services/tripTotalService";

const database = {} as any;

describe("tripTotalService", () => {
	beforeEach(() => {
		mocks.getTripTotalRows.mockClear();
	});

	it("groups exact rows into spent-positive totals", () => {
		const totals = tripTotalService.buildTripTotals([
			{
				tripId: "trip1",
				currencyCode: "INR",
				credits: "40",
				debits: "100",
			},
			{
				tripId: "trip1",
				currencyCode: "USD",
				credits: "0",
				debits: "10",
			},
			{
				tripId: "tripA",
				currencyCode: "EUR",
				credits: "20",
				debits: "0",
			},
		]);

		expect(totals).toEqual([
			{
				tripId: "trip1",
				currencyCode: "INR",
				credits: "40",
				debits: "100",
				total: "60",
			},
			{
				tripId: "trip1",
				currencyCode: "USD",
				credits: "0",
				debits: "10",
				total: "10",
			},
			{
				tripId: "tripA",
				currencyCode: "EUR",
				credits: "20",
				debits: "0",
				total: "-20",
			},
		]);
	});

	it("sums decimal allocations without floating-point drift", () => {
		const totals = tripTotalService.buildTripTotals([
			{
				tripId: "trip1",
				currencyCode: "INR",
				credits: "0.1",
				debits: "1",
			},
			{
				tripId: "trip1",
				currencyCode: "INR",
				credits: "0.2",
				debits: "0",
			},
		]);

		expect(totals[0]?.credits).toBe("0.3");
		expect(totals[0]?.total).toBe("0.7");
	});

	it("loads exact rows from the repository in getTripTotals", async () => {
		mocks.getTripTotalRows.mockResolvedValueOnce([
			{ tripId: "trip2", currencyCode: "EUR", credits: "0", debits: "5" },
		]);

		const totals = await tripTotalService.getTripTotals(database);
		expect(mocks.getTripTotalRows).toHaveBeenCalledExactlyOnceWith(
			database,
		);
		expect(totals).toEqual([
			{
				tripId: "trip2",
				currencyCode: "EUR",
				credits: "0",
				debits: "5",
				total: "5",
			},
		]);
	});
});
