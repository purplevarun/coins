import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getInvestmentTypeRows: vi.fn<TestAsyncFunction>().mockResolvedValue([]),
	getInvestmentTypeRow: vi.fn<TestAsyncFunction>().mockResolvedValue(null),
	investmentTypeNameExistsRow: vi.fn(async () => false),
	upsertInvestmentTypeRow: vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue(undefined),
	createId: vi.fn(() => "type-id"),
}));

vi.mock("@/repositories/financeRepository", () => ({
	default: {
		getInvestmentTypeRows: mocks.getInvestmentTypeRows,
		getInvestmentTypeRow: mocks.getInvestmentTypeRow,
		investmentTypeNameExistsRow: mocks.investmentTypeNameExistsRow,
		upsertInvestmentTypeRow: mocks.upsertInvestmentTypeRow,
	},
}));

vi.mock("@/utils/id", () => ({
	default: mocks.createId,
}));

import investmentTypeService from "@/services/investmentTypeService";

const database = {} as any;

describe("investmentTypeService", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-25T12:00:00.000Z"));
		Object.values(mocks).forEach((mockFn) => mockFn.mockClear());
	});

	it("returns investment type rows", async () => {
		mocks.getInvestmentTypeRows.mockResolvedValueOnce([
			{ id: "t1", name: "Mutual Fund" },
		]);
		expect(
			await investmentTypeService.getInvestmentTypes(database),
		).toEqual([{ id: "t1", name: "Mutual Fund" }]);
	});

	it("validates and saves an investment type", async () => {
		await expect(
			investmentTypeService.saveInvestmentType(
				database,
				undefined,
				"   ",
			),
		).rejects.toMatchObject({
			code: "INVESTMENT_TYPE_NAME_REQUIRED",
		});

		mocks.investmentTypeNameExistsRow.mockResolvedValueOnce(true);
		await expect(
			investmentTypeService.saveInvestmentType(
				database,
				undefined,
				"Mutual Fund",
			),
		).rejects.toMatchObject({
			code: "INVESTMENT_TYPE_NAME_DUPLICATE",
		});
		expect(mocks.investmentTypeNameExistsRow).toHaveBeenLastCalledWith(
			database,
			"Mutual Fund",
			undefined,
		);

		mocks.investmentTypeNameExistsRow.mockResolvedValueOnce(false);
		const id = await investmentTypeService.saveInvestmentType(
			database,
			undefined,
			"  Mutual Fund  ",
		);
		expect(id).toBe("type-id");
		expect(mocks.getInvestmentTypeRow).not.toHaveBeenCalled();
		expect(mocks.upsertInvestmentTypeRow).toHaveBeenCalledWith(database, {
			id: "type-id",
			name: "Mutual Fund",
			createdAt: new Date("2026-08-25T12:00:00.000Z").getTime(),
			updatedAt: new Date("2026-08-25T12:00:00.000Z").getTime(),
		});
	});

	it("updates an existing investment type preserving its creation date", async () => {
		const now = new Date("2026-08-25T12:00:00.000Z").getTime();
		mocks.getInvestmentTypeRow.mockResolvedValueOnce({
			id: "existing",
			name: "Old",
			createdAt: 5,
			updatedAt: 6,
		});
		const id = await investmentTypeService.saveInvestmentType(
			database,
			"existing",
			"  Equity  ",
		);
		expect(id).toBe("existing");
		expect(mocks.investmentTypeNameExistsRow).toHaveBeenLastCalledWith(
			database,
			"Equity",
			"existing",
		);
		expect(mocks.upsertInvestmentTypeRow).toHaveBeenLastCalledWith(
			database,
			{
				id: "existing",
				name: "Equity",
				createdAt: 5,
				updatedAt: now,
			},
		);

		mocks.getInvestmentTypeRow.mockResolvedValueOnce(null);
		await investmentTypeService.saveInvestmentType(
			database,
			"missing",
			"Ghost",
		);
		expect(mocks.upsertInvestmentTypeRow).toHaveBeenLastCalledWith(
			database,
			{
				id: "missing",
				name: "Ghost",
				createdAt: now,
				updatedAt: now,
			},
		);
	});
});
