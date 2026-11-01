import type IdRow from "@/types/IdRow";
import type SimpleEntity from "@/types/SimpleEntity";
import type TripType from "@/types/TripType";
import type { SQLiteDatabase } from "expo-sqlite";

const getTripTypeRows = async (
	database: SQLiteDatabase,
): Promise<readonly TripType[]> =>
	database.getAllAsync<TripType>(
		`SELECT id, name, created_at AS createdAt, updated_at AS updatedAt FROM trip_types ORDER BY lower(name) ASC;`,
	);

const getTripTypeRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<TripType | null> =>
	database.getFirstAsync<TripType>(
		`SELECT id, name, created_at AS createdAt, updated_at AS updatedAt FROM trip_types WHERE id = ?;`,
		id,
	);

const tripTypeNameExistsRow = async (
	database: SQLiteDatabase,
	name: string,
	excludeId?: string,
): Promise<boolean> => {
	const row = excludeId
		? await database.getFirstAsync<IdRow>(
				`SELECT id FROM trip_types WHERE lower(name) = lower(?) AND id != ? LIMIT 1;`,
				name,
				excludeId,
			)
		: await database.getFirstAsync<IdRow>(
				`SELECT id FROM trip_types WHERE lower(name) = lower(?) LIMIT 1;`,
				name,
			);
	return row !== null;
};

const upsertTripTypeRow = async (
	database: SQLiteDatabase,
	entity: SimpleEntity,
): Promise<void> => {
	const result = await database.runAsync(
		`UPDATE trip_types SET name = ?, updated_at = ? WHERE id = ?;`,
		entity.name,
		entity.updatedAt,
		entity.id,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		`INSERT INTO trip_types (id, name, created_at, updated_at) VALUES (?, ?, ?, ?);`,
		entity.id,
		entity.name,
		entity.createdAt,
		entity.updatedAt,
	);
};

const deleteTripTypeRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.runAsync(`DELETE FROM trip_types WHERE id = ?;`, id);
};

const tripTypeInUseRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<boolean> => {
	const row = await database.getFirstAsync<IdRow>(
		`SELECT id FROM trips WHERE trip_type_id = ? LIMIT 1;`,
		id,
	);
	return row !== null;
};

export default {
	getTripTypeRows,
	getTripTypeRow,
	tripTypeNameExistsRow,
	upsertTripTypeRow,
	deleteTripTypeRow,
	tripTypeInUseRow,
};
