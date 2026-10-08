import Decimal from "decimal.js";

import appConstants from "@/constants/appConstants";
import AppError from "@/errors/AppError";
import type ExchangeRate from "@/types/ExchangeRate";

const MONEY_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/;
const ZERO_AMOUNT = "0";
const { DEFAULT_CURRENCY_CODE } = appConstants;

const getRateMap = (
	rates: readonly ExchangeRate[],
): ReadonlyMap<string, string> =>
	new Map(rates.map((rate) => [rate.currencyCode, rate.rateToInr]));

const getConversionRate = (
	currencyCode: string,
	isNativeCurrency: boolean,
	rateMap: ReadonlyMap<string, string>,
): string | null => {
	if (isNativeCurrency || currencyCode === DEFAULT_CURRENCY_CODE) return "1";
	return rateMap.get(currencyCode) ?? null;
};

const getMissingCurrencies = (
	currencyCodes: readonly string[],
	rateMap: ReadonlyMap<string, string>,
): readonly string[] =>
	[...new Set(currencyCodes)].filter(
		(currencyCode) =>
			currencyCode !== DEFAULT_CURRENCY_CODE &&
			!rateMap.has(currencyCode),
	);

const normalizeMoney = (value: string): string => {
	const trimmedValue = value.trim();
	if (!MONEY_PATTERN.test(trimmedValue)) {
		throw new AppError("INVALID_AMOUNT", "Enter a valid positive amount.");
	}

	const amount = new Decimal(trimmedValue);
	if (!amount.greaterThan(0)) {
		throw new AppError(
			"INVALID_AMOUNT",
			"Amount must be greater than zero.",
		);
	}
	return amount.toFixed();
};

const addMoney = (left: string, right: string): string =>
	new Decimal(left).plus(right).toFixed();

const subtractMoney = (left: string, right: string): string =>
	new Decimal(left).minus(right).toFixed();

const multiplyMoney = (amount: string, multiplier: string): string =>
	new Decimal(amount).times(multiplier).toFixed();

const compareMoney = (left: string, right: string): number =>
	new Decimal(left).comparedTo(right);

const absoluteMoney = (amount: string): string =>
	new Decimal(amount).abs().toFixed();

const sumMoney = (amounts: readonly string[]): string =>
	amounts.reduce(addMoney, ZERO_AMOUNT);

const formatMoney = (amount: string, currencyCode: string): string => {
	const numericAmount = new Decimal(amount).toNumber();
	try {
		return new Intl.NumberFormat("en-IN", {
			style: "currency",
			currency: currencyCode,
			maximumFractionDigits: 2,
		}).format(numericAmount);
	} catch (error: unknown) {
		if (error instanceof RangeError) {
			return `${currencyCode} ${new Decimal(amount).toFixed(2)}`;
		}
		throw error;
	}
};

const moneyUtils = {
	absoluteMoney,
	addMoney,
	compareMoney,
	formatMoney,
	getConversionRate,
	getMissingCurrencies,
	getRateMap,
	multiplyMoney,
	normalizeMoney,
	subtractMoney,
	sumMoney,
	ZERO_AMOUNT,
};

export default moneyUtils;
