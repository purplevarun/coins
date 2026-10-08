import dateConstants from "@/constants/dateConstants";
import type AnalysisPeriod from "@/types/AnalysisPeriod";
import type DateRange from "@/types/DateRange";

const { ALL_TIME_END, ALL_TIME_START, DEFAULT_FY_START_MONTH } = dateConstants;
const DAY_END_HOURS = 23;
const DAY_END_MINUTES = 59;
const DAY_END_SECONDS = 59;
const DAY_END_MILLISECONDS = 999;

const getFyDateRange = (anchorDate: Date, fyStartMonth: number): DateRange => {
	// fyStartMonth is 1-based (4 = April)
	const month0 = anchorDate.getMonth() + 1; // 1-based
	const year = anchorDate.getFullYear();
	// Determine which FY we're in
	const fyStartYear = month0 >= fyStartMonth ? year : year - 1;
	const fyEndMonth0 = fyStartMonth - 1; // 0-based month for end
	const fyEndYear = fyStartYear + 1;
	const start = new Date(fyStartYear, fyStartMonth - 1, 1).getTime();
	const end = new Date(fyEndYear, fyEndMonth0, 1).getTime() - 1;
	return { start, end };
};

const getLast12MonthsDateRange = (): DateRange => {
	const now = new Date();
	const start = new Date(
		now.getFullYear() - 1,
		now.getMonth(),
		now.getDate() + 1,
	).getTime();
	const end = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		DAY_END_HOURS,
		DAY_END_MINUTES,
		DAY_END_SECONDS,
		DAY_END_MILLISECONDS,
	).getTime();
	return { start, end };
};

const getAnalysisDateRange = (
	period: AnalysisPeriod,
	anchorDate: Date,
	fyStartMonth = DEFAULT_FY_START_MONTH,
): DateRange => {
	if (period === "ALL" || period === "CUSTOM") {
		return { start: ALL_TIME_START, end: ALL_TIME_END };
	}
	if (period === "FY") {
		return getFyDateRange(anchorDate, fyStartMonth);
	}
	if (period === "LAST_12M") {
		return getLast12MonthsDateRange();
	}
	const year = anchorDate.getFullYear();
	const month = anchorDate.getMonth();
	const start =
		period === "MONTH"
			? new Date(year, month, 1).getTime()
			: new Date(year, 0, 1).getTime();
	const end =
		period === "MONTH"
			? new Date(year, month + 1, 1).getTime() - 1
			: new Date(year + 1, 0, 1).getTime() - 1;
	return { start, end };
};

const shiftAnalysisAnchor = (
	period: AnalysisPeriod,
	anchorDate: Date,
	direction: -1 | 1,
	minDate?: number,
	maxDate?: number,
	fyStartMonth = DEFAULT_FY_START_MONTH,
): Date => {
	const shiftedDate = new Date(anchorDate);
	if (period !== "MONTH" && period !== "YEAR" && period !== "FY") {
		return shiftedDate;
	}
	// Clamp to day 1 so setMonth/setFullYear cannot overflow into the next
	// month (e.g. Jan 31 + 1 month would become Mar 3).
	shiftedDate.setDate(1);
	if (period === "MONTH") {
		shiftedDate.setMonth(shiftedDate.getMonth() + direction);
	} else {
		shiftedDate.setFullYear(shiftedDate.getFullYear() + direction);
	}

	const range = getAnalysisDateRange(period, shiftedDate, fyStartMonth);
	if (direction === -1 && minDate !== undefined && range.end < minDate)
		return anchorDate;
	if (direction === 1 && maxDate !== undefined && range.start > maxDate)
		return anchorDate;

	return shiftedDate;
};

const getCustomDateRange = (startAt: number, endAt: number): DateRange => {
	const startDate = new Date(Math.min(startAt, endAt));
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(Math.max(startAt, endAt));
	endDate.setHours(
		DAY_END_HOURS,
		DAY_END_MINUTES,
		DAY_END_SECONDS,
		DAY_END_MILLISECONDS,
	);
	return { start: startDate.getTime(), end: endDate.getTime() };
};

const getDayDateRange = (date: Date): DateRange => {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setHours(
		DAY_END_HOURS,
		DAY_END_MINUTES,
		DAY_END_SECONDS,
		DAY_END_MILLISECONDS,
	);
	return { start: start.getTime(), end: end.getTime() };
};

const shiftDay = (date: Date, direction: -1 | 1): Date => {
	const shifted = new Date(date);
	shifted.setDate(shifted.getDate() + direction);
	return shifted;
};

const formatDate = (timestamp: number): string =>
	new Date(timestamp).toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});

const formatDateTime = (timestamp: number): string =>
	new Date(timestamp).toLocaleString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

const dateUtils = {
	formatDate,
	formatDateTime,
	getAnalysisDateRange,
	getCustomDateRange,
	getDayDateRange,
	getFyDateRange,
	getLast12MonthsDateRange,
	shiftDay,
	shiftAnalysisAnchor,
};

export default dateUtils;
