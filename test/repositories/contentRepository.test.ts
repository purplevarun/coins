import contentRepository from "@/repositories/contentRepository";
import type TestAsyncFunction from "@test/types/TestAsyncFunction";

import { describe, expect, it, vi } from "vitest";

const {
	deleteContentRow,
	getCardRow,
	getCardRows,
	getPasswordRow,
	getPasswordRows,
	upsertCardRow,
	upsertPasswordRow,
} = contentRepository;

describe("contentRepository", () => {
	it("queries password and card rows", async () => {
		const database = {
			getAllAsync: vi
				.fn()
				.mockResolvedValueOnce([{ id: "p1" }])
				.mockResolvedValueOnce([{ id: "c1" }]),
			getFirstAsync: vi
				.fn()
				.mockResolvedValueOnce({ id: "p1" })
				.mockResolvedValueOnce({ id: "c1" }),
		} as any;

		expect(await getPasswordRows(database)).toEqual([{ id: "p1" }]);
		expect(await getCardRows(database)).toEqual([{ id: "c1" }]);

		expect(await getPasswordRow(database, "p1")).toEqual({ id: "p1" });
		expect(await getCardRow(database, "c1")).toEqual({ id: "c1" });
	});

	it("upserts all content entities", async () => {
		const database = {
			runAsync: vi
				.fn<TestAsyncFunction>()
				.mockResolvedValue({ changes: 0 }),
		} as any;

		await upsertPasswordRow(database, {
			id: "p1",
			title: "Site",
			username: "u",
			password: "pw",
			createdAt: 1,
			updatedAt: 2,
		});
		expect(database.runAsync).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO passwords"),
			"p1",
			"Site",
			"u",
			"pw",
			1,
			2,
		);

		await upsertCardRow(database, {
			id: "c1",
			name: "Card",
			cardNumber: "1111",
			cardType: "CREDIT_CARD",
			expiry: "12/30",
			cvv: "111",
			pin: "0000",
			network: "VISA",
			createdAt: 1,
			updatedAt: 2,
		});
		expect(database.runAsync).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO cards"),
			"c1",
			"Card",
			"1111",
			"CREDIT_CARD",
			"12/30",
			"111",
			"0000",
			"VISA",
			1,
			2,
		);
	});

	it("updates existing content entities without inserting", async () => {
		const database = {
			runAsync: vi
				.fn<TestAsyncFunction>()
				.mockResolvedValue({ changes: 1 }),
		} as any;

		await upsertPasswordRow(database, {
			id: "p1",
			title: "Site",
			username: "u",
			password: "pw",
			createdAt: 1,
			updatedAt: 2,
		});
		expect(database.runAsync).toHaveBeenCalledWith(
			expect.stringContaining("UPDATE passwords"),
			"Site",
			"u",
			"pw",
			2,
			"p1",
		);

		await upsertCardRow(database, {
			id: "c1",
			name: "Card",
			cardNumber: "1111",
			cardType: "CREDIT_CARD",
			expiry: "12/30",
			cvv: "111",
			pin: "0000",
			network: "VISA",
			createdAt: 1,
			updatedAt: 2,
		});
		expect(database.runAsync).toHaveBeenCalledWith(
			expect.stringContaining("UPDATE cards"),
			"Card",
			"1111",
			"CREDIT_CARD",
			"12/30",
			"111",
			"0000",
			"VISA",
			2,
			"c1",
		);

		expect(database.runAsync).toHaveBeenCalledTimes(2);
	});

	it("deletes content rows", async () => {
		const database = {
			runAsync: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
		} as any;

		await deleteContentRow(database, "passwords", "p1");
		expect(database.runAsync).toHaveBeenCalledWith(
			"DELETE FROM passwords WHERE id = ?;",
			"p1",
		);

		await deleteContentRow(database, "cards", "c1");
		expect(database.runAsync).toHaveBeenCalledWith(
			"DELETE FROM cards WHERE id = ?;",
			"c1",
		);
	});
});
