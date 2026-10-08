import type SqliteTableRow from "@/types/SqliteTableRow";
import createTestDatabase from "@test/helpers/sqliteTestDatabase";
import { gunzipSync, gzipSync } from "fflate";
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
			get document(): string {
				return native.directoryUri;
			},
		},
	};
});

import SCHEMA_MIGRATIONS, {
	isIdempotentMigrationError,
} from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import financeRepository from "@/repositories/financeRepository";
import analysisService from "@/services/analysisService";
import backupService from "@/services/backupService";
import sourceService from "@/services/sourceService";
import transactionService from "@/services/transactionService";

const initializeFixture = async (
	path?: string,
): Promise<ReturnType<typeof createTestDatabase>> => {
	const fixture = createTestDatabase(path);
	await fixture.database.execAsync(SCHEMA_SQL);
	for (const migration of SCHEMA_MIGRATIONS) {
		try {
			await fixture.database.execAsync(migration);
		} catch (error) {
			if (!isIdempotentMigrationError(error)) throw error;
		}
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
	await transactionService.saveTransaction(
		fixture.database,
		{
			classification: "GENERAL",
			type: "DEBIT",
			sourceId,
			amount: "0",
			reason: "Fixture expense",
			transactionAt: new Date(2026, 0, 15).getTime(),
			items: [{ categoryId, amount }],
		},
		{
			fileName: "receipt.txt",
			mimeType: "text/plain",
			sizeBytes: 3,
			content: new Uint8Array([1, 2, 3]),
		},
	);
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
		const validBytes = gzipSync(readFileSync(path));
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
				gzipSync(readFileSync(path)),
			);
		}
	});

	it.each([
		{ populated: false, compressed: false },
		{ populated: true, compressed: false },
		{ populated: false, compressed: true },
		{ populated: true, compressed: true },
	])(
		"restores populated=$populated compressed=$compressed databases atomically",
		async ({ populated, compressed }) => {
			const directory = setupRestore();
			const path = join(directory, "fixture.db");
			const backup = await initializeFixture(path);
			if (populated) await addExpense(backup, "100000000000.01");
			await backup.database.closeAsync();
			const pickedPath = join(directory, "fixture.pc");
			const bytes = readFileSync(path);
			writeFileSync(pickedPath, compressed ? gzipSync(bytes) : bytes);
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
				live.sqlite.prepare("SELECT content FROM attachments;").all(),
			).toEqual(
				populated ? [{ content: new Uint8Array([1, 2, 3]) }] : [],
			);
			expect(
				existsSync(join(directory, "SQLite", "restore-temp.db")),
			).toBe(false);
		},
	);

	it.each(["amount", "notes"])(
		"rejects a missing %s without changing live rows",
		async (missing) => {
			const directory = setupRestore();
			const path = join(directory, "fixture.pc");
			const backup = await initializeFixture(path);
			await addExpense(backup, "200");
			backup.sqlite.exec(
				missing === "amount"
					? "ALTER TABLE transactions DROP COLUMN amount;"
					: "DROP TABLE notes;",
			);
			await backup.database.closeAsync();
			const live = await initializeFixture();
			await addExpense(live, "50");
			const original = live.sqlite
				.prepare("SELECT * FROM transactions;")
				.all();
			const attachments = live.sqlite
				.prepare("SELECT * FROM attachments;")
				.all();
			selectBackup(path);
			await expect(
				backupService.restoreBackup(live.database),
			).rejects.toMatchObject({ code: "INVALID_BACKUP_DATABASE" });
			expect(
				live.sqlite.prepare("SELECT * FROM transactions;").all(),
			).toEqual(original);
			expect(
				live.sqlite.prepare("SELECT * FROM attachments;").all(),
			).toEqual(attachments);
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
			writeFileSync(
				referencePath,
				originalBytes[0] === 0x1f && originalBytes[1] === 0x8b
					? gunzipSync(originalBytes)
					: originalBytes,
			);
			const reference = await initializeFixture(referencePath);
			const live = await initializeFixture();
			selectBackup(pickedPath);
			expect(await backupService.restoreBackup(live.database)).toBe(true);
			const tables = await live.database.getAllAsync<SqliteTableRow>(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';",
			);
			for (const { name } of tables) {
				const query = `SELECT COUNT(*) AS count FROM "${name.replace(/"/g, '""')}";`;
				expect(live.sqlite.prepare(query).get()).toEqual(
					reference.sqlite.prepare(query).get(),
				);
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
