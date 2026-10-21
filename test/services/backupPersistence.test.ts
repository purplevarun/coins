import type SqliteTableRow from "@/types/SqliteTableRow";
import createTestDatabase from "@test/helpers/sqliteTestDatabase";
import { createHash, randomUUID } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

const native = vi.hoisted(() => ({
	getDocumentAsync: vi.fn(),
	openDatabaseAsync: vi.fn(),
	directoryUri: "",
}));

vi.mock("@/utils/id", () => ({ default: () => randomUUID() }));
vi.mock("expo-document-picker", () => ({
	getDocumentAsync: native.getDocumentAsync,
}));
vi.mock("expo-sqlite", () => ({ openDatabaseAsync: native.openDatabaseAsync }));
vi.mock("expo-sharing", () => ({}));
vi.mock("expo-file-system", () => {
	class MockFile {
		uri: string;
		constructor(base: string | MockFile, ...segments: string[]) {
			this.uri = [
				typeof base === "string" ? base : base.uri,
				...segments,
			].join("/");
		}
		get exists(): boolean {
			return existsSync(fileURLToPath(this.uri));
		}
		create(): void {
			writeFileSync(fileURLToPath(this.uri), new Uint8Array());
		}
		write(content: Uint8Array): void {
			writeFileSync(fileURLToPath(this.uri), content);
		}
		bytes(): Promise<Uint8Array> {
			return Promise.resolve(readFileSync(fileURLToPath(this.uri)));
		}
		delete(): void {
			rmSync(fileURLToPath(this.uri));
		}
	}
	return {
		File: MockFile,
		Paths: {
			cache: { uri: "file:///purplecoins-test-cache/" },
			get document(): string {
				return native.directoryUri;
			},
		},
	};
});

import themeConstants from "@/constants/themeConstants";
import SCHEMA_MIGRATIONS from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import financeRepository from "@/repositories/financeRepository";
import analysisService from "@/services/analysisService";
import backupService from "@/services/backupService";
import settingsService from "@/services/settingsService";
import sourceService from "@/services/sourceService";
import transactionService from "@/services/transactionService";

const initializeFixture = async (
	path?: string,
): Promise<ReturnType<typeof createTestDatabase>> => {
	const fixture = createTestDatabase(path);
	await fixture.database.execAsync(SCHEMA_SQL);
	for (const migration of SCHEMA_MIGRATIONS) {
		await fixture.database.execAsync(migration);
	}
	return fixture;
};

const addExpense = async (
	fixture: ReturnType<typeof createTestDatabase>,
	amount: string,
): Promise<void> => {
	const sourceId = await sourceService.createSource(
		fixture.database,
		"Fixture bank",
		"INR",
	);
	const categoryId = randomUUID();
	fixture.sqlite
		.prepare(
			"INSERT INTO categories (id, name, kind, created_at, updated_at) VALUES (?, 'Fixture category', 'EXPENSE', 1, 1);",
		)
		.run(categoryId);
	await transactionService.saveTransaction(fixture.database, {
		classification: "GENERAL",
		type: "DEBIT",
		sourceId,
		amount: "0",
		reason: "Fixture expense",
		transactionAt: new Date(2026, 0, 15).getTime(),
		items: [{ categoryId, amount }],
	});
};

const setupRestore = (): string => {
	const directory = mkdtempSync(join(tmpdir(), "purplecoins-restore-test-"));
	onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
	mkdirSync(join(directory, "SQLite"));
	native.directoryUri = pathToFileURL(directory).href;
	native.openDatabaseAsync.mockImplementation(
		async (name: string) =>
			createTestDatabase(join(directory, "SQLite", name)).database,
	);
	return directory;
};

const selectBackup = (path: string): void => {
	native.getDocumentAsync.mockResolvedValueOnce({
		canceled: false,
		assets: [{ uri: pathToFileURL(path).href, name: "fixture.pc" }],
	});
};

describe("real SQLite backup restore", () => {
	beforeEach(() => {
		native.getDocumentAsync.mockReset();
		native.openDatabaseAsync.mockReset();
	});

	it.each(themeConstants.THEME_OPTIONS)(
		"persists $label across reopen and restore",
		async ({ value }) => {
			const directory = setupRestore();
			const path = join(directory, "theme.pc");
			const fixture = await initializeFixture(path);
			expect(await settingsService.getThemeId(fixture.database)).toBe(
				themeConstants.DEFAULT_THEME_ID,
			);
			await settingsService.updateThemeId(fixture.database, value);
			await fixture.database.closeAsync();
			const reopened = createTestDatabase(path);
			expect(await settingsService.getThemeId(reopened.database)).toBe(
				value,
			);
			expect(
				reopened.sqlite
					.prepare(
						"SELECT COUNT(*) AS count FROM settings WHERE key = ?;",
					)
					.get(themeConstants.THEME_SETTING_KEY),
			).toEqual({ count: 1 });
			await reopened.database.closeAsync();
			const original = readFileSync(path);
			const live = await initializeFixture();
			await settingsService.updateThemeId(
				live.database,
				themeConstants.THEME_IDS.GRAPHITE_MINT,
			);
			selectBackup(path);
			expect(await backupService.restoreBackup(live.database)).toBe(true);
			expect(await settingsService.getThemeId(live.database)).toBe(value);
			expect(readFileSync(path)).toEqual(original);
		},
	);

	it("defaults older restored backups to purple without duplicating the theme row", async () => {
		const directory = setupRestore();
		const path = join(directory, "older.pc");
		const fixture = await initializeFixture(path);
		await fixture.database.closeAsync();
		const live = await initializeFixture();
		await settingsService.updateThemeId(
			live.database,
			themeConstants.THEME_IDS.GRAPHITE_MINT,
		);
		selectBackup(path);
		expect(await backupService.restoreBackup(live.database)).toBe(true);
		expect(await settingsService.getThemeId(live.database)).toBe(
			themeConstants.DEFAULT_THEME_ID,
		);
		expect(await settingsService.getThemeId(live.database)).toBe(
			themeConstants.DEFAULT_THEME_ID,
		);
		expect(
			live.sqlite
				.prepare(
					"SELECT COUNT(*) AS count FROM settings WHERE key = ?;",
				)
				.get(themeConstants.THEME_SETTING_KEY),
		).toEqual({ count: 1 });
	});

	it("restores a mixed-currency and financial-year regression fixture exactly", async () => {
		const directory = setupRestore();
		const path = join(directory, "regression.db");
		const fixture = await initializeFixture(path);
		await addExpense(fixture, "100000000000.01");
		const [bank] = await sourceService.getSources(fixture.database);
		if (!bank) throw new Error("Missing fixture bank");
		const dollarSource = await sourceService.createSource(
			fixture.database,
			"Fixture dollar",
			"USD",
		);
		const categoryId = randomUUID();
		fixture.sqlite
			.prepare(
				"INSERT INTO categories (id, name, kind, created_at, updated_at) VALUES (?, 'Fixture salary', 'INCOME', 1, 1);",
			)
			.run(categoryId);
		for (const sourceId of [bank.id, dollarSource]) {
			await transactionService.saveTransaction(fixture.database, {
				classification: "GENERAL",
				type: "CREDIT",
				sourceId,
				categoryId,
				amount: "100",
				reason: "Fixture income",
				transactionAt: new Date(2026, 9, 7).getTime(),
			});
		}
		await financeRepository.upsertExchangeRateRow(fixture.database, {
			currencyCode: "USD",
			rateToInr: "83",
			source: "MANUAL",
			fetchedAt: null,
			updatedAt: 1,
		});
		await fixture.database.closeAsync();
		const validBytes = readFileSync(path);
		const pickedPath = join(directory, "fixture.pc");
		writeFileSync(pickedPath, validBytes);
		const live = await initializeFixture();
		selectBackup(pickedPath);
		expect(await backupService.restoreBackup(live.database)).toBe(true);
		expect(
			await analysisService.getAnalysisSummary(live.database, {
				dateRange: { start: 0, end: Number.MAX_SAFE_INTEGER },
				isNativeCurrency: false,
			}),
		).toMatchObject({
			totalIncome: "8400",
			totalExpense: "100000000000.01",
			netProfit: "-99999991600.01",
		});
		const invalid = createTestDatabase(path);
		invalid.sqlite.exec("ALTER TABLE transactions DROP COLUMN amount;");
		await invalid.database.closeAsync();
		const outputDirectory = process.env.PURPLECOINS_TEST_ARTIFACTS;
		if (outputDirectory) {
			mkdirSync(outputDirectory, { recursive: true });
			writeFileSync(
				join(outputDirectory, "regression-valid.pc"),
				validBytes,
			);
			writeFileSync(
				join(outputDirectory, "regression-invalid.pc"),
				readFileSync(path),
			);
		}
	});

	it.each([false, true])(
		"restores populated=%s raw databases atomically",
		async (populated) => {
			const directory = setupRestore();
			const path = join(directory, "fixture.db");
			const backup = await initializeFixture(path);
			if (populated) await addExpense(backup, "100000000000.01");
			await backup.database.closeAsync();
			const pickedPath = join(directory, "fixture.pc");
			const bytes = readFileSync(path);
			writeFileSync(pickedPath, bytes);
			const live = await initializeFixture();
			await addExpense(live, "50");
			selectBackup(pickedPath);
			expect(await backupService.restoreBackup(live.database)).toBe(true);
			const summary = await analysisService.getAnalysisSummary(
				live.database,
				{
					dateRange: { start: 0, end: Number.MAX_SAFE_INTEGER },
					isNativeCurrency: true,
				},
			);
			expect(summary.totalExpense).toBe(
				populated ? "100000000000.01" : "0",
			);
			expect(
				live.sqlite
					.prepare("SELECT COUNT(*) AS count FROM transactions;")
					.get(),
			).toEqual({ count: populated ? 1 : 0 });
			expect(
				live.sqlite
					.prepare(
						"SELECT name FROM sqlite_master WHERE name = 'attachments'",
					)
					.all(),
			).toEqual([]);
			expect(
				existsSync(join(directory, "SQLite", "restore-temp.db")),
			).toBe(false);
		},
	);

	it.each([
		["transactions", "amount"],
		["categories", "kind"],
		["trips", "trip_type_id"],
	])(
		"rejects missing %s.%s without replacing live data",
		async (table, column) => {
			const directory = setupRestore();
			const path = join(directory, "fixture.pc");
			const backup = await initializeFixture(path);
			await addExpense(backup, "200");
			backup.sqlite.exec(
				`ALTER TABLE "${table}" DROP COLUMN "${column}";`,
			);
			await backup.database.closeAsync();
			const live = await initializeFixture();
			await addExpense(live, "50");
			const originalSources = live.sqlite
				.prepare("SELECT * FROM sources;")
				.all();
			const originalTransactions = live.sqlite
				.prepare("SELECT * FROM transactions;")
				.all();
			const originalCategories = live.sqlite
				.prepare("SELECT * FROM categories;")
				.all();
			selectBackup(path);
			await expect(
				backupService.restoreBackup(live.database),
			).rejects.toMatchObject({
				code: "INVALID_BACKUP_DATABASE",
			});
			expect(live.sqlite.prepare("SELECT * FROM sources;").all()).toEqual(
				originalSources,
			);
			expect(
				live.sqlite.prepare("SELECT * FROM transactions;").all(),
			).toEqual(originalTransactions);
			expect(
				live.sqlite.prepare("SELECT * FROM categories;").all(),
			).toEqual(originalCategories);
		},
	);

	it("rolls back the entire replacement if a later table copy fails", async () => {
		const directory = setupRestore();
		const path = join(directory, "fixture.pc");
		const backup = await initializeFixture(path);
		await addExpense(backup, "200");
		await backup.database.closeAsync();
		const live = await initializeFixture();
		await addExpense(live, "50");
		const sources = live.sqlite.prepare("SELECT * FROM sources;").all();
		const original = live.sqlite
			.prepare("SELECT * FROM transactions;")
			.all();
		live.sqlite.exec(
			"CREATE TRIGGER reject_restore BEFORE INSERT ON transactions BEGIN SELECT RAISE(ABORT, 'restore write failed'); END;",
		);
		selectBackup(path);
		await expect(
			backupService.restoreBackup(live.database),
		).rejects.toThrow("restore write failed");
		expect(live.sqlite.prepare("SELECT * FROM sources;").all()).toEqual(
			sources,
		);
		expect(
			live.sqlite.prepare("SELECT * FROM transactions;").all(),
		).toEqual(original);
		expect(() =>
			live.sqlite.prepare("SELECT * FROM restore_source.transactions;"),
		).toThrow();
	});

	it.skipIf(!process.env.PURPLECOINS_TEST_BACKUP)(
		"restores the supplied backup and preserves its original bytes",
		async () => {
			const directory = setupRestore();
			const originalPath = process.env.PURPLECOINS_TEST_BACKUP ?? "";
			const originalBytes = readFileSync(originalPath);
			const originalHash = createHash("sha256")
				.update(originalBytes)
				.digest("hex");
			const pickedPath = join(directory, "fixture.pc");
			writeFileSync(pickedPath, originalBytes);
			const referencePath = join(directory, "reference.db");
			writeFileSync(referencePath, originalBytes);
			const reference = createTestDatabase(referencePath);
			const upgraded = await initializeFixture(pickedPath);
			expect(
				upgraded.sqlite
					.prepare(
						"SELECT name FROM sqlite_master WHERE name IN ('attachments', 'idx_attachments_owner')",
					)
					.all(),
			).toEqual([]);
			await upgraded.database.closeAsync();
			writeFileSync(pickedPath, originalBytes);
			const live = await initializeFixture();
			selectBackup(pickedPath);
			expect(await backupService.restoreBackup(live.database)).toBe(true);
			const tables = await live.database.getAllAsync<SqliteTableRow>(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';",
			);
			expect(tables.map(({ name }) => name)).not.toContain("attachments");
			for (const { name } of tables) {
				const quotedTable = `"${name.replace(/"/g, '""')}"`;
				const columns = live.sqlite
					.prepare(`SELECT * FROM ${quotedTable} LIMIT 0`)
					.columns()
					.map((column) => `"${column.name.replace(/"/g, '""')}"`)
					.join(", ");
				const query = `SELECT ${columns} FROM ${quotedTable} ORDER BY ${columns};`;
				const hashes = [live, reference].map(({ sqlite }) =>
					createHash("sha256")
						.update(JSON.stringify(sqlite.prepare(query).all()))
						.digest("hex"),
				);
				expect(hashes[0], `Restored ${name} content`).toBe(hashes[1]);
			}
			const summary = await analysisService.getAnalysisSummary(
				live.database,
				{
					dateRange: { start: 0, end: Number.MAX_SAFE_INTEGER },
					isNativeCurrency: false,
				},
			);
			expect(typeof summary.totalExpense).toBe("string");
			expect(
				createHash("sha256")
					.update(readFileSync(originalPath))
					.digest("hex"),
			).toBe(originalHash);
		},
	);
});
