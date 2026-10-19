import type SqliteTestDatabase from "@test/types/SqliteTestDatabase";
import type { SQLiteDatabase } from "expo-sqlite";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { onTestFinished } from "vitest";

const createTestDatabase = (databasePath = ":memory:"): SqliteTestDatabase => {
	const sqlite = new DatabaseSync(databasePath);
	let closed = false;
	const close = (): void => {
		if (!closed) {
			sqlite.close();
			closed = true;
		}
	};
	onTestFinished(close);
	const adapter = {
		closeAsync: (): Promise<void> => {
			close();
			return Promise.resolve();
		},
		prepareAsync: (sql: string): Promise<unknown> => {
			const statement = sqlite.prepare(sql);
			return Promise.resolve({
				getColumnNamesAsync: (): Promise<string[]> =>
					Promise.resolve(
						statement.columns().map((column) => column.name),
					),
				finalizeAsync: (): Promise<void> => Promise.resolve(),
			});
		},
		execAsync: (sql: string): Promise<void> => {
			sqlite.exec(sql);
			return Promise.resolve();
		},
		runAsync: (
			sql: string,
			...parameters: SQLInputValue[]
		): Promise<unknown> =>
			Promise.resolve(sqlite.prepare(sql).run(...parameters)),
		getAllAsync: (
			sql: string,
			...parameters: SQLInputValue[]
		): Promise<unknown[]> =>
			Promise.resolve(sqlite.prepare(sql).all(...parameters)),
		getFirstAsync: (
			sql: string,
			...parameters: SQLInputValue[]
		): Promise<unknown> =>
			Promise.resolve(sqlite.prepare(sql).get(...parameters) ?? null),
		withTransactionAsync: async (
			callback: () => Promise<void>,
		): Promise<void> => {
			sqlite.exec("BEGIN;");
			try {
				await callback();
				sqlite.exec("COMMIT;");
			} catch (error) {
				sqlite.exec("ROLLBACK;");
				throw error;
			}
		},
	};
	return { sqlite, database: adapter as unknown as SQLiteDatabase };
};

export default createTestDatabase;
