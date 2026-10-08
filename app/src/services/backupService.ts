import * as DocumentPicker from "expo-document-picker";

import appConstants from "@/constants/appConstants";
import SCHEMA_MIGRATIONS, {
	isIdempotentMigrationError,
} from "@/database/migrations";
import SCHEMA_SQL from "@/database/schema";
import AppError from "@/errors/AppError";
import type DatabaseCountRow from "@/types/DatabaseCountRow";
import type DatabaseIntegrityResult from "@/types/DatabaseIntegrityResult";
import type SqliteTableRow from "@/types/SqliteTableRow";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { gunzipSync, gzipSync } from "fflate";

const { BACKUP_EXTENSION, BACKUP_MIME_TYPE, LEGACY_BACKUP_EXTENSION } =
	appConstants;

const createBackupFileName = (): string => {
	const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
	return `${date}${BACKUP_EXTENSION}`;
};

const isGzipBytes = (bytes: Uint8Array): boolean =>
	bytes.length > 1 && bytes[0] === 0x1f && bytes[1] === 0x8b;

const exportBackup = async (database: SQLiteDatabase): Promise<void> => {
	const integrity = await database.getFirstAsync<DatabaseIntegrityResult>(
		"SELECT integrity_check AS integrity FROM pragma_integrity_check;",
	);
	if (integrity?.integrity !== "ok") {
		throw new AppError(
			"DATABASE_INTEGRITY_FAILED",
			"Database integrity check failed. Backup was not created.",
		);
	}
	const output = new File(Paths.cache, createBackupFileName());
	output.create({ overwrite: true, intermediates: true });
	output.write(gzipSync(await database.serializeAsync()));
	if (!(await Sharing.isAvailableAsync())) {
		throw new AppError(
			"SHARING_UNAVAILABLE",
			"Backup sharing is unavailable on this device.",
		);
	}
	await Sharing.shareAsync(output.uri, {
		mimeType: BACKUP_MIME_TYPE,
		dialogTitle: "Export Purplecoins backup",
	});
};

const TEMP_RESTORE_DB_NAME = "restore-temp.db";

const getTableColumns = async (
	database: SQLiteDatabase,
	quotedTable: string,
): Promise<readonly string[]> => {
	const statement = await database.prepareAsync(
		`SELECT * FROM ${quotedTable} LIMIT 0;`,
	);
	try {
		return await statement.getColumnNamesAsync();
	} finally {
		await statement.finalizeAsync();
	}
};

const restoreBackup = async (database: SQLiteDatabase): Promise<boolean> => {
	const result = await DocumentPicker.getDocumentAsync({
		type: "*/*",
		copyToCacheDirectory: true,
		multiple: false,
	});
	if (result.canceled) {
		return false;
	}
	const asset = result.assets[0];
	if (!asset) {
		throw new AppError("BACKUP_NOT_SELECTED", "No backup was selected.");
	}
	const assetName = asset.name.toLowerCase();
	if (
		!assetName.endsWith(BACKUP_EXTENSION) &&
		!assetName.endsWith(LEGACY_BACKUP_EXTENSION)
	) {
		throw new AppError(
			"INVALID_BACKUP_EXTENSION",
			`Select a ${BACKUP_EXTENSION} or ${LEGACY_BACKUP_EXTENSION} file.`,
		);
	}

	const pickedFile = new File(asset.uri);
	const tempFile = new File(
		new File(Paths.document, "SQLite"),
		TEMP_RESTORE_DB_NAME,
	);
	if (tempFile.exists) tempFile.delete();
	let tempDatabase: SQLiteDatabase | undefined;
	try {
		tempFile.create({ overwrite: true });
		const pickedBytes = await pickedFile.bytes();
		tempFile.write(
			isGzipBytes(pickedBytes) ? gunzipSync(pickedBytes) : pickedBytes,
		);
		tempDatabase = await openDatabaseAsync(TEMP_RESTORE_DB_NAME);
		const tables = await tempDatabase.getFirstAsync<DatabaseCountRow>(
			`SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'
			 AND name IN ('transactions', 'sources', 'categories', 'attachments', 'transaction_items');`,
		);
		if (tables?.count !== 5) {
			throw new AppError(
				"INVALID_BACKUP_DATABASE",
				"This file is not a Purplecoins database.",
			);
		}
		const backupTables = new Set(
			(
				await tempDatabase.getAllAsync<SqliteTableRow>(
					`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';`,
				)
			).map((table) => table.name),
		);
		await tempDatabase.execAsync(SCHEMA_SQL);
		for (const migration of SCHEMA_MIGRATIONS) {
			try {
				await tempDatabase.execAsync(migration);
			} catch (error) {
				if (!isIdempotentMigrationError(error)) {
					throw error;
				}
			}
		}
		const mainTables = await database.getAllAsync<SqliteTableRow>(
			`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';`,
		);
		const copyStatements: string[] = [];
		for (const { name } of mainTables) {
			if (!backupTables.has(name)) {
				throw new AppError(
					"INVALID_BACKUP_DATABASE",
					`Backup is missing the ${name} table. Local data was not changed.`,
				);
			}
			const quotedTable = `"${name.replace(/"/g, '""')}"`;
			const mainColumns = await getTableColumns(database, quotedTable);
			const backupColumns = new Set(
				await getTableColumns(tempDatabase, quotedTable),
			);
			if (mainColumns.some((column) => !backupColumns.has(column))) {
				throw new AppError(
					"INVALID_BACKUP_DATABASE",
					`Backup has an incomplete ${name} table. Local data was not changed.`,
				);
			}
			const columnList = mainColumns
				.map((column) => `"${column.replace(/"/g, '""')}"`)
				.join(", ");
			copyStatements.push(
				`DELETE FROM main.${quotedTable}; INSERT INTO main.${quotedTable} (${columnList}) SELECT ${columnList} FROM restore_source.${quotedTable};`,
			);
		}
		const tempPath = tempFile.uri
			.replace(/^file:\/\//, "")
			.replace(/'/g, "''");
		await database.execAsync(
			`ATTACH DATABASE '${tempPath}' AS restore_source;`,
		);
		try {
			await database.withTransactionAsync(async () => {
				for (const statement of copyStatements) {
					await database.execAsync(statement);
				}
			});
		} finally {
			await database.execAsync("DETACH DATABASE restore_source;");
		}

		return true;
	} finally {
		await tempDatabase?.closeAsync();
		if (tempFile.exists) tempFile.delete();
	}
};

const backupService = {
	exportBackup,
	restoreBackup,
};

export default backupService;
