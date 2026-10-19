import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { execAsync, closeAsync, openDatabaseAsync } = vi.hoisted(() => {
	const mockedExecAsync = vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue(undefined);
	const mockedCloseAsync = vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue(undefined);
	const mockedOpenDatabaseAsync = vi.fn(async () => ({
		execAsync: mockedExecAsync,
		closeAsync: mockedCloseAsync,
	}));
	return {
		execAsync: mockedExecAsync,
		closeAsync: mockedCloseAsync,
		openDatabaseAsync: mockedOpenDatabaseAsync,
	};
});

vi.mock("expo-sqlite", () => ({
	openDatabaseAsync,
}));

vi.mock("@/constants/appConstants", () => ({
	default: {
		DATABASE_NAME: "test.db",
	},
}));

vi.mock("@/database/migrations", () => ({
	default: ["FUTURE_MIGRATION_SQL"],
}));

vi.mock("@/database/schema", () => ({
	default: "SCHEMA_SQL",
}));

import initializeDatabase from "@/database/initializeDatabase";

describe("initializeDatabase", () => {
	it.each([
		new Error("disk failure"),
		new Error("duplicate column name: platform_id"),
		new Error("no such column: kind"),
		"native failure",
	])("propagates migration errors: %s", async (error) => {
		execAsync.mockResolvedValueOnce(undefined).mockRejectedValueOnce(error);
		await expect(initializeDatabase()).rejects.toBe(error);
		expect(closeAsync).toHaveBeenCalledOnce();
	});

	beforeEach(() => {
		execAsync.mockClear();
		closeAsync.mockClear();
		openDatabaseAsync.mockClear();
	});

	it("opens the configured database and runs schema plus migrations", async () => {
		const database = await initializeDatabase();

		expect(openDatabaseAsync).toHaveBeenCalledWith("test.db", {
			useNewConnection: true,
		});
		expect(execAsync).toHaveBeenNthCalledWith(1, "SCHEMA_SQL");
		expect(execAsync).toHaveBeenNthCalledWith(2, "FUTURE_MIGRATION_SQL");
		expect(closeAsync).not.toHaveBeenCalled();
		expect(database).toMatchObject({ execAsync });
	});

	it("closes the database and propagates migration failures", async () => {
		execAsync.mockRejectedValueOnce(new Error("upgrade failed"));
		await expect(initializeDatabase()).rejects.toThrow("upgrade failed");
		expect(closeAsync).toHaveBeenCalledOnce();
	});
});
