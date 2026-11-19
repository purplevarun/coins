import AppError from "@/errors/AppError";
import financeRepository from "@/repositories/financeRepository";
import type Sector from "@/types/Sector";
import type SectorWithCategories from "@/types/SectorWithCategories";
import createId from "@/utils/id";
import type { SQLiteDatabase } from "expo-sqlite";

const {
	deleteSectorRow,
	getSectorCategoryIdRows,
	getSectorRow,
	getSectorRows,
	replaceSectorCategoryRows,
	sectorNameExistsRow,
	upsertSectorRow,
} = financeRepository;

const getSectors = async (
	database: SQLiteDatabase,
): Promise<readonly Sector[]> => getSectorRows(database);

const getSector = async (
	database: SQLiteDatabase,
	id: string,
): Promise<SectorWithCategories | null> => {
	const sector = await getSectorRow(database, id);
	if (!sector) return null;
	const categoryIds = await getSectorCategoryIdRows(database, id);
	return { sector, categoryIds };
};

const saveSector = async (
	database: SQLiteDatabase,
	entityId: string | undefined,
	name: string,
	categoryIds: readonly string[],
): Promise<string> => {
	const normalizedName = name.trim();
	if (!normalizedName) {
		throw new AppError("SECTOR_NAME_REQUIRED", "Sector name is required.");
	}
	if (await sectorNameExistsRow(database, normalizedName, entityId)) {
		throw new AppError(
			"SECTOR_NAME_DUPLICATE",
			`A sector named "${normalizedName}" already exists.`,
		);
	}
	const now = Date.now();
	const id = entityId ?? createId();
	const existing = entityId ? await getSectorRow(database, entityId) : null;
	await upsertSectorRow(database, {
		id,
		name: normalizedName,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	});
	await replaceSectorCategoryRows(database, id, categoryIds, now);
	return id;
};

const deleteSector = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => deleteSectorRow(database, id);

const sectorService = {
	deleteSector,
	getSector,
	getSectors,
	saveSector,
};

export default sectorService;
