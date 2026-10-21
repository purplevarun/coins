import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import type { SQLiteDatabase } from "expo-sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
	execAsync,
	closeAsync,
	getFirstAsync,
	getSettingRow,
	upsertSettingRow,
	cacheList,
	cacheDelete,
	toast,
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
		getSettingRow: vi.fn<TestAsyncFunction>().mockResolvedValue(null),
		upsertSettingRow: vi
			.fn<TestAsyncFunction>()
			.mockResolvedValue(undefined),
		cacheList,
		cacheDelete,
		toast: vi.fn(),
		openDatabaseAsync: mockedOpenDatabaseAsync,
	};
});

vi.mock("expo-sqlite", () => ({
	openDatabaseAsync,
}));

vi.mock("react-native", () => ({
	ToastAndroid: { show: toast, SHORT: 0 },
}));

vi.mock("@/repositories/settingsRepository", () => ({
	default: { getSettingRow, upsertSettingRow },
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
		LAST_VACUUM_DAY_KEY: "database.lastVacuumDay",
	},
}));

vi.mock("@/database/migrations", () => ({
	default: ["FUTURE_MIGRATION_SQL"],
}));

vi.mock("@/database/schema", () => ({
	default: "SCHEMA_SQL",
}));

import initializeDatabase, {
	vacuumDatabaseIfNeeded,
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
		getSettingRow.mockReset().mockResolvedValue(null);
		upsertSettingRow.mockReset().mockResolvedValue(undefined);
		cacheList.mockReset().mockReturnValue([]);
		cacheDelete.mockReset();
		toast.mockReset();
	});
	afterEach(() => vi.useRealTimers());

	it("removes only legacy cached files and compacts the upgraded database", async () => {
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
		expect(execAsync).toHaveBeenLastCalledWith("VACUUM;");
		expect(toast).toHaveBeenCalledExactlyOnceWith("Vacuum done!", 0);
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
		expect(execAsync).toHaveBeenNthCalledWith(3, "VACUUM;");
		expect(execAsync).toHaveBeenCalledTimes(3);
		expect(upsertSettingRow).toHaveBeenCalledWith(
			database,
			"database.lastVacuumDay",
			"2026-10-19",
			Date.now(),
		);
		expect(cacheList).not.toHaveBeenCalled();
		expect(closeAsync).not.toHaveBeenCalled();
		expect(database).toMatchObject({ execAsync });
	});

	it("closes the database and propagates migration failures", async () => {
		execAsync.mockRejectedValueOnce(new Error("upgrade failed"));
		await expect(initializeDatabase()).rejects.toThrow("upgrade failed");
		expect(closeAsync).toHaveBeenCalledOnce();
	});

	it("skips compaction on later opens of the same local day", async () => {
		getSettingRow
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce("2026-10-19");
		await initializeDatabase();
		vi.setSystemTime(new Date(2026, 9, 19, 23, 55));
		await initializeDatabase();
		expect(
			execAsync.mock.calls.filter(([sql]) => sql === "VACUUM;"),
		).toHaveLength(1);
		expect(upsertSettingRow).toHaveBeenCalledOnce();
		expect(toast).toHaveBeenCalledTimes(1);
	});

	it("compacts again on the first open of the next local day", async () => {
		getSettingRow.mockResolvedValueOnce("2026-10-19");
		vi.setSystemTime(new Date(2026, 9, 20, 0, 1));
		const database = await initializeDatabase();
		expect(execAsync).toHaveBeenLastCalledWith("VACUUM;");
		expect(upsertSettingRow).toHaveBeenCalledWith(
			database,
			"database.lastVacuumDay",
			"2026-10-20",
			Date.now(),
		);
	});

	it("does not mark failed compaction complete and retries on the next open", async () => {
		execAsync
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("vacuum failed"));
		await expect(initializeDatabase()).rejects.toThrow("vacuum failed");
		expect(upsertSettingRow).not.toHaveBeenCalled();
		expect(toast).not.toHaveBeenCalled();
		expect(closeAsync).toHaveBeenCalledOnce();
		await initializeDatabase();
		expect(upsertSettingRow).toHaveBeenCalledOnce();
		expect(toast).toHaveBeenCalledTimes(1);
	});

	it("does not show a success toast when saving the completion marker fails", async () => {
		upsertSettingRow.mockRejectedValueOnce(
			new Error("settings write failed"),
		);
		await expect(initializeDatabase()).rejects.toThrow(
			"settings write failed",
		);
		expect(toast).not.toHaveBeenCalled();
	});

	it("prevents overlapping compaction checks on the same connection", async () => {
		const database =
			(await openDatabaseAsync()) as unknown as SQLiteDatabase;
		getSettingRow.mockImplementationOnce(() => Promise.resolve(null));
		await Promise.all([
			vacuumDatabaseIfNeeded(database),
			vacuumDatabaseIfNeeded(database),
		]);
		expect(getSettingRow).toHaveBeenCalledOnce();
		expect(execAsync).toHaveBeenCalledExactlyOnceWith("VACUUM;");
		expect(upsertSettingRow).toHaveBeenCalledOnce();
	});
});
