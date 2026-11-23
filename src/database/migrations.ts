import type { SQLiteDatabase } from "expo-sqlite";

const SCHEMA_MIGRATIONS: readonly string[] = [
	"DROP TABLE IF EXISTS attachments;",
	"DROP TABLE IF EXISTS todos;",
	"DROP TABLE IF EXISTS notes;",
	"DROP TABLE IF EXISTS folders;",
	"DROP TABLE IF EXISTS identities;",
	"DELETE FROM settings WHERE key = 'database.lastVacuumDay';",
	`CREATE TABLE IF NOT EXISTS sectors (
		id TEXT, name TEXT, created_at INTEGER, updated_at INTEGER
	);`,
	`CREATE TABLE IF NOT EXISTS sector_categories (
		sector_id TEXT, category_id TEXT, created_at INTEGER, updated_at INTEGER
	);`,
	"CREATE INDEX IF NOT EXISTS idx_sector_categories_sector ON sector_categories(sector_id);",
	"CREATE INDEX IF NOT EXISTS idx_sector_categories_category ON sector_categories(category_id);",
	`DELETE FROM sector_categories WHERE rowid NOT IN
		(SELECT MIN(rowid) FROM sector_categories GROUP BY category_id);`,
];

const migrateDatabase = async (database: SQLiteDatabase): Promise<void> => {
	for (const migration of SCHEMA_MIGRATIONS) {
		await database.execAsync(migration);
	}
	for (const [table, column, columnType] of [
		["transactions", "is_applicable", "INTEGER"],
		["categories", "trip_agnostic", "INTEGER"],
		["transaction_items", "investment_id", "TEXT"],
	] as const) {
		const statement = await database.prepareAsync(
			`SELECT * FROM ${table} LIMIT 0;`,
		);
		try {
			const columns = await statement.getColumnNamesAsync();
			if (!columns.includes(column)) {
				await database.execAsync(
					`ALTER TABLE ${table} ADD COLUMN ${column} ${columnType};`,
				);
			}
		} finally {
			await statement.finalizeAsync();
		}
	}
	await database.execAsync(
		"CREATE INDEX IF NOT EXISTS idx_transaction_items_investment ON transaction_items(investment_id);",
	);
	await database.execAsync(
		"UPDATE transactions SET is_applicable = 1 WHERE is_applicable IS NULL;",
	);
	await database.execAsync(
		"UPDATE categories SET trip_agnostic = 0 WHERE trip_agnostic IS NULL;",
	);
	for (const [table, legacyColumns] of [
		["passwords", ["website", "notes", "last_password"]],
		["cards", ["notes"]],
	] as const) {
		const statement = await database.prepareAsync(
			`SELECT * FROM ${table} LIMIT 0;`,
		);
		try {
			const columns = await statement.getColumnNamesAsync();
			for (const legacyColumn of legacyColumns) {
				if (columns.includes(legacyColumn))
					await database.execAsync(
						`ALTER TABLE ${table} DROP COLUMN ${legacyColumn};`,
					);
			}
		} finally {
			await statement.finalizeAsync();
		}
	}
};

export { migrateDatabase };
export default SCHEMA_MIGRATIONS;
