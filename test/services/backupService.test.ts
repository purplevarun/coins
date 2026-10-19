import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import type TestCallback from "@test/types/TestCallback";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getDocumentAsync: vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue({ canceled: true }),
	isAvailableAsync: vi.fn(async () => true),
	shareAsync: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
	openDatabaseAsync: vi.fn(),
	fileBytes: vi.fn(async () => new Uint8Array([1, 2, 3])),
	fileCreate: vi.fn<TestCallback>().mockReturnValue(undefined),
	fileWrite: vi.fn<TestCallback>().mockReturnValue(undefined),
	fileDelete: vi.fn<TestCallback>().mockReturnValue(undefined),
	tempFileStartsExisting: true,
	tempFileExistsAfterCreate: true,
	cachedFileExists: true,
}));

vi.mock("@/constants/appConstants", () => ({
	default: {
		APP_NAME: "Purplecoins",
		BACKUP_EXTENSION: ".pc",
		BACKUP_MIME_TYPE: "application/x-sqlite3",
		LEGACY_BACKUP_EXTENSION: ".purplecoins",
	},
}));

vi.mock("@/database/migrations", () => ({
	default: ["FUTURE_MIGRATION_SQL"],
}));

vi.mock("@/database/schema", () => ({
	default: "SCHEMA_SQL",
}));

vi.mock("expo-document-picker", () => ({
	getDocumentAsync: mocks.getDocumentAsync,
}));

vi.mock("expo-sharing", () => ({
	isAvailableAsync: mocks.isAvailableAsync,
	shareAsync: mocks.shareAsync,
}));

vi.mock("expo-sqlite", () => ({
	openDatabaseAsync: mocks.openDatabaseAsync,
}));

vi.mock("expo-file-system", () => {
	class MockFile {
		uri: string;
		exists = false;

		constructor(baseOrUri: unknown, name?: string) {
			this.uri = name
				? `${String(baseOrUri).replace("[object Object]", "doc-dir")}/${name}`
				: String(baseOrUri);
			if (this.uri.includes("restore-temp.db")) {
				this.exists = mocks.tempFileStartsExisting;
			}
			if (this.uri.startsWith("cache-dir/"))
				this.exists = mocks.cachedFileExists;
		}

		async bytes(): Promise<Uint8Array> {
			return mocks.fileBytes();
		}

		create(): void {
			this.exists = mocks.tempFileExistsAfterCreate;
			mocks.fileCreate();
		}

		write(content: Uint8Array): void {
			mocks.fileWrite(content);
		}

		delete(): void {
			this.exists = false;
			mocks.fileDelete();
		}
	}

	return {
		File: MockFile,
		Paths: {
			cache: { uri: "cache-dir/", toString: () => "cache-dir" },
			document: "doc-dir",
		},
	};
});

import backupService from "@/services/backupService";

const database = {
	getFirstAsync: vi.fn(async () => ({ integrity: "ok" })),
	getAllAsync: vi.fn<TestAsyncFunction>(),
	serializeAsync: vi.fn(async () => new Uint8Array([5, 6])),
	execAsync: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
	withTransactionAsync: vi.fn(async (callback: () => Promise<void>) =>
		callback(),
	),
} as any;

const validTempDatabase = (): any => ({
	closeAsync: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
	getAllAsync: vi
		.fn<TestAsyncFunction>()
		.mockResolvedValue([
			{ name: "transactions" },
			{ name: "categories" },
			{ name: "restore_only" },
		]),
	getFirstAsync: vi.fn(async () => ({ count: 4 })),
	execAsync: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
});

const selectBackup = (name = "ok.pc"): void => {
	mocks.getDocumentAsync.mockResolvedValueOnce({
		canceled: false,
		assets: [{ uri: `file://${name}`, name }],
	});
};

describe("backupService", () => {
	it.each([
		new Error("disk failure"),
		"native failure",
		new Error("duplicate column name: platform_id"),
		new Error("no such column: kind"),
	])(
		"rejects restore migration errors without changing live data: %s",
		async (error) => {
			selectBackup();
			const temp = validTempDatabase();
			temp.execAsync
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(error);
			mocks.openDatabaseAsync.mockResolvedValueOnce(temp);
			await expect(backupService.restoreBackup(database)).rejects.toBe(
				error,
			);
			expect(database.execAsync).not.toHaveBeenCalled();
			expect(database.withTransactionAsync).not.toHaveBeenCalled();
			expect(temp.closeAsync).toHaveBeenCalledOnce();
		},
	);
	beforeEach(() => {
		Object.values(mocks).forEach((mockFn) => {
			if (typeof mockFn === "function" && "mockReset" in mockFn) {
				mockFn.mockReset();
			}
		});
		mocks.getDocumentAsync.mockResolvedValue({ canceled: true });
		mocks.isAvailableAsync.mockResolvedValue(true);
		mocks.shareAsync.mockResolvedValue(undefined);
		mocks.fileBytes.mockResolvedValue(new Uint8Array([1, 2, 3]));
		database.getFirstAsync.mockReset();
		database.getFirstAsync.mockResolvedValue({ integrity: "ok" });
		database.serializeAsync.mockReset();
		database.serializeAsync.mockResolvedValue(new Uint8Array([5, 6]));
		database.execAsync.mockReset();
		database.execAsync.mockResolvedValue(undefined);
		database.getAllAsync.mockReset();
		database.getAllAsync.mockImplementation(async (sql: string) => {
			if (sql.includes("sqlite_master")) {
				return [{ name: "transactions" }, { name: "categories" }];
			}
			if (sql.includes("'categories'")) {
				return [{ name: "id" }];
			}
			return sql.includes("'restore_source'")
				? [{ name: "id" }, { name: "amount" }, { name: "label" }]
				: [{ name: "id" }, { name: "amount" }];
		});
		database.withTransactionAsync.mockClear();
		mocks.tempFileStartsExisting = true;
		mocks.tempFileExistsAfterCreate = true;
		mocks.cachedFileExists = true;
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-25T10:00:00.000Z"));
	});

	it("exports a raw SQLite backup", async () => {
		await backupService.exportBackup(database);
		expect(database.serializeAsync).toHaveBeenCalledOnce();
		expect(mocks.fileWrite).toHaveBeenCalledWith(new Uint8Array([5, 6]));
		expect(mocks.shareAsync).toHaveBeenCalledWith(
			"cache-dir/purplecoins-2026-08-25.pc",
			expect.objectContaining({
				dialogTitle: "Export Purplecoins backup",
				mimeType: "application/x-sqlite3",
			}),
		);
	});

	it("rejects invalid exports and canceled restores", async () => {
		database.getFirstAsync.mockResolvedValueOnce({ integrity: "corrupt" });
		await expect(
			backupService.exportBackup(database),
		).rejects.toMatchObject({
			code: "DATABASE_INTEGRITY_FAILED",
		});
		database.getFirstAsync.mockResolvedValueOnce({ integrity: "ok" });
		mocks.isAvailableAsync.mockResolvedValueOnce(false);
		await expect(
			backupService.exportBackup(database),
		).rejects.toMatchObject({
			code: "SHARING_UNAVAILABLE",
		});
		expect(await backupService.restoreBackup(database)).toBe(false);
	});

	it("validates a selected backup extension and database shape", async () => {
		mocks.getDocumentAsync.mockResolvedValueOnce({
			canceled: false,
			assets: [],
		});
		await expect(
			backupService.restoreBackup(database),
		).rejects.toMatchObject({
			code: "BACKUP_NOT_SELECTED",
		});
		selectBackup("bad.txt");
		await expect(
			backupService.restoreBackup(database),
		).rejects.toMatchObject({
			code: "INVALID_BACKUP_EXTENSION",
		});
		const tempDatabase = {
			...validTempDatabase(),
			getFirstAsync: vi.fn(async () => ({ count: 0 })),
		};
		mocks.openDatabaseAsync.mockResolvedValueOnce(tempDatabase);
		selectBackup();
		await expect(
			backupService.restoreBackup(database),
		).rejects.toMatchObject({
			code: "INVALID_BACKUP_DATABASE",
		});
		expect(database.execAsync).not.toHaveBeenCalled();
	});

	it.each(["ok.pc", "OK.PURPLECOINS"])(
		"accepts raw SQLite backup %s",
		async (name) => {
			const tempDatabase = validTempDatabase();
			mocks.openDatabaseAsync.mockResolvedValueOnce(tempDatabase);
			selectBackup(name);
			expect(await backupService.restoreBackup(database)).toBe(true);
		},
	);

	it.each([true, false])(
		"removes only existing app-owned import copies: exists=%s",
		async (exists) => {
			mocks.cachedFileExists = exists;
			mocks.openDatabaseAsync.mockResolvedValueOnce(validTempDatabase());
			mocks.getDocumentAsync.mockResolvedValueOnce({
				canceled: false,
				assets: [{ uri: "cache-dir/import.pc", name: "import.pc" }],
			});
			expect(await backupService.restoreBackup(database)).toBe(true);
			expect(mocks.fileDelete).toHaveBeenCalledTimes(exists ? 3 : 2);
		},
	);

	it("runs schema and future migrations before restoring a valid backup", async () => {
		const tempDatabase = validTempDatabase();
		mocks.openDatabaseAsync.mockResolvedValueOnce(tempDatabase);
		selectBackup();
		expect(await backupService.restoreBackup(database)).toBe(true);
		expect(tempDatabase.execAsync).toHaveBeenNthCalledWith(1, "SCHEMA_SQL");
		expect(tempDatabase.execAsync).toHaveBeenNthCalledWith(
			2,
			"FUTURE_MIGRATION_SQL",
		);
		expect(database.execAsync).toHaveBeenCalledWith(
			"ATTACH DATABASE 'doc-dir/restore-temp.db' AS restore_source;",
		);
		expect(database.withTransactionAsync).toHaveBeenCalledOnce();
		expect(database.execAsync).toHaveBeenCalledWith(
			'DELETE FROM main."transactions"; INSERT INTO main."transactions" ("id", "amount") SELECT "id", "amount" FROM restore_source."transactions";',
		);
		expect(database.execAsync).not.toHaveBeenCalledWith(
			expect.stringContaining('"restore_only"'),
		);
		expect(database.execAsync).toHaveBeenCalledWith(
			'DELETE FROM main."categories"; INSERT INTO main."categories" ("id") SELECT "id" FROM restore_source."categories";',
		);
		expect(database.execAsync).toHaveBeenCalledWith(
			"DETACH DATABASE restore_source;",
		);
		expect(database.execAsync).toHaveBeenCalledWith(
			"PRAGMA wal_checkpoint(TRUNCATE);",
		);
		expect(tempDatabase.closeAsync).toHaveBeenCalledOnce();
		expect(mocks.fileDelete).toHaveBeenCalled();
	});

	it("keeps live data untouched when schema or migration SQL fails", async () => {
		const tempDatabase = validTempDatabase();
		tempDatabase.execAsync.mockRejectedValueOnce(
			new Error("schema failed"),
		);
		mocks.openDatabaseAsync.mockResolvedValueOnce(tempDatabase);
		selectBackup();
		await expect(backupService.restoreBackup(database)).rejects.toThrow(
			"schema failed",
		);
		expect(database.execAsync).not.toHaveBeenCalled();
		expect(tempDatabase.closeAsync).toHaveBeenCalledOnce();
	});

	it("detaches the restore source when the table copy fails", async () => {
		const tempDatabase = validTempDatabase();
		mocks.openDatabaseAsync.mockResolvedValueOnce(tempDatabase);
		selectBackup();
		database.execAsync
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("copy failed"));
		await expect(backupService.restoreBackup(database)).rejects.toThrow(
			"copy failed",
		);
		expect(database.execAsync).toHaveBeenCalledWith(
			"DETACH DATABASE restore_source;",
		);
	});

	it("cleans up conditionally when the temporary file was not created", async () => {
		mocks.tempFileStartsExisting = false;
		mocks.tempFileExistsAfterCreate = false;
		const tempDatabase = validTempDatabase();
		mocks.openDatabaseAsync.mockResolvedValueOnce(tempDatabase);
		selectBackup();
		expect(await backupService.restoreBackup(database)).toBe(true);
		expect(mocks.fileDelete).not.toHaveBeenCalled();
	});
});
