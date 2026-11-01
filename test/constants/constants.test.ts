import appConstants from "@/constants/appConstants";
import COLORS from "@/constants/colors";
import dateConstants from "@/constants/dateConstants";
import financeConstants from "@/constants/financeConstants";

import { describe, expect, it } from "vitest";

describe("constants", () => {
	it("exposes app constants", () => {
		expect(appConstants.APP_NAME).toBe("Purplecoins");
		expect(appConstants.BACKUP_EXTENSION).toBe(".pc");
		expect(appConstants.LEGACY_BACKUP_EXTENSION).toBe(".purplecoins");
		expect(appConstants.DATABASE_NAME).toBe("purplecoins.db");
		expect(appConstants.DEFAULT_CURRENCY_CODE).toBe("INR");
		expect(appConstants.MILLISECONDS_PER_DAY).toBe(86_400_000);
	});

	it("exposes visual constants", () => {
		expect(COLORS.background).toBe("#1C1C1C");
		expect(COLORS.white).toBe("#FFFFFF");
	});

	it("exposes finance constants", () => {
		expect(financeConstants.TRANSACTION_TYPES).toEqual([
			"DEBIT",
			"CREDIT",
			"TRANSFER",
		]);
		expect(financeConstants.ANALYSIS_PERIODS).toContain("FY");
		expect(financeConstants.VAULT_KINDS).toEqual(["PASSWORD", "CARD"]);
		expect(financeConstants.DEFAULT_TRANSACTION_TYPE).toBe("DEBIT");
		expect(financeConstants.ANALYSIS_PERIOD_OPTIONS).toContainEqual({
			label: "FY",
			value: "FY",
		});
	});

	it("exposes date constants", () => {
		expect(dateConstants.DEFAULT_FY_START_MONTH).toBe(4);
		expect(dateConstants.MONTH_OPTIONS).toHaveLength(12);
		expect(dateConstants.ALL_TIME_END).toBeGreaterThan(
			dateConstants.ALL_TIME_START,
		);
	});
});
