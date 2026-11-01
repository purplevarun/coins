import AppError from "@/errors/AppError";
import contentRepository from "@/repositories/contentRepository";
import type CardEntry from "@/types/CardEntry";
import type CardInput from "@/types/CardInput";
import createId from "@/utils/id";
import type { SQLiteDatabase } from "expo-sqlite";

const { deleteContentRow, getCardRow, getCardRows, upsertCardRow } =
	contentRepository;

const getCards = async (
	database: SQLiteDatabase,
): Promise<readonly CardEntry[]> => getCardRows(database);

const getCard = async (
	database: SQLiteDatabase,
	id: string,
): Promise<CardEntry | null> => getCardRow(database, id);

const saveCard = async (
	database: SQLiteDatabase,
	entry: CardInput,
): Promise<string> => {
	const name = entry.name.trim();
	if (!name || !entry.cardNumber.trim()) {
		throw new AppError(
			"CARD_FIELDS_REQUIRED",
			"Card name and number are required.",
		);
	}
	const now = Date.now();
	const existing = entry.id ? await getCardRow(database, entry.id) : null;
	const id = entry.id ?? createId();
	await upsertCardRow(database, {
		id,
		name,
		cardType: entry.cardType,
		cardNumber: entry.cardNumber.trim(),
		expiry: entry.expiry.trim(),
		cvv: entry.cvv.trim(),
		pin: entry.pin.trim(),
		network: entry.network.trim(),
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	});
	return id;
};

const deleteCard = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => deleteContentRow(database, "cards", id);

const cardService = {
	deleteCard,
	getCard,
	getCards,
	saveCard,
};

export default cardService;
