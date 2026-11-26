import appConstants from "@/constants/appConstants";
import AppError from "@/errors/AppError";
import financeRepository from "@/repositories/financeRepository";
import type DateRange from "@/types/DateRange";
import type LinkedTransactionFilter from "@/types/LinkedTransactionFilter";
import type PreparedTransactionInput from "@/types/PreparedTransactionInput";
import type PreparedTransactionItemInput from "@/types/PreparedTransactionItemInput";
import type Transaction from "@/types/Transaction";
import type TransactionClassification from "@/types/TransactionClassification";
import type TransactionCursor from "@/types/TransactionCursor";
import type TransactionInput from "@/types/TransactionInput";
import type TransactionItemInput from "@/types/TransactionItemInput";
import type TransactionPage from "@/types/TransactionPage";
import createId from "@/utils/id";
import moneyUtils from "@/utils/money";
import type { SQLiteDatabase } from "expo-sqlite";

const {
	createTransactionRow,
	invalidateTransactionSources,
	createTransactionItemRow,
	deleteTransactionRow,
	deleteTransactionItemRows,
	getCategoryRow,
	getInvestmentRow,
	getSourceRow,
	getTransactionPageRows,
	getTransactionRow,
	getTransactionRows,
	updateTransactionRow,
} = financeRepository;
const { normalizeMoney, sumMoney } = moneyUtils;
const { TRANSACTION_PAGE_SIZE } = appConstants;

const getTransactions = async (
	database: SQLiteDatabase,
	dateRange?: DateRange,
): Promise<readonly Transaction[]> =>
	dateRange
		? getTransactionRows(database, dateRange.start, dateRange.end)
		: getTransactionRows(database);

const getTransactionPage = async (
	database: SQLiteDatabase,
	cursor?: TransactionCursor,
	classification?: TransactionClassification,
): Promise<TransactionPage> => {
	const rows = await getTransactionPageRows(
		database,
		TRANSACTION_PAGE_SIZE + 1,
		cursor,
		classification,
	);
	return {
		transactions: rows.slice(0, TRANSACTION_PAGE_SIZE),
		hasMore: rows.length > TRANSACTION_PAGE_SIZE,
	};
};

const isLinkedTransaction = (
	transaction: Transaction,
	filter: LinkedTransactionFilter,
): boolean => {
	if (filter.kind === "SOURCE") {
		return (
			transaction.sourceId === filter.entityId ||
			transaction.destinationSourceId === filter.entityId ||
			transaction.items.some(
				(item) =>
					item.sourceId === filter.entityId ||
					item.destinationSourceId === filter.entityId,
			)
		);
	}
	if (filter.kind === "CATEGORY") {
		return (
			transaction.categoryId === filter.entityId ||
			transaction.items.some(
				(item) => item.categoryId === filter.entityId,
			)
		);
	}
	if (filter.kind === "TRIP") {
		return transaction.tripId === filter.entityId;
	}
	return (
		transaction.investmentId === filter.entityId ||
		transaction.items.some((item) => item.investmentId === filter.entityId)
	);
};

const getLinkedTransactions = async (
	database: SQLiteDatabase,
	filter: LinkedTransactionFilter,
): Promise<readonly Transaction[]> => {
	const transactions = await getTransactions(database);
	return transactions.filter((transaction) =>
		isLinkedTransaction(transaction, filter),
	);
};

const getTransaction = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Transaction | null> => getTransactionRow(database, id);

const normalizeTransferToAmount = (value: string | undefined): string => {
	try {
		return normalizeMoney(value ?? "");
	} catch {
		throw new AppError(
			"INVALID_TO_AMOUNT",
			"Enter a valid positive received amount.",
		);
	}
};

const prepareTransferItem = async (
	database: SQLiteDatabase,
	input: TransactionInput,
	item: TransactionItemInput,
	amount: string,
	sourceId: string,
): Promise<PreparedTransactionItemInput> => {
	const destinationSourceId =
		item.destinationSourceId ?? input.destinationSourceId;
	if (!destinationSourceId) {
		throw new AppError(
			"DESTINATION_REQUIRED",
			"Select a destination source.",
		);
	}
	if (sourceId === destinationSourceId) {
		throw new AppError(
			"SAME_TRANSFER_SOURCE",
			"Transfer sources must be different.",
		);
	}
	const destination = await getSourceRow(database, destinationSourceId);
	const source = await getSourceRow(database, sourceId);
	if (!source || !destination) {
		throw new AppError(
			"SOURCE_NOT_FOUND",
			"One of the selected sources no longer exists.",
		);
	}
	const investmentId = item.investmentId ?? input.investmentId;
	if (investmentId && !(await getInvestmentRow(database, investmentId))) {
		throw new AppError(
			"INVESTMENT_NOT_FOUND",
			"The selected investment no longer exists.",
		);
	}
	const toAmount =
		source.currencyCode === destination.currencyCode
			? amount
			: normalizeTransferToAmount(item.toAmount ?? input.toAmount);
	return {
		id: item.id,
		sourceId,
		destinationSourceId,
		investmentId,
		amount,
		toAmount,
	};
};

const prepareTransactionInput = async (
	database: SQLiteDatabase,
	input: TransactionInput,
): Promise<PreparedTransactionInput> => {
	const isInvestment = input.classification === "INVESTMENT";
	const normalizedType =
		isInvestment && input.type === "TRANSFER" ? "DEBIT" : input.type;
	const isTransfer = normalizedType === "TRANSFER";
	if (input.items?.length === 0)
		throw new AppError(
			"TRANSACTION_ITEMS_REQUIRED",
			"Add at least one item.",
		);
	const rawItems =
		input.items && input.items.length > 0
			? input.items
			: [
					{
						categoryId: input.categoryId,
						investmentId: input.investmentId,
						sourceId: input.sourceId,
						destinationSourceId: input.destinationSourceId,
						toAmount: input.toAmount,
						amount: input.amount,
					},
				];
	const items: PreparedTransactionItemInput[] = [];
	const entityNames = new Set<string>();
	for (const [position, rawItem] of rawItems.entries()) {
		try {
			const amount = normalizeMoney(rawItem.amount);
			const sourceId = rawItem.sourceId ?? input.sourceId;
			if (!sourceId) {
				throw new AppError("SOURCE_REQUIRED", "Select a source.");
			}
			if (isTransfer) {
				items.push(
					await prepareTransferItem(
						database,
						input,
						rawItem,
						amount,
						sourceId,
					),
				);
				continue;
			}
			if (isInvestment) {
				if (!rawItem.investmentId)
					throw new AppError(
						"INVESTMENT_REQUIRED",
						"Select an investment.",
					);
				const investment = await getInvestmentRow(
					database,
					rawItem.investmentId,
				);
				if (!investment)
					throw new AppError(
						"INVESTMENT_NOT_FOUND",
						"The selected investment no longer exists.",
					);
				if (!(await getSourceRow(database, sourceId)))
					throw new AppError(
						"SOURCE_NOT_FOUND",
						"The selected source no longer exists.",
					);
				items.push({
					id: rawItem.id,
					investmentId: rawItem.investmentId,
					sourceId,
					amount,
				});
				entityNames.add(investment.name.trim());
			} else {
				if (!rawItem.categoryId)
					throw new AppError(
						"CATEGORY_REQUIRED",
						"Select a category.",
					);
				const category = await getCategoryRow(
					database,
					rawItem.categoryId,
				);
				if (!category)
					throw new AppError(
						"CATEGORY_NOT_FOUND",
						"The selected category no longer exists.",
					);
				if (input.tripId && category.tripAgnostic)
					throw new AppError(
						"TRIP_AGNOSTIC_CATEGORY",
						`"${category.name.trim()}" is trip agnostic. Remove the trip or pick another category.`,
					);
				if (!(await getSourceRow(database, sourceId)))
					throw new AppError(
						"SOURCE_NOT_FOUND",
						"The selected source no longer exists.",
					);
				items.push({
					id: rawItem.id,
					categoryId: rawItem.categoryId,
					sourceId,
					amount,
				});
				entityNames.add(category.name.trim());
			}
		} catch (error) {
			if (error instanceof AppError && input.items !== undefined)
				throw new AppError(
					error.code,
					`Item ${position + 1}: ${error.message}`,
				);
			throw error;
		}
	}
	const toAmounts = items
		.map((item) => item.toAmount)
		.filter(
			(value): value is string => value !== undefined && value !== null,
		);
	return {
		...input,
		type: normalizedType,
		items,
		amount: sumMoney(items.map((item) => item.amount)),
		toAmount: toAmounts.length > 0 ? sumMoney(toAmounts) : undefined,
		reason: input.reason.trim() || [...entityNames].join(", "),
		categoryId: undefined,
		investmentId: undefined,
		destinationSourceId: undefined,
		tripId: isInvestment || isTransfer ? undefined : input.tripId,
	};
};

const saveTransaction = async (
	database: SQLiteDatabase,
	input: TransactionInput,
): Promise<string> => {
	if (!input.sourceId) {
		throw new AppError("SOURCE_REQUIRED", "Select a source.");
	}
	const id = input.id ?? createId();
	await database.withTransactionAsync(async () => {
		const transaction = database;
		const preparedInput = await prepareTransactionInput(transaction, input);
		const existing = input.id
			? await getTransactionRow(transaction, id)
			: null;
		if (input.id && !existing)
			throw new AppError(
				"TRANSACTION_NOT_FOUND",
				"This transaction no longer exists.",
			);
		const previousItems = new Map(
			(existing?.items ?? []).map((item) => [item.id, item]),
		);
		const retainedIds = new Set<string>();
		for (const item of preparedInput.items) {
			if (
				item.id !== undefined &&
				(!previousItems.has(item.id) || retainedIds.has(item.id))
			) {
				throw new AppError(
					"TRANSACTION_ITEM_INVALID",
					"An expense item does not belong to this payment or was added twice.",
				);
			}
			if (item.id) retainedIds.add(item.id);
		}
		const now = Date.now();
		const applicableInput = {
			...preparedInput,
			isApplicable:
				preparedInput.isApplicable ?? existing?.isApplicable ?? true,
		};
		if (existing) {
			await invalidateTransactionSources(transaction, id);
			await deleteTransactionItemRows(transaction, id);
		}
		if (existing) {
			await updateTransactionRow(transaction, applicableInput, id, now);
		} else {
			await createTransactionRow(transaction, applicableInput, id, now);
		}
		for (const [position, item] of preparedInput.items.entries()) {
			await createTransactionItemRow(transaction, {
				id: item.id ?? createId(),
				transactionId: id,
				categoryId: item.categoryId ?? null,
				investmentId: item.investmentId ?? null,
				sourceId: item.sourceId,
				destinationSourceId: item.destinationSourceId ?? null,
				amount: item.amount,
				toAmount: item.toAmount ?? null,
				position,
				createdAt: previousItems.get(item.id ?? "")?.createdAt ?? now,
				updatedAt: now,
			});
		}
		await invalidateTransactionSources(transaction, id);
	});
	return id;
};

const deleteTransaction = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => deleteTransactionRow(database, id);

const getTransactionDisplayReason = (transaction: Transaction): string => {
	if (transaction.reason.trim()) {
		return transaction.reason;
	}
	if (transaction.type === "TRANSFER" && transaction.destinationSourceName) {
		return `${transaction.sourceName} to ${transaction.destinationSourceName}`;
	}
	return "Transaction";
};

const transactionService = {
	deleteTransaction,
	getLinkedTransactions,
	getTransaction,
	getTransactionDisplayReason,
	getTransactionPage,
	getTransactions,
	saveTransaction,
};

export default transactionService;
