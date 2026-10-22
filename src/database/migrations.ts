import type { SQLiteDatabase } from "expo-sqlite";

const SCHEMA_MIGRATIONS: readonly string[] = [
	"DROP TABLE IF EXISTS attachments;",
];

const migrateDatabase = async (database: SQLiteDatabase): Promise<void> => {
	for (const migration of SCHEMA_MIGRATIONS) {
		await database.execAsync(migration);
	}
	const statement = await database.prepareAsync(
		"SELECT * FROM transactions LIMIT 0;",
	);
	try {
		const columns = await statement.getColumnNamesAsync();
		if (!columns.includes("is_applicable")) {
			await database.execAsync(
				"ALTER TABLE transactions ADD COLUMN is_applicable INTEGER;",
			);
		}
	} finally {
		await statement.finalizeAsync();
	}
	await database.execAsync(
		"UPDATE transactions SET is_applicable = 1 WHERE is_applicable IS NULL;",
	);
};

export { migrateDatabase };
export default SCHEMA_MIGRATIONS;
