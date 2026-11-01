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
		expect(
			sqlite
				.prepare("SELECT * FROM passwords LIMIT 0")
				.columns()
				.map((column) => column.name),
		).not.toContain("website");
	});

	it("finalizes metadata statements and propagates migration failures", async () => {
		const { database } = createTestDatabase();
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
