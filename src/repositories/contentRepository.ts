import type { SQLiteDatabase } from "expo-sqlite";

import type CardEntry from "@/types/CardEntry";
import type PasswordEntry from "@/types/PasswordEntry";

const getPasswordRows = async (
	database: SQLiteDatabase,
): Promise<readonly PasswordEntry[]> =>
	database.getAllAsync<PasswordEntry>(`
		SELECT
			id,
			title,
			username,
			password,
			last_password AS lastPassword,
			created_at AS createdAt,
			updated_at AS updatedAt
		FROM passwords
		ORDER BY lower(title);
	`);

const getPasswordRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<PasswordEntry | null> =>
	database.getFirstAsync<PasswordEntry>(
		`
			SELECT
				id, title, username, password, last_password AS lastPassword,
				created_at AS createdAt, updated_at AS updatedAt
			FROM passwords
			WHERE id = ?;
		`,
		id,
	);

const upsertPasswordRow = async (
	database: SQLiteDatabase,
	entry: PasswordEntry,
): Promise<void> => {
	const result = await database.runAsync(
		`
			UPDATE passwords
			SET title = ?, username = ?, password = ?, last_password = ?,
				updated_at = ?
			WHERE id = ?;
		`,
		entry.title,
		entry.username,
		entry.password,
		entry.lastPassword,
		entry.updatedAt,
		entry.id,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		`
			INSERT INTO passwords (
				id, title, username, password, last_password,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?);
		`,
		entry.id,
		entry.title,
		entry.username,
		entry.password,
		entry.lastPassword,
		entry.createdAt,
		entry.updatedAt,
	);
};

const getCardRows = async (
	database: SQLiteDatabase,
): Promise<readonly CardEntry[]> =>
	database.getAllAsync<CardEntry>(`
		SELECT
			card.id,
			card.name,
			card.card_number AS cardNumber,
			card.card_type AS cardType,
			card.expiry,
			card.cvv,
			card.pin,
			card.network,
			card.created_at AS createdAt,
			card.updated_at AS updatedAt
		FROM cards card
		ORDER BY lower(card.name);
	`);

const getCardRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<CardEntry | null> =>
	database.getFirstAsync<CardEntry>(
		`
			SELECT
				card.id,
				card.name,
				card.card_number AS cardNumber,
				card.card_type AS cardType,
				card.expiry,
				card.cvv,
				card.pin,
				card.network,
				card.created_at AS createdAt,
				card.updated_at AS updatedAt
			FROM cards card
			WHERE card.id = ?;
		`,
		id,
	);

const upsertCardRow = async (
	database: SQLiteDatabase,
	entry: CardEntry,
): Promise<void> => {
	const result = await database.runAsync(
		`
			UPDATE cards
			SET name = ?, card_number = ?, card_type = ?, expiry = ?, cvv = ?,
				pin = ?, network = ?, updated_at = ?
			WHERE id = ?;
		`,
		entry.name,
		entry.cardNumber,
		entry.cardType,
		entry.expiry,
		entry.cvv,
		entry.pin,
		entry.network,
		entry.updatedAt,
		entry.id,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		`
			INSERT INTO cards (
				id, name, card_number, card_type, expiry, cvv, pin, network,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
		`,
		entry.id,
		entry.name,
		entry.cardNumber,
		entry.cardType,
		entry.expiry,
		entry.cvv,
		entry.pin,
		entry.network,
		entry.createdAt,
		entry.updatedAt,
	);
};

const deleteContentRow = async (
	database: SQLiteDatabase,
	tableName: "passwords" | "cards",
	id: string,
): Promise<void> => {
	await database.runAsync(`DELETE FROM ${tableName} WHERE id = ?;`, id);
};

const contentRepository = {
	deleteContentRow,
	getCardRow,
	getCardRows,
	getPasswordRow,
	getPasswordRows,
	upsertCardRow,
	upsertPasswordRow,
};

export default contentRepository;
