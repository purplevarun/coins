import appConstants from "@/constants/appConstants";
import dateConstants from "@/constants/dateConstants";
import financeRepository from "@/repositories/financeRepository";
import type AnalysisOptions from "@/types/AnalysisOptions";
import type AnalysisSummary from "@/types/AnalysisSummary";
import type CategoryAnalysis from "@/types/CategoryAnalysis";
import type CategoryAnalysisRow from "@/types/CategoryAnalysisRow";
import type CategoryCurrencySummary from "@/types/CategoryCurrencySummary";
import type CategoryKind from "@/types/CategoryKind";
import type InvestmentAnalysis from "@/types/InvestmentAnalysis";
import type InvestmentAnalysisRow from "@/types/InvestmentAnalysisRow";
import type SectorAnalysis from "@/types/SectorAnalysis";
import type SectorAnalysisRow from "@/types/SectorAnalysisRow";
import moneyUtils from "@/utils/money";
import type { SQLiteDatabase } from "expo-sqlite";

const { DEFAULT_CURRENCY_CODE } = appConstants;
const { ALL_TIME_END, ALL_TIME_START } = dateConstants;
const {
	getCategoryAnalysisRows,
	getExchangeRateRows,
	getInvestmentAnalysisRows,
	getSectorAnalysisRows,
	getTransactionCurrencyRows,
} = financeRepository;
const {
	absoluteMoney,
	addMoney,
	compareMoney,
	getConversionRate,
	getMissingCurrencies,
	getRateMap,
	multiplyMoney,
	subtractMoney,
	sumMoney,
	ZERO_AMOUNT,
} = moneyUtils;

const buildCategoryAnalysis = (
	rows: readonly CategoryAnalysisRow[],
	isNativeCurrency: boolean,
	rateMap: ReadonlyMap<string, string>,
): readonly CategoryAnalysis[] => {
	const totals = new Map<string, CategoryAnalysis>();

	rows.forEach((row) => {
		const rate = getConversionRate(
			row.currencyCode,
			isNativeCurrency,
			rateMap,
		);
		if (rate === null) {
			return;
		}
		const currencyCode = isNativeCurrency
			? row.currencyCode
			: DEFAULT_CURRENCY_CODE;
		const key = `${row.categoryId}:${currencyCode}`;
		const current = totals.get(key) ?? {
			categoryId: row.categoryId,
			categoryName: row.categoryName,
			kind: row.kind as CategoryKind,
			isIncome: row.kind === "INCOME",
			currencyCode,
			credits: ZERO_AMOUNT,
			debits: ZERO_AMOUNT,
			net: ZERO_AMOUNT,
		};
		const credits = addMoney(
			current.credits,
			multiplyMoney(row.credits, rate),
		);
		const debits = addMoney(
			current.debits,
			multiplyMoney(row.debits, rate),
		);
		totals.set(key, {
			...current,
			credits,
			debits,
			net: subtractMoney(credits, debits),
		});
	});

	return [...totals.values()].sort((left, right) =>
		compareMoney(left.net, right.net),
	);
};

const buildInvestmentAnalysis = (
	rows: readonly InvestmentAnalysisRow[],
	isNativeCurrency: boolean,
	rateMap: ReadonlyMap<string, string>,
): readonly InvestmentAnalysis[] => {
	const totals = new Map<string, InvestmentAnalysis>();

	rows.forEach((row) => {
		const rate = getConversionRate(
			row.currencyCode,
			isNativeCurrency,
			rateMap,
		);
		if (rate === null) {
			return;
		}
		const currencyCode = isNativeCurrency
			? row.currencyCode
			: DEFAULT_CURRENCY_CODE;
		const key = `${row.investmentId}:${currencyCode}`;
		const current = totals.get(key) ?? {
			investmentId: row.investmentId,
			investmentName: row.investmentName,
			currencyCode,
			totalInvested: ZERO_AMOUNT,
			totalRedeemed: ZERO_AMOUNT,
			net: ZERO_AMOUNT,
		};
		const totalInvested = addMoney(
			current.totalInvested,
			multiplyMoney(row.totalInvested, rate),
		);
		const totalRedeemed = addMoney(
			current.totalRedeemed,
			multiplyMoney(row.totalRedeemed, rate),
		);
		totals.set(key, {
			...current,
			totalInvested,
			totalRedeemed,
			net: subtractMoney(totalInvested, totalRedeemed),
		});
	});

	return [...totals.values()].sort((left, right) =>
		compareMoney(right.net, left.net),
	);
};

const buildSectorAnalysis = (
	rows: readonly SectorAnalysisRow[],
	isNativeCurrency: boolean,
	rateMap: ReadonlyMap<string, string>,
): readonly SectorAnalysis[] => {
	const totals = new Map<string, SectorAnalysis>();

	rows.forEach((row) => {
		const rate = getConversionRate(
			row.currencyCode,
			isNativeCurrency,
			rateMap,
		);
		if (rate === null) {
			return;
		}
		const currencyCode = isNativeCurrency
			? row.currencyCode
			: DEFAULT_CURRENCY_CODE;
		const sectorId = row.sectorId ?? "";
		const key = `${sectorId}:${currencyCode}`;
		const current = totals.get(key) ?? {
			sectorId,
			sectorName: row.sectorName ?? "",
			currencyCode,
			credits: ZERO_AMOUNT,
			debits: ZERO_AMOUNT,
			net: ZERO_AMOUNT,
		};
		const credits = addMoney(
			current.credits,
			multiplyMoney(row.credits, rate),
		);
		const debits = addMoney(
			current.debits,
			multiplyMoney(row.debits, rate),
		);
		totals.set(key, {
			...current,
			credits,
			debits,
			net: subtractMoney(credits, debits),
		});
	});

	return [...totals.values()].sort((left, right) =>
		compareMoney(left.net, right.net),
	);
};

const buildCategoryCurrencySummaries = (
	categoryAnalysis: readonly CategoryAnalysis[],
): readonly CategoryCurrencySummary[] => {
	const summaries = new Map<string, CategoryCurrencySummary>();

	categoryAnalysis.forEach((category) => {
		const current = summaries.get(category.currencyCode) ?? {
			currencyCode: category.currencyCode,
			totalIncome: ZERO_AMOUNT,
			totalExpense: ZERO_AMOUNT,
			netProfit: ZERO_AMOUNT,
		};
		const totalIncome = category.isIncome
			? addMoney(current.totalIncome, category.net)
			: current.totalIncome;
		const totalExpense = category.isIncome
			? current.totalExpense
			: subtractMoney(current.totalExpense, category.net);
		summaries.set(category.currencyCode, {
			...current,
			totalIncome,
			totalExpense,
			netProfit: subtractMoney(totalIncome, totalExpense),
		});
	});

	return [...summaries.values()].sort((left, right) =>
		left.currencyCode.localeCompare(right.currencyCode),
	);
};

const getAnalysisSummary = async (
	database: SQLiteDatabase,
	options: AnalysisOptions,
): Promise<AnalysisSummary> => {
	const { start, end } = options.dateRange;
	const [categoryRows, investmentRows, sectorRows, rates, currencyRows] =
		await Promise.all([
			getCategoryAnalysisRows(database, start, end),
			getInvestmentAnalysisRows(database, start, end),
			getSectorAnalysisRows(database, start, end),
			getExchangeRateRows(database),
			options.isNativeCurrency
				? []
				: getTransactionCurrencyRows(database, start, end),
		]);
	const rateMap = getRateMap(rates);
	const categoryAnalysis = buildCategoryAnalysis(
		categoryRows,
		options.isNativeCurrency,
		rateMap,
	);
	const categories = categoryAnalysis.filter(
		(category) => category.kind !== "REFUND",
	);
	const refundNets = categoryAnalysis.filter(
		(category) => category.kind === "REFUND",
	);
	const investmentAnalysis = buildInvestmentAnalysis(
		investmentRows,
		options.isNativeCurrency,
		rateMap,
	);
	const totalIncome = sumMoney(
		categories
			.filter((category) => category.isIncome)
			.map((category) => category.net),
	);
	const expenseCategoryNet = sumMoney(
		categories
			.filter((category) => !category.isIncome)
			.map((category) => category.net),
	);
	const totalExpense = subtractMoney(ZERO_AMOUNT, expenseCategoryNet);
	return {
		categories,
		refundNets,
		investments: investmentAnalysis,
		sectors: buildSectorAnalysis(
			sectorRows,
			options.isNativeCurrency,
			rateMap,
		),
		totalIncome,
		totalExpense,
		netProfit: subtractMoney(totalIncome, totalExpense),
		missingCurrencies: getMissingCurrencies(
			currencyRows.map((row) => row.currencyCode),
			rateMap,
		),
	};
};

const getInvestmentNetLabel = (net: string): string => {
	const comparison = compareMoney(net, ZERO_AMOUNT);
	if (comparison > 0) {
		return `Net invested`;
	}
	if (comparison < 0) {
		return `Net redeemed`;
	}
	return "Net zero";
};

const getInvestmentNetAmount = (net: string): string => absoluteMoney(net);

const getSectorSpend = async (
	database: SQLiteDatabase,
): Promise<ReadonlyMap<string, string>> => {
	const [rows, rates] = await Promise.all([
		getSectorAnalysisRows(database, ALL_TIME_START, ALL_TIME_END),
		getExchangeRateRows(database),
	]);
	return new Map(
		buildSectorAnalysis(rows, false, getRateMap(rates)).map((sector) => [
			sector.sectorId,
			sector.net,
		]),
	);
};

const analysisService = {
	buildCategoryAnalysis,
	buildCategoryCurrencySummaries,
	buildInvestmentAnalysis,
	buildSectorAnalysis,
	getAnalysisSummary,
	getInvestmentNetAmount,
	getInvestmentNetLabel,
	getSectorSpend,
};

export default analysisService;
