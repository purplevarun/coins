import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import type { SQLiteDatabase } from "expo-sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	execAsync,
	closeAsync,
	getFirstAsync,
	cacheList,
	cacheDelete,
	openDatabaseAsync,
} = vi.hoisted(() => {
	const mockedExecAsync = vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue(undefined);
	const mockedCloseAsync = vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue(undefined);
	const mockedGetFirstAsync = vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue(null);
	const cacheList = vi.fn((): unknown[] => []);
	const cacheDelete = vi.fn();
	const mockedOpenDatabaseAsync = vi.fn(async () => ({
		execAsync: mockedExecAsync,
		closeAsync: mockedCloseAsync,
		getFirstAsync: mockedGetFirstAsync,
	}));
	return {
		execAsync: mockedExecAsync,
		closeAsync: mockedCloseAsync,
		getFirstAsync: mockedGetFirstAsync,
		cacheList,
		cacheDelete,
		openDatabaseAsync: mockedOpenDatabaseAsync,
	};
});

vi.mock("expo-sqlite", () => ({
	openDatabaseAsync,
}));

vi.mock("expo-file-system", () => {
	class File {
		name: string;
		constructor(name: string) {
			this.name = name;
		}
		delete(): void {
			cacheDelete(this.name);
		}
	}
	class Directory {
		name: string;
		constructor(name: string) {
			this.name = name;
		}
		delete(): void {
			cacheDelete(this.name);
		}
	}
	return { File, Directory, Paths: { cache: { list: cacheList } } };
});

import { Directory, File } from "expo-file-system";

vi.mock("@/constants/appConstants", () => ({
	default: {
		DATABASE_NAME: "test.db",
	},
}));

vi.mock("@/database/migrations", () => ({
	migrateDatabase: (database: SQLiteDatabase): Promise<void> =>
		database.execAsync("FUTURE_MIGRATION_SQL"),
}));

vi.mock("@/database/schema", () => ({
	default: "SCHEMA_SQL",
}));

import initializeDatabase, {
	vacuumDatabase,
} from "@/database/initializeDatabase";

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
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 19, 0, 5));
		execAsync.mockClear();
		closeAsync.mockClear();
		openDatabaseAsync.mockClear();
		getFirstAsync.mockReset().mockResolvedValue(null);
		cacheList.mockReset().mockReturnValue([]);
		cacheDelete.mockReset();
	});
	afterEach(() => vi.useRealTimers());

	it("removes only legacy cached files when the database is upgraded", async () => {
		getFirstAsync.mockResolvedValueOnce({ name: "attachments" });
		cacheList.mockReturnValue([
			new File("01234567-1234-1234-1234-012345678901-receipt.pdf"),
			new File("purplecoins-2026-10-19.pc"),
			new Directory("DocumentPicker"),
			new Directory("ReactNativeBlobUtil"),
			new Directory("react-native-pdf"),
			new Directory("other-cache"),
		]);
		await initializeDatabase();
		expect(cacheDelete.mock.calls.map(([name]) => name)).toEqual([
			"01234567-1234-1234-1234-012345678901-receipt.pdf",
			"DocumentPicker",
			"ReactNativeBlobUtil",
			"react-native-pdf",
		]);
	});

	it("keeps the migration pending when legacy cache cleanup fails", async () => {
		getFirstAsync.mockResolvedValueOnce({ name: "attachments" });
		cacheList.mockReturnValue([new Directory("DocumentPicker")]);
		cacheDelete.mockImplementationOnce(() => {
			throw new Error("cache deletion failed");
		});
		await expect(initializeDatabase()).rejects.toThrow(
			"cache deletion failed",
		);
		expect(execAsync).not.toHaveBeenCalled();
		expect(closeAsync).toHaveBeenCalledOnce();
	});

	it("opens the configured database and runs schema plus migrations", async () => {
		const database = await initializeDatabase();

		expect(openDatabaseAsync).toHaveBeenCalledWith("test.db", {
			useNewConnection: true,
		});
		expect(execAsync).toHaveBeenNthCalledWith(1, "SCHEMA_SQL");
		expect(execAsync).toHaveBeenNthCalledWith(2, "FUTURE_MIGRATION_SQL");
		expect(execAsync).toHaveBeenCalledTimes(2);
		expect(cacheList).not.toHaveBeenCalled();
		expect(closeAsync).not.toHaveBeenCalled();
		expect(database).toMatchObject({ execAsync });
	});

	it("closes the database and propagates migration failures", async () => {
		execAsync.mockRejectedValueOnce(new Error("upgrade failed"));
		await expect(initializeDatabase()).rejects.toThrow("upgrade failed");
		expect(closeAsync).toHaveBeenCalledOnce();
	});

	it("compacts on every run", async () => {
		const database =
			(await openDatabaseAsync()) as unknown as SQLiteDatabase;
		await vacuumDatabase(database);
		await vacuumDatabase(database);
		expect(
			execAsync.mock.calls.filter(([sql]) => sql === "VACUUM;"),
		).toHaveLength(2);
	});

	it("propagates compaction failures and retries on the next run", async () => {
		const database =
			(await openDatabaseAsync()) as unknown as SQLiteDatabase;
		execAsync.mockRejectedValueOnce(new Error("vacuum failed"));
		await expect(vacuumDatabase(database)).rejects.toThrow("vacuum failed");
		await vacuumDatabase(database);
		expect(execAsync).toHaveBeenLastCalledWith("VACUUM;");
	});

	it("prevents overlapping compactions on the same connection", async () => {
		const database =
			(await openDatabaseAsync()) as unknown as SQLiteDatabase;
		await Promise.all([vacuumDatabase(database), vacuumDatabase(database)]);
		expect(execAsync).toHaveBeenCalledExactlyOnceWith("VACUUM;");
	});
});
