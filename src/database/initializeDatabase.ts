import appConstants from "@/constants/appConstants";
import MESSAGES from "@/constants/messageConstants";

import { migrateDatabase } from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import settingsRepository from "@/repositories/settingsRepository";
import type SqliteTableRow from "@/types/SqliteTableRow";
import { Directory, File, Paths } from "expo-file-system";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { ToastAndroid } from "react-native";

const { DATABASE_NAME, LAST_VACUUM_DAY_KEY } = appConstants;
const { getSettingRow, upsertSettingRow } = settingsRepository;
const databasesBeingVacuumed = new WeakSet<SQLiteDatabase>();

const vacuumDatabaseIfNeeded = async (
	database: SQLiteDatabase,
): Promise<void> => {
	if (databasesBeingVacuumed.has(database)) return;
	databasesBeingVacuumed.add(database);
	try {
		const now = new Date();
		const day = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join(
			"-",
		);
		if ((await getSettingRow(database, LAST_VACUUM_DAY_KEY)) === day)
			return;
		await database.execAsync("VACUUM;");
		await upsertSettingRow(
			database,
			LAST_VACUUM_DAY_KEY,
			day,
			now.getTime(),
		);
		ToastAndroid.show(MESSAGES.COMMON.VACUUM_DONE, ToastAndroid.SHORT);
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
		await vacuumDatabaseIfNeeded(database);
		return database;
	} catch (error) {
		await database.closeAsync();
		throw error;
	}
};

export { vacuumDatabaseIfNeeded };
export default initializeDatabase;
