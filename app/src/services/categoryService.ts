import AppError from "@/errors/AppError";
import financeRepository from "@/repositories/financeRepository";
import type Category from "@/types/Category";
import type CategoryKind from "@/types/CategoryKind";
import createId from "@/utils/id";
import type { SQLiteDatabase } from "expo-sqlite";

const {
	categoryInUseRow,
	categoryNameExistsRow,
	deleteCategoryRow,
	getArchivedCategoryRows,
	getCategoryRow,
	getCategoryRows,
	mergeCategoryRows,
	setCategoryArchivedRow,
	upsertCategoryRow,
} = financeRepository;

const mapCategory = (category: Category): Category => ({
	...category,
	isIncome: category.kind === "INCOME",
	archived: Boolean(category.archived),
});

const getCategories = async (
	database: SQLiteDatabase,
	kind?: CategoryKind,
): Promise<readonly Category[]> => {
	const categories = await getCategoryRows(database, kind);
	return categories.map(mapCategory);
};

const getCategory = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Category | null> => {
	const category = await getCategoryRow(database, id);
	return category ? mapCategory(category) : null;
};

const getArchivedCategories = async (
	database: SQLiteDatabase,
): Promise<readonly Category[]> => {
	const categories = await getArchivedCategoryRows(database);
	return categories.map(mapCategory);
};

const saveCategory = async (
	database: SQLiteDatabase,
	id: string | undefined,
	name: string,
	kind: CategoryKind,
): Promise<string> => {
	const normalizedName = name.trim();
	if (!normalizedName) {
		throw new AppError(
			"CATEGORY_NAME_REQUIRED",
			"Category name is required.",
		);
	}
	if (await categoryNameExistsRow(database, normalizedName, id)) {
		throw new AppError(
			"CATEGORY_NAME_DUPLICATE",
			`A category named "${normalizedName}" already exists.`,
		);
	}
	const now = Date.now();
	const existingCategory = id ? await getCategoryRow(database, id) : null;
	const categoryId = id ?? createId();
	await upsertCategoryRow(database, {
		id: categoryId,
		name: normalizedName,
		kind,
		isIncome: kind === "INCOME",
		createdAt: existingCategory?.createdAt ?? now,
		updatedAt: now,
		archived: existingCategory?.archived ?? false,
	});
	return categoryId;
};

const setCategoryArchived = async (
	database: SQLiteDatabase,
	id: string,
	archived: boolean,
): Promise<void> => setCategoryArchivedRow(database, id, archived, Date.now());

const deleteCategory = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	if (await categoryInUseRow(database, id)) {
		throw new AppError(
			"CATEGORY_IN_USE",
			"Category is referenced by transactions or budgets and cannot be deleted.",
		);
	}
	await deleteCategoryRow(database, id);
};

const mergeCategories = async (
	database: SQLiteDatabase,
	sourceId: string,
	targetId: string,
): Promise<void> => {
	if (!sourceId || !targetId) {
		throw new AppError("CATEGORY_REQUIRED", "Select a category.");
	}
	if (sourceId === targetId) {
		throw new AppError(
			"CATEGORY_MERGE_SAME",
			"Choose a different category to merge into.",
		);
	}
	await database.withTransactionAsync(async (): Promise<void> => {
		const [source, target] = await Promise.all([
			getCategoryRow(database, sourceId),
			getCategoryRow(database, targetId),
		]);
		if (!source || !target) {
			throw new AppError(
				"CATEGORY_NOT_FOUND",
				"The selected category no longer exists.",
			);
		}
		if (source.kind !== target.kind) {
			throw new AppError(
				"CATEGORY_KIND_MISMATCH",
				"Only categories of the same kind can be merged.",
			);
		}
		await mergeCategoryRows(database, sourceId, targetId, Date.now());
	});
};

const categoryService = {
	deleteCategory,
	getArchivedCategories,
	getCategories,
	getCategory,
	mergeCategories,
	saveCategory,
	setCategoryArchived,
};

export default categoryService;
