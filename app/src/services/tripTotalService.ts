import financeRepository from "@/repositories/financeRepository";
import type TripTotal from "@/types/TripTotal";
import type TripTotalRow from "@/types/TripTotalRow";
import moneyUtils from "@/utils/money";
import type { SQLiteDatabase } from "expo-sqlite";

const { getTripTotalRows } = financeRepository;
const { addMoney, subtractMoney, ZERO_AMOUNT } = moneyUtils;

const buildTripTotals = (
	rows: readonly TripTotalRow[],
): readonly TripTotal[] => {
	const totals = new Map<string, TripTotal>();
	for (const row of rows) {
		const key = `${row.tripId}:${row.currencyCode}`;
		const current = totals.get(key);
		const credits = addMoney(current?.credits ?? ZERO_AMOUNT, row.credits);
		const debits = addMoney(current?.debits ?? ZERO_AMOUNT, row.debits);
		totals.set(key, {
			tripId: row.tripId,
			currencyCode: row.currencyCode,
			credits,
			debits,
			total: subtractMoney(debits, credits),
		});
	}
	return [...totals.values()];
};

const getTripTotals = async (
	database: SQLiteDatabase,
): Promise<readonly TripTotal[]> =>
	buildTripTotals(await getTripTotalRows(database));

const tripTotalService = {
	buildTripTotals,
	getTripTotals,
};

export default tripTotalService;
