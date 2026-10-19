import financeConstants from "@/constants/financeConstants";
import SCHEMA_MIGRATIONS from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import createTestDatabase from "@test/helpers/sqliteTestDatabase";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

describe("migration baseline", () => {
	it("has no pending migrations for the current customer schema", () => {
		expect(SCHEMA_MIGRATIONS).toEqual([]);
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
