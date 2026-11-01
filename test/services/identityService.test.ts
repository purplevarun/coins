import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	deleteContentRow: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
	getIdentityRow: vi.fn<TestAsyncFunction>().mockResolvedValue(null),
	getIdentityRows: vi.fn<TestAsyncFunction>().mockResolvedValue([]),
	upsertIdentityRow: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
	createId: vi.fn(() => "identity-id"),
}));

vi.mock("@/repositories/contentRepository", () => ({
	default: {
		deleteContentRow: mocks.deleteContentRow,
		getIdentityRow: mocks.getIdentityRow,
		getIdentityRows: mocks.getIdentityRows,
		upsertIdentityRow: mocks.upsertIdentityRow,
	},
}));

vi.mock("@/utils/id", () => ({
	default: mocks.createId,
}));

import identityService from "@/services/identityService";

const database = {} as any;

describe("identityService", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-25T12:00:00.000Z"));
		Object.values(mocks).forEach((mockFn) => mockFn.mockClear());
	});

	it("loads identities and handles missing records", async () => {
		mocks.getIdentityRows.mockResolvedValueOnce([{ id: "i1", title: "A" }]);
		mocks.getIdentityRow.mockResolvedValueOnce({
			id: "i2",
			title: "B",
		});
		expect(await identityService.getIdentities(database)).toEqual([
			{ id: "i1", title: "A" },
		]);
		expect(await identityService.getIdentity(database, "i2")).toEqual({
			id: "i2",
			title: "B",
		});
		mocks.getIdentityRow.mockResolvedValueOnce(null);
		expect(
			await identityService.getIdentity(database, "missing"),
		).toBeNull();
	});

	it("validates and creates identity", async () => {
		await expect(
			identityService.saveIdentity(database, {
				title: "   ",
				idNumber: "x",
			}),
		).rejects.toMatchObject({ code: "IDENTITY_TITLE_REQUIRED" });

		const id = await identityService.saveIdentity(database, {
			title: "  Passport  ",
			idNumber: "  P123  ",
		});
		expect(id).toBe("identity-id");
		expect(mocks.upsertIdentityRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				id: "identity-id",
				title: "Passport",
				idNumber: "P123",
				createdAt: new Date("2026-08-25T12:00:00.000Z").getTime(),
			}),
		);
	});

	it("updates identity preserving createdAt", async () => {
		mocks.getIdentityRow.mockResolvedValueOnce({
			id: "i1",
			createdAt: 123,
		});

		const id = await identityService.saveIdentity(database, {
			id: "i1",
			title: "  Aadhaar  ",
			idNumber: "  A123  ",
		});
		expect(id).toBe("i1");
		expect(mocks.upsertIdentityRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				id: "i1",
				createdAt: 123,
			}),
		);
	});

	it("deletes via content repository", async () => {
		await identityService.deleteIdentity(database, "i1");
		expect(mocks.deleteContentRow).toHaveBeenCalledWith(
			database,
			"identities",
			"i1",
		);
	});
});
