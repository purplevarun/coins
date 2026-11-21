import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	createId: vi.fn(() => "sector-id"),
	deleteSectorRow: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
	getSectorCategoryIdRows: vi.fn<TestAsyncFunction>().mockResolvedValue([]),
	getSectorCategoryOwnerRows: vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue([]),
	getSectorRow: vi.fn<TestAsyncFunction>().mockResolvedValue(null),
	getSectorRows: vi.fn<TestAsyncFunction>().mockResolvedValue([]),
	replaceSectorCategoryRows: vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue(undefined),
	sectorNameExistsRow: vi.fn(async () => false),
	upsertSectorRow: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
}));

vi.mock("@/repositories/financeRepository", () => ({
	default: {
		deleteSectorRow: mocks.deleteSectorRow,
		getSectorCategoryIdRows: mocks.getSectorCategoryIdRows,
		getSectorCategoryOwnerRows: mocks.getSectorCategoryOwnerRows,
		getSectorRow: mocks.getSectorRow,
		getSectorRows: mocks.getSectorRows,
		replaceSectorCategoryRows: mocks.replaceSectorCategoryRows,
		sectorNameExistsRow: mocks.sectorNameExistsRow,
		upsertSectorRow: mocks.upsertSectorRow,
	},
}));

vi.mock("@/utils/id", () => ({
	default: mocks.createId,
}));

import sectorService from "@/services/sectorService";

const database = {} as any;

describe("sectorService", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-25T12:00:00.000Z"));
		Object.values(mocks).forEach((mockFn) => mockFn.mockClear());
	});

	it("lists sectors", async () => {
		mocks.getSectorRows.mockResolvedValueOnce([{ id: "s1" }]);
		expect(await sectorService.getSectors(database)).toEqual([
			{ id: "s1" },
		]);
	});

	it("gets one sector with its category ids", async () => {
		mocks.getSectorRow.mockResolvedValueOnce({ id: "s1", name: "Home" });
		mocks.getSectorCategoryIdRows.mockResolvedValueOnce(["c1", "c2"]);
		expect(await sectorService.getSector(database, "s1")).toEqual({
			sector: { id: "s1", name: "Home" },
			categoryIds: ["c1", "c2"],
		});
		expect(await sectorService.getSector(database, "missing")).toBeNull();
	});

	it("maps categories to owning sector names", async () => {
		mocks.getSectorCategoryOwnerRows.mockResolvedValueOnce([
			{ categoryId: "c1", sectorName: "Home" },
			{ categoryId: "c2", sectorName: "Work" },
		]);
		expect(await sectorService.getSectorCategoryOwners(database)).toEqual(
			new Map([
				["c1", "Home"],
				["c2", "Work"],
			]),
		);
	});

	it("requires a name", async () => {
		await expect(
			sectorService.saveSector(database, undefined, "  ", []),
		).rejects.toMatchObject({ code: "SECTOR_NAME_REQUIRED" });
	});

	it("rejects duplicate names", async () => {
		mocks.sectorNameExistsRow.mockResolvedValueOnce(true);
		await expect(
			sectorService.saveSector(database, undefined, "Home", []),
		).rejects.toMatchObject({ code: "SECTOR_NAME_DUPLICATE" });
	});

	it("creates a sector with category mappings", async () => {
		const id = await sectorService.saveSector(
			database,
			undefined,
			" Home ",
			["c1", "c2"],
		);
		expect(id).toBe("sector-id");
		expect(mocks.upsertSectorRow).toHaveBeenCalledWith(database, {
			id: "sector-id",
			name: "Home",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
		expect(mocks.replaceSectorCategoryRows).toHaveBeenCalledWith(
			database,
			"sector-id",
			["c1", "c2"],
			Date.now(),
		);
	});

	it("updates a sector keeping its creation time", async () => {
		mocks.getSectorRow.mockResolvedValueOnce({
			id: "s1",
			createdAt: 123,
		});
		await sectorService.saveSector(database, "s1", "Renamed", []);
		expect(mocks.upsertSectorRow).toHaveBeenCalledWith(database, {
			id: "s1",
			name: "Renamed",
			createdAt: 123,
			updatedAt: Date.now(),
		});
	});

	it("deletes a sector", async () => {
		await sectorService.deleteSector(database, "s1");
		expect(mocks.deleteSectorRow).toHaveBeenCalledWith(database, "s1");
	});
});
