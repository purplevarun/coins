import appConstants from "@/constants/appConstants";

import { migrateDatabase } from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import sourceService from "@/services/sourceService";
import type SqliteTableRow from "@/types/SqliteTableRow";
import { Directory, File, Paths } from "expo-file-system";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

const { DATABASE_NAME } = appConstants;
const { expireStaleSourceValidations } = sourceService;
const databasesBeingVacuumed = new WeakSet<SQLiteDatabase>();

const vacuumDatabase = async (database: SQLiteDatabase): Promise<void> => {
	if (databasesBeingVacuumed.has(database)) return;
	databasesBeingVacuumed.add(database);
	try {
		await database.execAsync("VACUUM;");
	} finally {
		databasesBeingVacuumed.delete(database);
	}
};

const initializeDatabase = async (): Promise<SQLiteDatabase> => {
	const database = await openDatabaseAsync(DATABASE_NAME, {
		useNewConnection: true,
	});
	try {
		const legacyStorage = await database.getFirstAsync<SqliteTableRow>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'attachments';",
		);
		if (legacyStorage) {
			for (const entry of Paths.cache.list()) {
				if (
					(entry instanceof File &&
						/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i.test(
							entry.name,
						)) ||
					(entry instanceof Directory &&
						[
							"DocumentPicker",
							"ReactNativeBlobUtil",
							"react-native-pdf",
						].includes(entry.name))
				)
					entry.delete();
			}
		}
		await database.execAsync(SCHEMA_SQL);

		await migrateDatabase(database);
		await expireStaleSourceValidations(database);
		return database;
	} catch (error) {
		await database.closeAsync();
		throw error;
	}
};

export { vacuumDatabase };
export default initializeDatabase;
