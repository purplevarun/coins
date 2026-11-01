import type { SQLiteDatabase } from "expo-sqlite";

const SCHEMA_MIGRATIONS: readonly string[] = [
	"DROP TABLE IF EXISTS attachments;",
	"DROP TABLE IF EXISTS todos;",
	"DROP TABLE IF EXISTS notes;",
	"DROP TABLE IF EXISTS folders;",
	"DROP TABLE IF EXISTS identities;",
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
	for (const [table, legacyColumns] of [
		["passwords", ["website", "notes"]],
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
			if (table === "passwords" && !columns.includes("last_password")) {
				await database.execAsync(
					"ALTER TABLE passwords ADD COLUMN last_password TEXT;",
				);
			}
		} finally {
			await statement.finalizeAsync();
		}
	}
};

export { migrateDatabase };
export default SCHEMA_MIGRATIONS;
