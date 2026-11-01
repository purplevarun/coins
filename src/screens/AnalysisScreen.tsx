import CustomText from "@/components/CustomText";
import type ThemeColors from "@/types/ThemeColors";

import { Ionicons } from "@expo/vector-icons";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import DateField from "@/components/DateField";
import DonutChart from "@/components/DonutChart";
import EmptyState from "@/components/EmptyState";
import GlassCard from "@/components/GlassCard";
import HeaderIconButton from "@/components/HeaderIconButton";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import SectionHeading from "@/components/SectionHeading";
import SegmentedControl from "@/components/SegmentedControl";
import TrendLineChart from "@/components/TrendLineChart";
import appConstants from "@/constants/appConstants";
import dateConstants from "@/constants/dateConstants";
import financeConstants from "@/constants/financeConstants";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import themeConstants from "@/constants/themeConstants";
import { THEME_CHART_COLORS } from "@/constants/themePaletteConstants";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import financeRepository from "@/repositories/financeRepository";
import analysisService from "@/services/analysisService";
import settingsService from "@/services/settingsService";
import type AnalysisDateRangeInput from "@/types/AnalysisDateRangeInput";
import type AnalysisPeriod from "@/types/AnalysisPeriod";
import type AnalysisScreenProps from "@/types/AnalysisScreenProps";
import type AnalysisSummary from "@/types/AnalysisSummary";
import type ChartDatum from "@/types/ChartDatum";
import type DateRange from "@/types/DateRange";
import type ExchangeRate from "@/types/ExchangeRate";
import type SummaryMetricInput from "@/types/SummaryMetricInput";
import type Transaction from "@/types/Transaction";
import createThemedStyles from "@/utils/createThemedStyles";
import dateUtils from "@/utils/date";
import getErrorMessage from "@/utils/error";
import moneyUtils from "@/utils/money";
import runAfterRender from "@/utils/runAfterRender";
import { getTrendSeries } from "@/utils/trends";
const { DEFAULT_CURRENCY_CODE } = appConstants;
const {
	getExchangeRateRows,
	getTransactionMinMaxDate,
	getApplicableTransactionRows,
} = financeRepository;
const { getAnalysisSummary } = analysisService;
const { getFyStartMonth } = settingsService;
const {
	formatDate,
	getAnalysisDateRange,
	getCustomDateRange,
	shiftAnalysisAnchor,
} = dateUtils;
const {
	absoluteMoney,
	addMoney,
	compareMoney,
	formatMoney,
	formatMoneyPercentage,
	getMissingCurrencies,
	getRateMap,
	subtractMoney,
	sumMoney,
	ZERO_AMOUNT,
} = moneyUtils;

const { ALL_TIME_END, ALL_TIME_START, DEFAULT_FY_START_MONTH } = dateConstants;
const { ANALYSIS_PERIOD_OPTIONS, DEFAULT_ANALYSIS_PERIOD } = financeConstants;

const DEFAULT_CHART_COLORS =
	THEME_CHART_COLORS[themeConstants.DEFAULT_THEME_ID];

const getSelectedDateRange = ({
	period,
	anchorDate,
	customStartAt,
	customEndAt,
	fyStartMonth,
}: AnalysisDateRangeInput): DateRange => {
	if (period === "CUSTOM") {
		return getCustomDateRange(customStartAt, customEndAt);
	}
	return getAnalysisDateRange(period, anchorDate, fyStartMonth);
};

const getPeriodTitle = (
	period: AnalysisPeriod,
	anchorDate: Date,
	fyStartMonth: number,
): string => {
	if (period === "MONTH") {
		return anchorDate.toLocaleString("en-IN", {
			month: "long",
			year: "numeric",
		});
	}
	if (period === "YEAR") {
		return String(anchorDate.getFullYear());
	}
	if (period === "FY") {
		const month0 = anchorDate.getMonth() + 1;
		const year = anchorDate.getFullYear();
		const fyStartYear = month0 >= fyStartMonth ? year : year - 1;
		return `FY ${fyStartYear}–${String(fyStartYear + 1).slice(2)}`;
	}
	if (period === "LAST_12M") {
		return MESSAGES.ANALYSIS.LAST_12_MONTHS;
	}
	if (period === "ALL") {
		return MESSAGES.ANALYSIS.ALL_TRANSACTIONS;
	}
	return MESSAGES.ANALYSIS.CUSTOM_PERIOD;
};

const formatSignedMoney = (amount: string): string => {
	const formattedAmount = formatMoney(amount, DEFAULT_CURRENCY_CODE);
	return compareMoney(amount, ZERO_AMOUNT) > 0
		? `+${formattedAmount}`
		: formattedAmount;
};

const getInvestmentColor = (COLORS: ThemeColors, net: string): string => {
	const comparison = compareMoney(net, ZERO_AMOUNT);
	if (comparison > 0) return COLORS.danger;
	if (comparison < 0) return COLORS.success;
	return COLORS.text;
};

const isShiftNavigationDisabled = (
	period: AnalysisPeriod,
	anchorDate: Date,
	direction: -1 | 1,
	minTxnDate: number | undefined,
	maxTxnDate: number | undefined,
	fyStartMonth = DEFAULT_FY_START_MONTH,
): boolean => {
	if (direction === -1 && minTxnDate === undefined) return false;
	if (direction === 1 && maxTxnDate === undefined) return false;
	const shifted = shiftAnalysisAnchor(
		period,
		anchorDate,
		direction,
		minTxnDate,
		maxTxnDate,
		fyStartMonth,
	);
	return shifted === anchorDate;
};

const getDateRangeLabel = (dateRange: DateRange): string =>
	dateRange.start === ALL_TIME_START && dateRange.end === ALL_TIME_END
		? ""
		: `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}`;

const getMissingRatesMessage = (missingCurrencies: readonly string[]): string =>
	`Update INR exchange rates for ${missingCurrencies.join(", ")} before analysis can include those transactions.`;

const getChartData = (
	COLORS: ThemeColors,
	summary: AnalysisSummary | null,
	hasMissingCurrencies: boolean,
	chartColors: readonly string[] = DEFAULT_CHART_COLORS,
): readonly ChartDatum[] => {
	if (hasMissingCurrencies) {
		return [];
	}
	return (
		summary?.categories
			.filter((category) => compareMoney(category.net, ZERO_AMOUNT) !== 0)
			.slice(0, chartColors.length)
			.map((category, index) => ({
				label: category.categoryName,
				value: Number(absoluteMoney(category.net)),
				color: chartColors[index] ?? COLORS.primary,
			})) ?? []
	);
};

const getSummaryMetrics = (
	COLORS: ThemeColors,
	summary: AnalysisSummary | null,
	investmentCashFlow: string,
	investmentNet: string,
	netAfterInvestments: string,
): readonly SummaryMetricInput[] => [
	{
		label: MESSAGES.FINANCIAL_METRICS.INCOME,
		value: formatMoney(
			summary?.totalIncome ?? ZERO_AMOUNT,
			DEFAULT_CURRENCY_CODE,
		),
		accent: "success",
		color: COLORS.success,
	},
	{
		label: MESSAGES.FINANCIAL_METRICS.EXPENSES,
		value: formatMoney(
			summary?.totalExpense ?? ZERO_AMOUNT,
			DEFAULT_CURRENCY_CODE,
		),
		accent: "danger",
		color: COLORS.danger,
	},
	{
		label: MESSAGES.ANALYSIS.INVESTMENTS_METRIC,
		value: formatSignedMoney(investmentCashFlow),
		accent: "warning",
		color: getInvestmentColor(COLORS, investmentNet),
	},
	{
		label: MESSAGES.FINANCIAL_METRICS.NET,
		value: formatSignedMoney(summary?.netProfit ?? ZERO_AMOUNT),
		accent:
			compareMoney(summary?.netProfit ?? ZERO_AMOUNT, ZERO_AMOUNT) < 0
				? "danger"
				: "success",
		color:
			compareMoney(summary?.netProfit ?? ZERO_AMOUNT, ZERO_AMOUNT) < 0
				? COLORS.danger
				: COLORS.success,
	},
	{
		label: MESSAGES.ANALYSIS.NET_AFTER_INVESTMENTS_METRIC,
		value: formatSignedMoney(netAfterInvestments),
		accent:
			compareMoney(netAfterInvestments, ZERO_AMOUNT) < 0
				? "danger"
				: "success",
		color:
			compareMoney(netAfterInvestments, ZERO_AMOUNT) < 0
				? COLORS.danger
				: COLORS.success,
	},
	{
		label: MESSAGES.ANALYSIS.SAVINGS_METRIC,
		value: formatMoneyPercentage(
			summary?.netProfit ?? ZERO_AMOUNT,
			summary?.totalIncome ?? ZERO_AMOUNT,
		),
		accent:
			compareMoney(summary?.netProfit ?? ZERO_AMOUNT, ZERO_AMOUNT) < 0
				? "danger"
				: "success",
		color:
			compareMoney(summary?.netProfit ?? ZERO_AMOUNT, ZERO_AMOUNT) < 0
				? COLORS.danger
				: COLORS.success,
	},
];

const HAS_ARROWS: readonly AnalysisPeriod[] = ["MONTH", "YEAR", "FY"];

const AnalysisScreen = ({
	navigation,
}: AnalysisScreenProps): React.JSX.Element => {
	const { colors: COLORS, id: themeId } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const { database, dataVersion } = useDatabaseContext();
	const [period, setPeriod] = useState<AnalysisPeriod>(
		DEFAULT_ANALYSIS_PERIOD,
	);
	const [anchorDate, setAnchorDate] = useState(new Date());
	const [customStartAt, setCustomStartAt] = useState(() => Date.now());
	const [customEndAt, setCustomEndAt] = useState(() => Date.now());
	const [summary, setSummary] = useState<AnalysisSummary | null>(null);
	const [error, setError] = useState("");
	const [fyStartMonth, setFyStartMonth] = useState(DEFAULT_FY_START_MONTH);
	const [minTxnDate, setMinTxnDate] = useState<number | undefined>(undefined);
	const [maxTxnDate, setMaxTxnDate] = useState<number | undefined>(undefined);
	const [trendTransactions, setTrendTransactions] = useState<
		readonly Transaction[]
	>([]);
	const [trendExchangeRates, setTrendExchangeRates] = useState<
		readonly ExchangeRate[]
	>([]);
	const [lastPeriod, setLastPeriod] = useState<AnalysisPeriod>(
		DEFAULT_ANALYSIS_PERIOD,
	);

	const dateRange = useMemo(
		() =>
			getSelectedDateRange({
				period,
				anchorDate,
				customStartAt,
				customEndAt,
				fyStartMonth,
			}),
		[anchorDate, customEndAt, customStartAt, fyStartMonth, period],
	);

	const getScreenData = useCallback(async (): Promise<void> => {
		try {
			const [summaryResult, minMax, fy, trendRows, rates] =
				await Promise.all([
					getAnalysisSummary(database, {
						dateRange,
						isNativeCurrency: false,
					}),
					getTransactionMinMaxDate(database),
					getFyStartMonth(database),
					getApplicableTransactionRows(database),
					getExchangeRateRows(database),
				]);
			setSummary(summaryResult);
			setFyStartMonth(fy);
			setMinTxnDate(minMax?.minDate ?? undefined);
			setMaxTxnDate(minMax?.maxDate ?? undefined);
			setTrendTransactions(trendRows);
			setTrendExchangeRates(rates);
			setError("");
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		}
	}, [database, dateRange]);

	useEffect(
		() =>
			runAfterRender(() => {
				void getScreenData();
			}),
		[dataVersion, getScreenData],
	);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={styles.headerActions}>
					<HeaderIconButton
						accessibilityLabel={MESSAGES.ANALYSIS.CUSTOM_PERIOD}
						icon="time-outline"
						isActive={period === "CUSTOM"}
						onPress={() => {
							if (period === "CUSTOM") {
								setPeriod(lastPeriod);
							} else {
								setLastPeriod(period);
								setPeriod("CUSTOM");
							}
						}}
					/>
					<HeaderIconButton
						accessibilityLabel={
							MESSAGES.ANALYSIS.MANAGE_EXCHANGE_RATES
						}
						icon="swap-horizontal-outline"
						onPress={() => navigation.navigate("ExchangeRates")}
					/>
				</View>
			),
		});
	}, [lastPeriod, navigation, period, styles]);

	const handlePeriodChange = (value: string): void => {
		setPeriod(value as AnalysisPeriod);
	};

	const handleBack = (): void => {
		setAnchorDate((prev) =>
			shiftAnalysisAnchor(
				period,
				prev,
				-1,
				minTxnDate,
				maxTxnDate,
				fyStartMonth,
			),
		);
	};

	const handleForward = (): void => {
		setAnchorDate((prev) =>
			shiftAnalysisAnchor(
				period,
				prev,
				1,
				minTxnDate,
				maxTxnDate,
				fyStartMonth,
			),
		);
	};

	// Determine if arrows are disabled
	const isBackDisabled = useMemo((): boolean => {
		return isShiftNavigationDisabled(
			period,
			anchorDate,
			-1,
			minTxnDate,
			maxTxnDate,
			fyStartMonth,
		);
	}, [anchorDate, maxTxnDate, minTxnDate, period, fyStartMonth]);

	const isForwardDisabled = useMemo((): boolean => {
		return isShiftNavigationDisabled(
			period,
			anchorDate,
			1,
			minTxnDate,
			maxTxnDate,
			fyStartMonth,
		);
	}, [anchorDate, maxTxnDate, minTxnDate, period, fyStartMonth]);

	const hasMissingCurrencies = Boolean(summary?.missingCurrencies.length);
	const investmentNet = sumMoney(
		summary?.investments.map((investment) => investment.net) ?? [],
	);
	const investmentCashFlow = subtractMoney(ZERO_AMOUNT, investmentNet);
	const netAfterInvestments = addMoney(
		summary?.netProfit ?? ZERO_AMOUNT,
		investmentCashFlow,
	);
	const chartData = getChartData(
		COLORS,
		summary,
		hasMissingCurrencies,
		THEME_CHART_COLORS[themeId],
	);
	const summaryMetrics = getSummaryMetrics(
		COLORS,
		summary,
		investmentCashFlow,
		investmentNet,
		netAfterInvestments,
	);
	const trendSeries = useMemo(
		() => getTrendSeries(trendTransactions, getRateMap(trendExchangeRates)),
		[trendTransactions, trendExchangeRates],
	);
	const missingTrendCurrencies = getMissingCurrencies(
		trendTransactions
			.filter(
				(transaction) =>
					transaction.classification === "GENERAL" &&
					transaction.type !== "TRANSFER",
			)
			.map((transaction) => transaction.sourceCurrencyCode),
		getRateMap(trendExchangeRates),
	);

	const renderMetric = (metric: SummaryMetricInput): React.JSX.Element => (
		<View key={metric.label} style={styles.summaryTile}>
			<GlassCard accent={metric.accent} style={styles.summaryCard}>
				<CustomText style={styles.summaryLabel}>
					{metric.label}
				</CustomText>
				<CustomText
					style={[styles.summaryValue, { color: metric.color }]}
				>
					{metric.value}
				</CustomText>
			</GlassCard>
		</View>
	);

	return (
		<ScreenContainer>
			{period === "CUSTOM" ? null : (
				<SegmentedControl
					onChange={handlePeriodChange}
					options={ANALYSIS_PERIOD_OPTIONS}
					value={period}
				/>
			)}
			{HAS_ARROWS.includes(period) ? (
				<View style={styles.periodRow}>
					<Pressable
						disabled={isBackDisabled}
						onPress={handleBack}
						style={[
							styles.periodButton,
							isBackDisabled && styles.periodButtonDisabled,
						]}
					>
						<Ionicons
							color={
								isBackDisabled ? COLORS.textDim : COLORS.text
							}
							name="chevron-back"
							size={21}
						/>
					</Pressable>
					<View style={styles.periodText}>
						<CustomText style={styles.periodTitle}>
							{getPeriodTitle(period, anchorDate, fyStartMonth)}
						</CustomText>
						<CustomText style={styles.periodRange}>
							{formatDate(dateRange.start)} –{" "}
							{formatDate(dateRange.end)}
						</CustomText>
					</View>
					<Pressable
						disabled={isForwardDisabled}
						onPress={handleForward}
						style={[
							styles.periodButton,
							isForwardDisabled && styles.periodButtonDisabled,
						]}
					>
						<Ionicons
							color={
								isForwardDisabled ? COLORS.textDim : COLORS.text
							}
							name="chevron-forward"
							size={21}
						/>
					</Pressable>
				</View>
			) : null}
			{period === "LAST_12M" ? (
				<View style={styles.periodText}>
					<CustomText style={styles.periodTitle}>
						Last 12 months
					</CustomText>
					<CustomText style={styles.periodRange}>
						{formatDate(dateRange.start)} –{" "}
						{formatDate(dateRange.end)}
					</CustomText>
				</View>
			) : null}
			{period === "CUSTOM" ? (
				<GlassCard>
					<View style={styles.customDates}>
						<DateField
							label={MESSAGES.COMPONENTS.FROM}
							onChange={setCustomStartAt}
							value={customStartAt}
						/>
						<DateField
							label={MESSAGES.COMPONENTS.TO}
							onChange={setCustomEndAt}
							value={customEndAt}
						/>
						<CustomText style={styles.periodRange}>
							{formatDate(dateRange.start)} –{" "}
							{formatDate(dateRange.end)}
						</CustomText>
					</View>
				</GlassCard>
			) : null}
			{summary?.missingCurrencies.length ? (
				<Notice
					message={getMissingRatesMessage(summary.missingCurrencies)}
					tone="warning"
				/>
			) : null}
			{error ? <Notice message={error} tone="danger" /> : null}
			{!hasMissingCurrencies ? (
				<>
					<View style={styles.summaryGrid}>
						{summaryMetrics.map(renderMetric)}
					</View>
					<View style={styles.actionGrid}>
						<AppButton
							icon="list-outline"
							isCompact
							label={MESSAGES.ANALYSIS.SEE_ALL_CATEGORIES}
							onPress={() =>
								navigation.navigate("AnalysisDetails", {
									mode: "CATEGORIES",
									dateRangeStart: dateRange.start,
									dateRangeEnd: dateRange.end,
									dateRangeLabel:
										getDateRangeLabel(dateRange),
								})
							}
							variant="secondary"
						/>
						<AppButton
							icon="trending-up-outline"
							isCompact
							label={MESSAGES.ANALYSIS.SEE_ALL_INVESTMENTS}
							onPress={() =>
								navigation.navigate("AnalysisDetails", {
									mode: "INVESTMENTS",
									dateRangeStart: dateRange.start,
									dateRangeEnd: dateRange.end,
									dateRangeLabel:
										getDateRangeLabel(dateRange),
								})
							}
							variant="secondary"
						/>
					</View>
					<SectionHeading
						subtitle={MESSAGES.ANALYSIS.CATEGORY_NET_DESCRIPTION}
						title={MESSAGES.ANALYSIS.CATEGORY_NET_TITLE}
					/>
					{chartData.length ? (
						<GlassCard>
							<DonutChart
								centerLabel={formatSignedMoney(
									summary?.netProfit ?? ZERO_AMOUNT,
								)}
								data={chartData}
							/>
						</GlassCard>
					) : (
						<EmptyState
							icon="pie-chart-outline"
							message={MESSAGES.ANALYSIS.EMPTY_MESSAGE}
							title={MESSAGES.ANALYSIS.EMPTY_TITLE}
						/>
					)}
					<SectionHeading
						subtitle={MESSAGES.ANALYSIS.TREND_DESCRIPTION}
						title={MESSAGES.ANALYSIS.TRENDS_TITLE}
					/>
					{missingTrendCurrencies.length ? (
						<Notice
							message={getMissingRatesMessage(
								missingTrendCurrencies,
							)}
							tone="warning"
						/>
					) : trendSeries.length ? (
						<GlassCard>
							<TrendLineChart series={trendSeries} />
						</GlassCard>
					) : (
						<EmptyState
							icon="stats-chart-outline"
							message={MESSAGES.ANALYSIS.TREND_EMPTY_MESSAGE}
							title={MESSAGES.ANALYSIS.TREND_EMPTY_TITLE}
						/>
					)}
				</>
			) : null}
		</ScreenContainer>
	);
};

const {
	ALIGN,
	BORDER,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	LETTER_SPACING,
	OPACITY,
	RADIUS,
	SIZES,
	SPACING,
	TEXT_TRANSFORM,
} = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		headerActions: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S8,
		},
		periodRow: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
		},
		periodButton: {
			width: SIZES.S44,
			height: SIZES.S44,
			borderRadius: RADIUS.S14,
			backgroundColor: COLORS.surfaceMid,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
		},
		periodButtonDisabled: {
			opacity: OPACITY.FAINT,
		},
		periodText: {
			alignItems: ALIGN.CENTER,
			gap: SPACING.S2,
		},
		periodTitle: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S17,
			fontWeight: FONT_WEIGHT.BLACK,
		},
		periodRange: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S11,
		},
		customDates: {
			gap: SPACING.S12,
		},
		summaryGrid: {
			flexDirection: FLEX.ROW,
			flexWrap: FLEX.WRAP,
			justifyContent: ALIGN.SPACE_BETWEEN,
			rowGap: SPACING.S10,
		},
		actionGrid: {
			flexDirection: FLEX.ROW,
			flexWrap: FLEX.WRAP,
			justifyContent: ALIGN.SPACE_BETWEEN,
			gap: SPACING.S8,
			marginBottom: SPACING.S12,
		},
		summaryTile: {
			width: SIZES.TILE,
		},
		summaryCard: {
			flex: FLEX.FILL,
		},
		summaryLabel: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S11,
			fontWeight: FONT_WEIGHT.HEAVY,
			textTransform: TEXT_TRANSFORM.UPPERCASE,
			letterSpacing: LETTER_SPACING.WIDER,
		},
		summaryValue: {
			fontSize: FONT_SIZE.S14,
			fontWeight: FONT_WEIGHT.BLACK,
			marginTop: SPACING.S5,
		},
	}),
);

export default AnalysisScreen;

export {
	formatSignedMoney,
	getChartData,
	getDateRangeLabel,
	getInvestmentColor,
	getMissingRatesMessage,
	getPeriodTitle,
	getSelectedDateRange,
	getSummaryMetrics,
	HAS_ARROWS,
	isShiftNavigationDisabled,
};
