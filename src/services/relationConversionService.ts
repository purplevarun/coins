import AppError from "@/errors/AppError";
import financeRepository from "@/repositories/financeRepository";
import categoryService from "@/services/categoryService";
import investmentService from "@/services/investmentService";
import type CategoryConversionTarget from "@/types/CategoryConversionTarget";
import type InvestmentConversionTarget from "@/types/InvestmentConversionTarget";
import type Transaction from "@/types/Transaction";
import createId from "@/utils/id";
import moneyUtils from "@/utils/money";
import type { SQLiteDatabase } from "expo-sqlite";

const {
	createTransactionItemRow,
	deleteCategoryBudgetRows,
	deleteCategoryRow,
	deleteSimpleEntityRow,
	deleteTransactionItemRow,
	getCategoryRow,
	getInvestmentRow,
	getLinkedTransactionIdRows,
	getTransactionRow,
	insertTransactionRow,
	updateTransactionRelationRow,
} = financeRepository;
const { saveCategory } = categoryService;
const { saveInvestment } = investmentService;
const { sumMoney } = moneyUtils;

const getLinkedTransactions = async (
	database: SQLiteDatabase,
	kind: "CATEGORY" | "INVESTMENT",
	id: string,
): Promise<readonly Transaction[]> => {
	const transactions: Transaction[] = [];
	for (const transactionId of await getLinkedTransactionIdRows(
		database,
		kind,
		id,
	)) {
		const transaction = await getTransactionRow(database, transactionId);
		if (!transaction) {
			throw new AppError(
				"TRANSACTION_NOT_FOUND",
				"A linked transaction references a missing source.",
			);
		}
		transactions.push(transaction);
	}
	return transactions;
};

const resolveInvestmentId = async (
	database: SQLiteDatabase,
	target: InvestmentConversionTarget,
): Promise<string> => {
	if (!target.id) {
		return saveInvestment(
			database,
			undefined,
			target.name,
			target.investmentTypeId,
			target.platformId,
		);
	}
	if (!(await getInvestmentRow(database, target.id))) {
		throw new AppError(
			"INVESTMENT_NOT_FOUND",
			"The selected investment no longer exists.",
		);
	}
	return target.id;
};

const resolveCategoryId = async (
	database: SQLiteDatabase,
	target: CategoryConversionTarget,
): Promise<string> => {
	if (!target.id) {
		return saveCategory(database, undefined, target.name, target.kind);
	}
	if (!(await getCategoryRow(database, target.id))) {
		throw new AppError(
			"CATEGORY_NOT_FOUND",
			"The selected category no longer exists.",
		);
	}
	return target.id;
};

const convertCategoryToInvestment = async (
	database: SQLiteDatabase,
	categoryId: string,
	target: InvestmentConversionTarget,
): Promise<string> => {
	let investmentId = "";
	await database.withTransactionAsync(async (): Promise<void> => {
		const category = await getCategoryRow(database, categoryId);
		if (!category) {
			throw new AppError(
				"CATEGORY_NOT_FOUND",
				"The selected category no longer exists.",
			);
		}
		investmentId = await resolveInvestmentId(database, target);
		const now = Date.now();
		for (const transaction of await getLinkedTransactions(
			database,
			"CATEGORY",
			categoryId,
		)) {
			const reason = transaction.reason.trim() || category.name;
			const convertedItems = transaction.items.filter(
				(item) => item.categoryId === categoryId,
			);
			const remainingItems = transaction.items.filter(
				(item) => item.categoryId !== categoryId,
			);
			if (remainingItems.length === 0) {
				for (const [position, item] of convertedItems.entries()) {
					await deleteTransactionItemRow(database, item.id);
					await createTransactionItemRow(database, {
						id: item.id,
						transactionId: item.transactionId,
						categoryId: null,
						investmentId,
						sourceId: item.sourceId ?? null,
						destinationSourceId: item.destinationSourceId ?? null,
						amount: item.amount,
						toAmount: item.toAmount ?? null,
						position,
						createdAt: item.createdAt,
						updatedAt: now,
					});
				}
				await updateTransactionRelationRow(
					database,
					transaction.id,
					{
						classification: "INVESTMENT",
						amount: transaction.amount,
						reason,
					},
					now,
				);
				continue;
			}
			const newTransactionId = createId();
			await insertTransactionRow(
				database,
				{
					classification: "INVESTMENT",
					type: transaction.type,
					isApplicable: transaction.isApplicable,
					sourceId: transaction.sourceId,
					amount: sumMoney(convertedItems.map((item) => item.amount)),
					reason,
					transactionAt: transaction.transactionAt,
				},
				newTransactionId,
				now,
			);
			for (const [position, item] of convertedItems.entries()) {
				await deleteTransactionItemRow(database, item.id);
				await createTransactionItemRow(database, {
					id: createId(),
					transactionId: newTransactionId,
					categoryId: null,
					investmentId,
					sourceId: item.sourceId ?? null,
					destinationSourceId: item.destinationSourceId ?? null,
					amount: item.amount,
					toAmount: item.toAmount ?? null,
					position,
					createdAt: item.createdAt,
					updatedAt: now,
				});
			}
			for (const [position, item] of remainingItems.entries()) {
				if (item.position === position) continue;
				await deleteTransactionItemRow(database, item.id);
				await createTransactionItemRow(database, {
					id: item.id,
					transactionId: item.transactionId,
					categoryId: item.categoryId ?? null,
					investmentId: item.investmentId ?? null,
					sourceId: item.sourceId ?? null,
					destinationSourceId: item.destinationSourceId ?? null,
					amount: item.amount,
					toAmount: item.toAmount ?? null,
					position,
					createdAt: item.createdAt,
					updatedAt: now,
				});
			}
			await updateTransactionRelationRow(
				database,
				transaction.id,
				{
					classification: transaction.classification,
					amount: sumMoney(remainingItems.map((item) => item.amount)),
					tripId: transaction.tripId ?? undefined,
					reason: transaction.reason,
				},
				now,
			);
		}
		await deleteCategoryBudgetRows(database, categoryId);
		await deleteCategoryRow(database, categoryId);
	});
	return investmentId;
};

const convertInvestmentToCategory = async (
	database: SQLiteDatabase,
	investmentId: string,
	target: CategoryConversionTarget,
): Promise<string> => {
	let categoryId = "";
	await database.withTransactionAsync(async (): Promise<void> => {
		if (!(await getInvestmentRow(database, investmentId))) {
			throw new AppError(
				"INVESTMENT_NOT_FOUND",
				"The selected investment no longer exists.",
			);
		}
		categoryId = await resolveCategoryId(database, target);
		const now = Date.now();
		for (const transaction of await getLinkedTransactions(
			database,
			"INVESTMENT",
			investmentId,
		)) {
			const linkedItems = transaction.items.filter(
				(item) => item.investmentId === investmentId,
			);
			for (const item of linkedItems) {
				await deleteTransactionItemRow(database, item.id);
				await createTransactionItemRow(database, {
					id: item.id,
					transactionId: item.transactionId,
					categoryId:
						transaction.type === "TRANSFER" ? null : categoryId,
					investmentId: null,
					sourceId: item.sourceId ?? null,
					destinationSourceId: item.destinationSourceId ?? null,
					amount: item.amount,
					toAmount: item.toAmount ?? null,
					position: item.position,
					createdAt: item.createdAt,
					updatedAt: now,
				});
			}
			await updateTransactionRelationRow(
				database,
				transaction.id,
				{
					classification: "GENERAL",
					amount: transaction.amount,
					reason: transaction.reason,
				},
				now,
			);
		}
		await deleteSimpleEntityRow(database, "investments", investmentId);
	});
	return categoryId;
};

const relationConversionService = {
	convertCategoryToInvestment,
	convertInvestmentToCategory,
};

export default relationConversionService;
