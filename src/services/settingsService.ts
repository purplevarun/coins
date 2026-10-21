import themeConstants from "@/constants/themeConstants";
import settingsRepository from "@/repositories/settingsRepository";
import type ThemeId from "@/types/ThemeId";
import type { SQLiteDatabase } from "expo-sqlite";

const { getSettingRow, upsertSettingRow } = settingsRepository;
const { DEFAULT_THEME_ID, THEME_OPTIONS, THEME_SETTING_KEY } = themeConstants;

const NATIVE_CURRENCY_KEY = "native_currency_display";
const FY_START_MONTH_KEY = "fy_start_month";
const DEFAULT_TRIP_ID_KEY = "default_trip_id";
const DEFAULT_SOURCE_ID_KEY = "default_source_id";

const updateThemeId = async (
	database: SQLiteDatabase,
	themeId: ThemeId,
): Promise<void> =>
	upsertSettingRow(database, THEME_SETTING_KEY, themeId, Date.now());

const getThemeId = async (database: SQLiteDatabase): Promise<ThemeId> => {
	const value = await getSettingRow(database, THEME_SETTING_KEY);
	const themeId =
		THEME_OPTIONS.find((option) => option.value === value)?.value ??
		DEFAULT_THEME_ID;
	if (value !== themeId) await updateThemeId(database, themeId);
	return themeId;
};

const getNativeCurrencyDisplay = async (
	database: SQLiteDatabase,
): Promise<boolean> => {
	const value = await getSettingRow(database, NATIVE_CURRENCY_KEY);
	return value === null ? true : value === "true";
};

const updateNativeCurrencyDisplay = async (
	database: SQLiteDatabase,
	isNativeCurrency: boolean,
): Promise<void> =>
	upsertSettingRow(
		database,
		NATIVE_CURRENCY_KEY,
		String(isNativeCurrency),
		Date.now(),
	);

// FY start month: 1=Jan … 12=Dec, default 4 (April)
const getFyStartMonth = async (database: SQLiteDatabase): Promise<number> => {
	const value = await getSettingRow(database, FY_START_MONTH_KEY);
	if (!value) return 4;
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? 4 : parsed;
};

const updateFyStartMonth = async (
	database: SQLiteDatabase,
	month: number,
): Promise<void> =>
	upsertSettingRow(database, FY_START_MONTH_KEY, String(month), Date.now());

// Default trip
const getDefaultTripId = async (
	database: SQLiteDatabase,
): Promise<string | null> => {
	const value = await getSettingRow(database, DEFAULT_TRIP_ID_KEY);
	return value === "" ? null : value;
};

const updateDefaultTripId = async (
	database: SQLiteDatabase,
	tripId: string | null,
): Promise<void> =>
	upsertSettingRow(database, DEFAULT_TRIP_ID_KEY, tripId ?? "", Date.now());

const getDefaultSourceId = async (
	database: SQLiteDatabase,
): Promise<string | null> => {
	const value = await getSettingRow(database, DEFAULT_SOURCE_ID_KEY);
	return value === "" ? null : value;
};

const updateDefaultSourceId = async (
	database: SQLiteDatabase,
	sourceId: string | null,
): Promise<void> =>
	upsertSettingRow(
		database,
		DEFAULT_SOURCE_ID_KEY,
		sourceId ?? "",
		Date.now(),
	);

const settingsService = {
	getDefaultSourceId,
	getDefaultTripId,
	getFyStartMonth,
	getNativeCurrencyDisplay,
	getThemeId,
	updateDefaultSourceId,
	updateDefaultTripId,
	updateFyStartMonth,
	updateNativeCurrencyDisplay,
	updateThemeId,
};

export default settingsService;
