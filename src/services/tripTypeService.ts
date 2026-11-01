import AppError from "@/errors/AppError";
import tripTypeRepository from "@/repositories/tripTypeRepository";
import type TripType from "@/types/TripType";
import createId from "@/utils/id";
import type { SQLiteDatabase } from "expo-sqlite";

const {
	getTripTypeRows,
	getTripTypeRow,
	tripTypeNameExistsRow,
	upsertTripTypeRow,
	tripTypeInUseRow,
	deleteTripTypeRow,
} = tripTypeRepository;

const getTripTypes = async (
	database: SQLiteDatabase,
): Promise<readonly TripType[]> => getTripTypeRows(database);

const saveTripType = async (
	database: SQLiteDatabase,
	id: string | undefined,
	name: string,
): Promise<string> => {
	const normalizedName = name.trim();
	if (!normalizedName) {
		throw new AppError(
			"TRIP_TYPE_NAME_REQUIRED",
			"Trip type name is required.",
		);
	}
	if (await tripTypeNameExistsRow(database, normalizedName, id)) {
		throw new AppError(
			"TRIP_TYPE_NAME_DUPLICATE",
			`A trip type named "${normalizedName}" already exists.`,
		);
	}
	const now = Date.now();
	const existingType = id ? await getTripTypeRow(database, id) : null;
	const tripTypeId = id ?? createId();
	await upsertTripTypeRow(database, {
		id: tripTypeId,
		name: normalizedName,
		createdAt: existingType?.createdAt ?? now,
		updatedAt: now,
	});
	return tripTypeId;
};

const deleteTripType = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	if (await tripTypeInUseRow(database, id)) {
		throw new AppError(
			"TRIP_TYPE_IN_USE",
			"Trip type is referenced by trips and cannot be deleted.",
		);
	}
	await deleteTripTypeRow(database, id);
};

const tripTypeService = { getTripTypes, saveTripType, deleteTripType };

export default tripTypeService;
