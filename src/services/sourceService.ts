import appConstants from "@/constants/appConstants";
import financeConstants from "@/constants/financeConstants";
import AppError from "@/errors/AppError";
import financeRepository from "@/repositories/financeRepository";
import type Source from "@/types/Source";
import type Transaction from "@/types/Transaction";
import createId from "@/utils/id";
import moneyUtils from "@/utils/money";
import type { SQLiteDatabase } from "expo-sqlite";

const {
	createSourceRow,
	deleteSourceRow,
	expireStaleValidatedSourceRows,
	getArchivedSourceRows,
	getSourceRow,
	getSourceRows,
	getApplicableTransactionRows,
	setSourceArchivedRow,
	sourceInUseRow,
	sourceNameExistsRow,
	updateSourceNameRow,
	validateSourceRow,
} = financeRepository;
const { addMoney, subtractMoney, ZERO_AMOUNT } = moneyUtils;
const { MILLISECONDS_PER_HOUR } = appConstants;
const { SOURCE_VALIDATION_STALE_HOURS } = financeConstants;

const normalizeCurrencyCode = (currencyCode: string): string => {
	const normalizedCode = currencyCode.trim().toUpperCase();
	if (!/^[A-Z]{3}$/.test(normalizedCode)) {
		throw new AppError(
			"INVALID_CURRENCY",
			"Currency must be a three-letter ISO code.",
		);
	}
	return normalizedCode;
};

const getBalanceBySourceId = (
	transactions: readonly Transaction[],
): ReadonlyMap<string, string> => {
	const balances = new Map<string, string>();
	const applyDelta = (sourceId: string, delta: string): void => {
		const currentBalance = balances.get(sourceId) ?? ZERO_AMOUNT;
		balances.set(sourceId, addMoney(currentBalance, delta));
	};

	transactions.forEach((transaction) => {
		for (const item of transaction.items) {
			if (!item.sourceId) continue;
			applyDelta(
				item.sourceId,
				transaction.type === "CREDIT"
					? item.amount
					: subtractMoney(ZERO_AMOUNT, item.amount),
			);
			if (transaction.type === "TRANSFER" && item.destinationSourceId) {
				applyDelta(
					item.destinationSourceId,
					item.toAmount ?? item.amount,
				);
			}
		}
	});
	return balances;
};

const getSources = async (
	database: SQLiteDatabase,
): Promise<readonly Source[]> => {
	const [sources, transactions] = await Promise.all([
		getSourceRows(database),
		getApplicableTransactionRows(database),
	]);
	const balances = getBalanceBySourceId(transactions);
	return sources.map((source) => ({
		...source,
		archived: Boolean(source.archived),
		balance: balances.get(source.id) ?? ZERO_AMOUNT,
	}));
};

const getArchivedSources = async (
	database: SQLiteDatabase,
): Promise<readonly Source[]> => {
	const [sources, transactions] = await Promise.all([
		getArchivedSourceRows(database),
		getApplicableTransactionRows(database),
	]);
	const balances = getBalanceBySourceId(transactions);
	return sources.map((source) => ({
		...source,
		archived: Boolean(source.archived),
		balance: balances.get(source.id) ?? ZERO_AMOUNT,
	}));
};

const getSource = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Source | null> => {
	const source = await getSourceRow(database, id);
	return source ? { ...source, archived: Boolean(source.archived) } : null;
};

const createSource = async (
	database: SQLiteDatabase,
	name: string,
	currencyCode: string,
): Promise<string> => {
	const normalizedName = name.trim();
	if (!normalizedName) {
		throw new AppError("SOURCE_NAME_REQUIRED", "Source name is required.");
	}
	if (await sourceNameExistsRow(database, normalizedName)) {
		throw new AppError(
			"SOURCE_NAME_DUPLICATE",
			`A source named "${normalizedName}" already exists.`,
		);
	}
	const now = Date.now();
	const id = createId();
	await createSourceRow(database, {
		id,
		name: normalizedName,
		currencyCode: normalizeCurrencyCode(currencyCode),
		validatedAt: null,
		createdAt: now,
		updatedAt: now,
		latestTransactionCreatedAt: null,
		balance: ZERO_AMOUNT,
		archived: false,
	});
	return id;
};

const updateSourceName = async (
	database: SQLiteDatabase,
	id: string,
	name: string,
): Promise<void> => {
	const normalizedName = name.trim();
	if (!normalizedName) {
		throw new AppError("SOURCE_NAME_REQUIRED", "Source name is required.");
	}
	if (await sourceNameExistsRow(database, normalizedName, id)) {
		throw new AppError(
			"SOURCE_NAME_DUPLICATE",
			`A source named "${normalizedName}" already exists.`,
		);
	}
	await updateSourceNameRow(database, id, normalizedName, Date.now());
};

const validateSource = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => validateSourceRow(database, id, Date.now());

const expireStaleSourceValidations = async (
	database: SQLiteDatabase,
): Promise<void> =>
	expireStaleValidatedSourceRows(
		database,
		Date.now() - SOURCE_VALIDATION_STALE_HOURS * MILLISECONDS_PER_HOUR,
	);

const setSourceArchived = async (
	database: SQLiteDatabase,
	id: string,
	archived: boolean,
): Promise<void> => setSourceArchivedRow(database, id, archived, Date.now());

const deleteSource = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	if (await sourceInUseRow(database, id)) {
		throw new AppError(
			"SOURCE_IN_USE",
			"Source is referenced by transactions and cannot be deleted.",
		);
	}
	await deleteSourceRow(database, id);
};

const sourceService = {
	createSource,
	deleteSource,
	expireStaleSourceValidations,
	getArchivedSources,
	getSource,
	getSources,
	setSourceArchived,
	updateSourceName,
	validateSource,
};

export default sourceService;
