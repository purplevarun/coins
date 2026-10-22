import type Transaction from "@/types/Transaction";
import type TrendPoint from "@/types/TrendPoint";
import moneyUtils from "@/utils/money";

const {
	addMoney,
	getConversionRate,
	multiplyMoney,
	subtractMoney,
	ZERO_AMOUNT,
} = moneyUtils;

const getYear = (timestamp: number): string =>
	String(new Date(timestamp).getFullYear());

const getTrendSeries = (
	transactions: readonly Transaction[],
	rateMap: ReadonlyMap<string, string> = new Map(),
): readonly TrendPoint[] => {
	const yearlyTotals = new Map<string, TrendPoint>();
	transactions.forEach((transaction) => {
		if (transaction.isApplicable === false) return;
		const rate = getConversionRate(
			transaction.sourceCurrencyCode,
			false,
			rateMap,
		);
		if (rate === null) return;
		const amount = multiplyMoney(transaction.amount, rate);
		const year = getYear(transaction.transactionAt);
		const current = yearlyTotals.get(year) ?? {
			year,
			income: ZERO_AMOUNT,
			expenses: ZERO_AMOUNT,
			networth: ZERO_AMOUNT,
		};
		const nextIncome =
			transaction.classification === "GENERAL" &&
			transaction.type === "CREDIT" &&
			transaction.categoryId &&
			transaction.categoryKind !== "REFUND"
				? addMoney(current.income, amount)
				: current.income;
		const nextExpenses =
			transaction.classification === "GENERAL" &&
			((transaction.type === "DEBIT" &&
				(transaction.categoryId || transaction.items.length > 0)) ||
				(transaction.type === "CREDIT" &&
					transaction.categoryKind === "REFUND"))
				? transaction.categoryKind === "REFUND"
					? subtractMoney(current.expenses, amount)
					: addMoney(current.expenses, amount)
				: current.expenses;
		yearlyTotals.set(year, {
			...current,
			income: nextIncome,
			expenses: nextExpenses,
			networth: current.networth,
		});
	});

	let runningNetworth = ZERO_AMOUNT;
	return [...yearlyTotals.values()]
		.sort((left, right) => left.year.localeCompare(right.year))
		.map((point) => {
			runningNetworth = addMoney(
				runningNetworth,
				subtractMoney(point.income, point.expenses),
			);
			return {
				...point,
				networth: runningNetworth,
			};
		});
};

export { getTrendSeries, getYear };
