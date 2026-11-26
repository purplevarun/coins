import financeConstants from "@/constants/financeConstants";
import SCHEMA_MIGRATIONS, { migrateDatabase } from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import createTestDatabase from "@test/helpers/sqliteTestDatabase";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

describe("migration baseline", () => {
	it("defaults legacy transactions to applicable and preserves exclusions on repeated migration", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec("ALTER TABLE transactions DROP COLUMN is_applicable;");
		const transactionId = randomUUID();
		sqlite
			.prepare(
				"INSERT INTO transactions (id, amount, reason) VALUES (?, '12.50', 'Kept transaction');",
			)
			.run(transactionId);
		await migrateDatabase(database);
		expect(
			sqlite
				.prepare(
					"SELECT id, amount, reason, is_applicable FROM transactions;",
				)
				.all(),
		).toEqual([
			{
				id: transactionId,
				amount: "12.50",
				reason: "Kept transaction",
				is_applicable: 1,
			},
		]);
		sqlite
			.prepare("UPDATE transactions SET is_applicable = 0 WHERE id = ?;")
			.run(transactionId);
		await migrateDatabase(database);
		expect(
			sqlite.prepare("SELECT is_applicable FROM transactions;").get(),
		).toEqual({ is_applicable: 0 });
	});

	it("adds trip_agnostic to legacy categories and preserves flags on repeated migration", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec("ALTER TABLE categories DROP COLUMN trip_agnostic;");
		const categoryId = randomUUID();
		sqlite
			.prepare(
				"INSERT INTO categories (id, name, kind) VALUES (?, 'Kept category', 'EXPENSE');",
			)
			.run(categoryId);
		await migrateDatabase(database);
		expect(
			sqlite.prepare("SELECT id, trip_agnostic FROM categories;").all(),
		).toEqual([{ id: categoryId, trip_agnostic: 0 }]);
		sqlite
			.prepare("UPDATE categories SET trip_agnostic = 1 WHERE id = ?;")
			.run(categoryId);
		await migrateDatabase(database);
		expect(
			sqlite.prepare("SELECT trip_agnostic FROM categories;").get(),
		).toEqual({ trip_agnostic: 1 });
	});

	it("adds investment_id to legacy items and creates its index after the column", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec("DROP INDEX IF EXISTS idx_transaction_items_investment;");
		sqlite.exec("ALTER TABLE transaction_items DROP COLUMN investment_id;");
		await migrateDatabase(database);
		expect(
			sqlite
				.prepare("SELECT * FROM transaction_items LIMIT 0")
				.columns()
				.map((column) => column.name),
		).toContain("investment_id");
		expect(
			sqlite
				.prepare(
					"SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_transaction_items_investment'",
				)
				.get(),
		).toEqual({ name: "idx_transaction_items_investment" });
	});

	it("moves legacy transaction entity columns onto items and drops them", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec(`
			ALTER TABLE transactions ADD COLUMN source_id TEXT;
			ALTER TABLE transactions ADD COLUMN destination_source_id TEXT;
			ALTER TABLE transactions ADD COLUMN category_id TEXT;
			ALTER TABLE transactions ADD COLUMN investment_id TEXT;
			CREATE INDEX idx_transactions_source ON transactions(source_id);
			CREATE INDEX idx_transactions_destination ON transactions(destination_source_id);
			CREATE INDEX idx_transactions_category ON transactions(category_id);
			CREATE INDEX idx_transactions_investment ON transactions(investment_id);
		`);
		const legacyDebit = randomUUID();
		const legacyTransfer = randomUUID();
		const itemized = randomUUID();
		const existingItem = randomUUID();
		sqlite.exec(`
			INSERT INTO transactions (id, classification, type, source_id, category_id, amount, reason)
				VALUES ('${legacyDebit}', 'GENERAL', 'DEBIT', 'bank', 'food', '40', 'Lunch');
			INSERT INTO transactions (id, classification, type, source_id, destination_source_id, amount, to_amount, reason)
				VALUES ('${legacyTransfer}', 'GENERAL', 'TRANSFER', 'bank', 'wallet', '10', '8', 'Move');
			INSERT INTO transactions (id, classification, type, source_id, investment_id, amount, reason)
				VALUES ('${itemized}', 'INVESTMENT', 'DEBIT', 'bank', 'mf', '99', 'Buy');
			INSERT INTO transaction_items (id, transaction_id, investment_id, amount, position)
				VALUES ('${existingItem}', '${itemized}', 'mf', '99', 0);
		`);
		await migrateDatabase(database);

		const items = sqlite
			.prepare(
				`SELECT transaction_id, category_id, investment_id, source_id,
					destination_source_id, amount, to_amount, position
					FROM transaction_items ORDER BY transaction_id;`,
			)
			.all() as Record<string, unknown>[];
		expect(items).toHaveLength(3);
		expect(
			items.find((item) => item.transaction_id === legacyDebit),
		).toMatchObject({
			category_id: "food",
			source_id: "bank",
			amount: "40",
			position: 0,
		});
		expect(
			items.find((item) => item.transaction_id === legacyTransfer),
		).toMatchObject({
			source_id: "bank",
			destination_source_id: "wallet",
			amount: "10",
			to_amount: "8",
			position: 0,
		});
		expect(
			items.find((item) => item.transaction_id === itemized),
		).toMatchObject({
			investment_id: "mf",
			source_id: "bank",
			amount: "99",
			position: 0,
		});

		const transactionColumns = sqlite
			.prepare("SELECT * FROM transactions LIMIT 0")
			.columns()
			.map((column) => column.name);
		expect(transactionColumns).not.toContain("source_id");
		expect(transactionColumns).not.toContain("destination_source_id");
		expect(transactionColumns).not.toContain("category_id");
		expect(transactionColumns).not.toContain("investment_id");
		expect(
			sqlite
				.prepare(
					`SELECT name FROM sqlite_master WHERE type = 'index'
						AND name IN ('idx_transactions_source', 'idx_transactions_destination',
							'idx_transactions_category', 'idx_transactions_investment');`,
				)
				.all(),
		).toEqual([]);
		expect(
			sqlite
				.prepare(
					`SELECT name FROM sqlite_master WHERE type = 'index'
						AND name IN ('idx_transaction_items_source', 'idx_transaction_items_destination');`,
				)
				.all(),
		).toHaveLength(2);
		await migrateDatabase(database);
		expect(
			sqlite
				.prepare("SELECT COUNT(*) AS count FROM transaction_items;")
				.get(),
		).toEqual({ count: 3 });
	});

	it("backfills items from a legacy schema missing optional entity columns", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec("ALTER TABLE transactions ADD COLUMN source_id TEXT;");
		sqlite.exec(`
			INSERT INTO transactions (id, classification, type, source_id, amount, reason)
				VALUES ('t1', 'GENERAL', 'DEBIT', 'bank', '12', 'Old row');
		`);
		await migrateDatabase(database);
		expect(
			sqlite
				.prepare(
					`SELECT transaction_id, category_id, investment_id, source_id,
						destination_source_id, amount, to_amount FROM transaction_items;`,
				)
				.all(),
		).toEqual([
			{
				transaction_id: "t1",
				category_id: null,
				investment_id: null,
				source_id: "bank",
				destination_source_id: null,
				amount: "12",
				to_amount: null,
			},
		]);
		const transactionColumns = sqlite
			.prepare("SELECT * FROM transactions LIMIT 0")
			.columns()
			.map((column) => column.name);
		expect(transactionColumns).not.toContain("source_id");
	});

	it("removes the obsolete daily vacuum marker", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite
			.prepare(
				"INSERT INTO settings (key, value, updated_at) VALUES ('database.lastVacuumDay', '2026-10-19', 1);",
			)
			.run();
		sqlite
			.prepare(
				"INSERT INTO settings (key, value, updated_at) VALUES ('other.key', 'v', 1);",
			)
			.run();
		await migrateDatabase(database);
		expect(
			sqlite.prepare("SELECT key FROM settings ORDER BY key;").all(),
		).toEqual([{ key: "other.key" }]);
	});

	it("normalizes missing applicability on fresh schemas without SQL defaults", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite
			.prepare("INSERT INTO transactions (id) VALUES (?);")
			.run(randomUUID());
		await migrateDatabase(database);
		expect(
			sqlite.prepare("SELECT is_applicable FROM transactions;").get(),
		).toEqual({ is_applicable: 1 });
	});

	it("drops legacy password website and notes columns while preserving rows", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec("ALTER TABLE passwords ADD COLUMN website TEXT;");
		sqlite.exec("ALTER TABLE passwords ADD COLUMN notes TEXT;");
		sqlite.exec("ALTER TABLE passwords ADD COLUMN last_password TEXT;");
		const passwordId = randomUUID();
		sqlite
			.prepare(
				"INSERT INTO passwords (id, title, username, password, website, notes, created_at, updated_at) VALUES (?, 'Github', 'u', 'p', 'w', 'n', 1, 2);",
			)
			.run(passwordId);
		await migrateDatabase(database);
		expect(
			sqlite
				.prepare(
					"SELECT id, title, username, password, created_at, updated_at FROM passwords;",
				)
				.all(),
		).toEqual([
			{
				id: passwordId,
				title: "Github",
				username: "u",
				password: "p",
				created_at: 1,
				updated_at: 2,
			},
		]);
		const passwordColumns = sqlite
			.prepare("SELECT * FROM passwords LIMIT 0")
			.columns()
			.map((column) => column.name);
		expect(passwordColumns).not.toContain("website");
		expect(passwordColumns).not.toContain("notes");
		expect(passwordColumns).not.toContain("last_password");
	});

	it("drops legacy todos, notes, folders and identities tables", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec(`
			CREATE TABLE todos (id TEXT, title TEXT);
			CREATE TABLE notes (id TEXT, title TEXT);
			CREATE TABLE folders (id TEXT, name TEXT);
			CREATE TABLE identities (id TEXT, title TEXT, notes TEXT);
		`);
		await migrateDatabase(database);
		expect(
			sqlite
				.prepare(
					"SELECT name FROM sqlite_master WHERE name IN ('todos', 'notes', 'folders', 'identities')",
				)
				.all(),
		).toEqual([]);
	});

	it("drops legacy cards notes column while preserving rows", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec("ALTER TABLE cards ADD COLUMN notes TEXT;");
		const cardId = randomUUID();
		sqlite
			.prepare(
				"INSERT INTO cards (id, name, card_number, notes, created_at, updated_at) VALUES (?, 'Visa', '1234', 'n', 1, 2);",
			)
			.run(cardId);
		await migrateDatabase(database);
		expect(
			sqlite
				.prepare(
					"SELECT id, name, card_number, created_at, updated_at FROM cards;",
				)
				.all(),
		).toEqual([
			{
				id: cardId,
				name: "Visa",
				card_number: "1234",
				created_at: 1,
				updated_at: 2,
			},
		]);
		expect(
			sqlite
				.prepare("SELECT * FROM cards LIMIT 0")
				.columns()
				.map((column) => column.name),
		).not.toContain("notes");
	});

	it("finalizes metadata statements and propagates migration failures", async () => {
		const { database } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		const finalizeAsync = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(database, "prepareAsync").mockResolvedValueOnce({
			getColumnNamesAsync: vi
				.fn()
				.mockRejectedValue(new Error("metadata failed")),
			finalizeAsync,
		} as any);
		await expect(migrateDatabase(database)).rejects.toThrow(
			"metadata failed",
		);
		expect(finalizeAsync).toHaveBeenCalledOnce();
	});

	it("removes legacy attachment data and its index without changing records", async () => {
		const { database, sqlite } = createTestDatabase();
		await database.execAsync(SCHEMA_SQL);
		sqlite.exec(`
			CREATE TABLE attachments (id TEXT, owner_type TEXT, owner_id TEXT, content BLOB);
			CREATE INDEX idx_attachments_owner ON attachments(owner_type, owner_id);
		`);
		sqlite
			.prepare("INSERT INTO attachments (id, content) VALUES (?, ?)")
			.run(randomUUID(), new Uint8Array([1, 2, 3]));
		const categoryId = randomUUID();
		sqlite
			.prepare(
				"INSERT INTO categories (id, name, kind) VALUES (?, 'Kept category', 'EXPENSE')",
			)
			.run(categoryId);
		for (const migration of SCHEMA_MIGRATIONS)
			await database.execAsync(migration);
		for (const migration of SCHEMA_MIGRATIONS)
			await database.execAsync(migration);
		expect(
			sqlite
				.prepare(
					"SELECT name FROM sqlite_master WHERE name IN ('attachments', 'idx_attachments_owner')",
				)
				.all(),
		).toEqual([]);
		expect(
			sqlite.prepare("SELECT id, name, kind FROM categories").all(),
		).toEqual([{ id: categoryId, name: "Kept category", kind: "EXPENSE" }]);
		expect(SCHEMA_MIGRATIONS.join("\n")).not.toContain("PRAGMA");
		await database.closeAsync();
	});

	it.each(financeConstants.CATEGORY_KINDS)(
		"creates the final schema and preserves %s categories on repeated startup",
		async (kind) => {
			const { database, sqlite } = createTestDatabase();
			await database.execAsync(SCHEMA_SQL);
			const categoryId = randomUUID();
			sqlite
				.prepare(
					"INSERT INTO categories (id, name, kind, created_at, updated_at) VALUES (?, 'Baseline category', ?, 1, 1);",
				)
				.run(categoryId, kind);
			const originalSchema = sqlite
				.prepare(
					"SELECT name, rootpage, sql FROM sqlite_master ORDER BY name",
				)
				.all();
			await database.execAsync(SCHEMA_SQL);
			expect(
				sqlite
					.prepare("SELECT id, kind FROM categories WHERE id = ?")
					.get(categoryId),
			).toEqual({ id: categoryId, kind });
			expect(
				sqlite
					.prepare(
						"SELECT name, rootpage, sql FROM sqlite_master ORDER BY name",
					)
					.all(),
			).toEqual(originalSchema);
			expect(
				sqlite
					.prepare("SELECT * FROM categories LIMIT 0")
					.columns()
					.map((column) => column.name),
			).not.toContain("is_income");
			expect(
				sqlite
					.prepare("SELECT trip_type_id FROM trips LIMIT 0")
					.columns(),
			).toHaveLength(1);
			expect(
				sqlite
					.prepare("SELECT platform_id FROM investments LIMIT 0")
					.columns(),
			).toHaveLength(1);
			expect(
				sqlite
					.prepare(
						"SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_investments_platform'",
					)
					.get(),
			).toEqual({ name: "idx_investments_platform" });
			await database.closeAsync();
		},
	);
});
