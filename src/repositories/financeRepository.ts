import type { SQLiteDatabase, SQLiteRunResult } from "expo-sqlite";

import type Budget from "@/types/Budget";
import type Category from "@/types/Category";
import type CategoryAnalysisRow from "@/types/CategoryAnalysisRow";
import type CategoryKind from "@/types/CategoryKind";
import type ExchangeRate from "@/types/ExchangeRate";
import type Investment from "@/types/Investment";
import type InvestmentAnalysisRow from "@/types/InvestmentAnalysisRow";
import type InvestmentType from "@/types/InvestmentType";
import type RelationKind from "@/types/RelationKind";
import type Sector from "@/types/Sector";
import type SectorAnalysisRow from "@/types/SectorAnalysisRow";
import type SectorCategoryOwner from "@/types/SectorCategoryOwner";
import type SimpleEntity from "@/types/SimpleEntity";
import type Source from "@/types/Source";
import type Transaction from "@/types/Transaction";
import type TransactionClassification from "@/types/TransactionClassification";
import type TransactionCursor from "@/types/TransactionCursor";
import type TransactionDateBounds from "@/types/TransactionDateBounds";
import type TransactionInput from "@/types/TransactionInput";
import type TransactionItem from "@/types/TransactionItem";
import type Trip from "@/types/Trip";
import type TripScopedEntity from "@/types/TripScopedEntity";
import type TripTotalRow from "@/types/TripTotalRow";

const CATEGORY_ALLOCATION_FROM = `
	FROM (
		SELECT item.category_id AS categoryId, item.amount AS amount,
			t.type AS type, source.currency_code AS currencyCode
		FROM transaction_items item
		INNER JOIN transactions t ON t.id = item.transaction_id
		INNER JOIN sources source ON source.id = item.source_id
		WHERE t.classification = 'GENERAL' AND t.type IN ('DEBIT', 'CREDIT')
			AND COALESCE(t.is_applicable, 1) = 1
			AND t.transaction_at BETWEEN ? AND ?
	) allocation
`;

const TRANSACTION_SELECT = `
	SELECT
		t.id,
		t.classification,
		t.type,
		COALESCE(t.is_applicable, 1) AS isApplicable,
		primary_item.source_id AS sourceId,
		primary_item.destination_source_id AS destinationSourceId,
		t.amount,
		t.to_amount AS toAmount,
		primary_item.category_id AS categoryId,
		t.trip_id AS tripId,
		primary_item.investment_id AS investmentId,
		t.reason,
		t.transaction_at AS transactionAt,
		t.created_at AS createdAt,
		t.updated_at AS updatedAt,
		source.name AS sourceName,
		source.currency_code AS sourceCurrencyCode,
		destination.name AS destinationSourceName,
		destination.currency_code AS destinationCurrencyCode,
		category.name AS categoryName,
		trip.name AS tripName,
		investment.name AS investmentName,
		platform.name AS platformName,
		trip_type.name AS tripTypeName
	FROM transactions t
	INNER JOIN transaction_items primary_item
		ON primary_item.transaction_id = t.id AND primary_item.position = 0
	INNER JOIN sources source ON source.id = primary_item.source_id
	LEFT JOIN sources destination ON destination.id = primary_item.destination_source_id
	LEFT JOIN categories category ON category.id = primary_item.category_id
	LEFT JOIN trips trip ON trip.id = t.trip_id
	LEFT JOIN investments investment ON investment.id = primary_item.investment_id
	LEFT JOIN investment_platforms platform ON platform.id = investment.platform_id
	LEFT JOIN trip_types trip_type ON trip_type.id = trip.trip_type_id
	`;

const getSourceRows = async (
	database: SQLiteDatabase,
): Promise<readonly Source[]> =>
	database.getAllAsync<Source>(`
		SELECT
			source.id,
			source.name,
			source.currency_code AS currencyCode,
			source.validated_at AS validatedAt,
			source.created_at AS createdAt,
			source.updated_at AS updatedAt,
			MAX(txn.created_at) AS latestTransactionCreatedAt,
			COALESCE(source.archived, 0) AS archived,
			'0' AS balance
		FROM sources source
		LEFT JOIN transaction_items txn_item
			ON txn_item.source_id = source.id
				OR txn_item.destination_source_id = source.id
		LEFT JOIN transactions txn ON txn.id = txn_item.transaction_id
			AND COALESCE(txn.is_applicable, 1) = 1
		WHERE COALESCE(source.archived, 0) = 0
		GROUP BY source.id
		ORDER BY
			COUNT(DISTINCT txn.id) DESC,
			COALESCE(MAX(txn.created_at), 0) DESC,
			lower(source.name) ASC;
	`);

const getArchivedSourceRows = async (
	database: SQLiteDatabase,
): Promise<readonly Source[]> =>
	database.getAllAsync<Source>(`
		SELECT
			source.id,
			source.name,
			source.currency_code AS currencyCode,
			source.validated_at AS validatedAt,
			source.created_at AS createdAt,
			source.updated_at AS updatedAt,
			MAX(txn.created_at) AS latestTransactionCreatedAt,
			COALESCE(source.archived, 0) AS archived,
			'0' AS balance
		FROM sources source
		LEFT JOIN transaction_items txn_item
			ON txn_item.source_id = source.id
				OR txn_item.destination_source_id = source.id
		LEFT JOIN transactions txn ON txn.id = txn_item.transaction_id
			AND COALESCE(txn.is_applicable, 1) = 1
		WHERE COALESCE(source.archived, 0) = 1
		GROUP BY source.id
		ORDER BY lower(source.name) ASC;
	`);

const getSourceRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Source | null> =>
	database.getFirstAsync<Source>(
		`
			SELECT
				source.id,
				source.name,
				source.currency_code AS currencyCode,
				source.validated_at AS validatedAt,
				source.created_at AS createdAt,
				source.updated_at AS updatedAt,
				MAX(txn.created_at) AS latestTransactionCreatedAt,
				COALESCE(source.archived, 0) AS archived,
				'0' AS balance
			FROM sources source
			LEFT JOIN transaction_items txn_item
				ON txn_item.source_id = source.id
					OR txn_item.destination_source_id = source.id
			LEFT JOIN transactions txn ON txn.id = txn_item.transaction_id
				AND COALESCE(txn.is_applicable, 1) = 1
			WHERE source.id = ?
			GROUP BY source.id;
		`,
		id,
	);

const createSourceRow = async (
	database: SQLiteDatabase,
	source: Source,
): Promise<void> => {
	await database.runAsync(
		`
			INSERT INTO sources (
				id, name, currency_code, validated_at, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?);
		`,
		source.id,
		source.name,
		source.currencyCode,
		source.validatedAt,
		source.createdAt,
		source.updatedAt,
	);
};

const updateSourceNameRow = async (
	database: SQLiteDatabase,
	id: string,
	name: string,
	updatedAt: number,
): Promise<void> => {
	await database.runAsync(
		"UPDATE sources SET name = ?, updated_at = ? WHERE id = ?;",
		name,
		updatedAt,
		id,
	);
};

const validateSourceRow = async (
	database: SQLiteDatabase,
	id: string,
	validatedAt: number,
): Promise<void> => {
	await database.runAsync(
		"UPDATE sources SET validated_at = ? WHERE id = ?;",
		validatedAt,
		id,
	);
};

const expireStaleValidatedSourceRows = async (
	database: SQLiteDatabase,
	cutoffValidatedAt: number,
): Promise<void> => {
	await database.runAsync(
		"UPDATE sources SET validated_at = NULL WHERE validated_at IS NOT NULL AND validated_at <= ?;",
		cutoffValidatedAt,
	);
};

const setSourceArchivedRow = async (
	database: SQLiteDatabase,
	id: string,
	archived: boolean,
	updatedAt: number,
): Promise<void> => {
	await database.runAsync(
		"UPDATE sources SET archived = ?, updated_at = ? WHERE id = ?;",
		archived ? 1 : 0,
		updatedAt,
		id,
	);
};

const sourceNameExistsRow = async (
	database: SQLiteDatabase,
	name: string,
	excludeId?: string,
): Promise<boolean> => {
	const row = excludeId
		? await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`
					SELECT id FROM sources
					WHERE lower(name) = lower(?)
						AND COALESCE(archived, 0) = 0
						AND id != ?
					LIMIT 1;
				`,
				name,
				excludeId,
			)
		: await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`
					SELECT id FROM sources
					WHERE lower(name) = lower(?)
						AND COALESCE(archived, 0) = 0
					LIMIT 1;
				`,
				name,
			);
	return row !== null;
};

const deleteSourceRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.runAsync("DELETE FROM sources WHERE id = ?;", id);
};

const sourceInUseRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<boolean> => {
	const row = await database.getFirstAsync<Pick<SimpleEntity, "id">>(
		`SELECT id FROM transaction_items WHERE source_id = ? OR destination_source_id = ? LIMIT 1;`,
		id,
		id,
	);
	return row !== null;
};

const getCategoryRows = async (
	database: SQLiteDatabase,
	kind?: CategoryKind,
): Promise<readonly Category[]> =>
	database.getAllAsync<Category>(
		`
		SELECT
			category.id,
			category.name,
			category.kind AS kind,
			COALESCE(category.trip_agnostic, 0) AS tripAgnostic,
			category.created_at AS createdAt,
			category.updated_at AS updatedAt,
			COALESCE(category.archived, 0) AS archived
		FROM categories category
		LEFT JOIN (
			SELECT txn.id, item.category_id, txn.created_at
			FROM transaction_items item JOIN transactions txn ON txn.id = item.transaction_id
			WHERE item.category_id IS NOT NULL AND COALESCE(txn.is_applicable, 1) = 1
		) txn ON txn.category_id = category.id
		WHERE COALESCE(category.archived, 0) = 0
			${kind === undefined ? "" : "AND category.kind = ?"}
		GROUP BY category.id
		ORDER BY
			COUNT(DISTINCT txn.id) DESC,
			COALESCE(MAX(txn.created_at), 0) DESC,
			lower(category.name) ASC;
		`,
		...(kind === undefined ? [] : [kind]),
	);

const getArchivedCategoryRows = async (
	database: SQLiteDatabase,
): Promise<readonly Category[]> =>
	database.getAllAsync<Category>(`
		SELECT
			id,
			name,
			kind AS kind,
			COALESCE(trip_agnostic, 0) AS tripAgnostic,
			created_at AS createdAt,
			updated_at AS updatedAt,
			COALESCE(archived, 0) AS archived
		FROM categories
		WHERE COALESCE(archived, 0) = 1
		ORDER BY lower(name) ASC;
	`);

const getCategoryRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Category | null> =>
	database.getFirstAsync<Category>(
		`
			SELECT
				id,
				name,
				kind AS kind,
				COALESCE(trip_agnostic, 0) AS tripAgnostic,
				created_at AS createdAt,
				updated_at AS updatedAt,
				COALESCE(archived, 0) AS archived
			FROM categories
			WHERE id = ?;
		`,
		id,
	);

const upsertCategoryRow = async (
	database: SQLiteDatabase,
	category: Category,
): Promise<void> => {
	const result = await database.runAsync(
		`UPDATE categories SET name = ?, kind = ?, trip_agnostic = ?, updated_at = ? WHERE id = ?;`,
		category.name,
		category.kind,
		category.tripAgnostic ? 1 : 0,
		category.updatedAt,
		category.id,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		`
			INSERT INTO categories (
				id, name, kind, trip_agnostic, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?);
		`,
		category.id,
		category.name,
		category.kind,
		category.tripAgnostic ? 1 : 0,
		category.createdAt,
		category.updatedAt,
	);
};

const deleteCategoryRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.runAsync(
		"DELETE FROM sector_categories WHERE category_id = ?;",
		id,
	);
	await database.runAsync("DELETE FROM categories WHERE id = ?;", id);
};

const deleteCategoryBudgetRows = async (
	database: SQLiteDatabase,
	categoryId: string,
): Promise<void> => {
	await database.runAsync(
		"DELETE FROM budgets WHERE category_id = ?;",
		categoryId,
	);
};

const mergeCategoryRows = async (
	database: SQLiteDatabase,
	sourceId: string,
	targetId: string,
	updatedAt: number,
): Promise<void> => {
	await database.runAsync(
		"UPDATE transaction_items SET category_id = ?, updated_at = ? WHERE category_id = ?;",
		targetId,
		updatedAt,
		sourceId,
	);
	await database.runAsync(
		`DELETE FROM budgets WHERE category_id = ?
			AND period IN (SELECT period FROM budgets WHERE category_id = ?);`,
		sourceId,
		targetId,
	);
	await database.runAsync(
		"UPDATE budgets SET category_id = ?, updated_at = ? WHERE category_id = ?;",
		targetId,
		updatedAt,
		sourceId,
	);
	await database.runAsync(
		`DELETE FROM sector_categories WHERE category_id = ? AND sector_id IN
			(SELECT sector_id FROM sector_categories WHERE category_id = ?);`,
		sourceId,
		targetId,
	);
	await database.runAsync(
		"UPDATE sector_categories SET category_id = ?, updated_at = ? WHERE category_id = ?;",
		targetId,
		updatedAt,
		sourceId,
	);
	await deleteCategoryRow(database, sourceId);
};

const categoryInUseRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<boolean> => {
	const row = await database.getFirstAsync<Pick<SimpleEntity, "id">>(
		`
			SELECT id FROM transaction_items WHERE category_id = ?
			UNION
			SELECT id FROM budgets WHERE category_id = ?
			LIMIT 1;
		`,
		id,
		id,
	);
	return row !== null;
};

const setCategoryArchivedRow = async (
	database: SQLiteDatabase,
	id: string,
	archived: boolean,
	updatedAt: number,
): Promise<void> => {
	await database.runAsync(
		"UPDATE categories SET archived = ?, updated_at = ? WHERE id = ?;",
		archived ? 1 : 0,
		updatedAt,
		id,
	);
};

const getSectorRows = async (
	database: SQLiteDatabase,
): Promise<readonly Sector[]> =>
	database.getAllAsync<Sector>(
		`
		SELECT
			sector.id,
			sector.name,
			COUNT(mapping.category_id) AS categoryCount,
			sector.created_at AS createdAt,
			sector.updated_at AS updatedAt
		FROM sectors sector
		LEFT JOIN sector_categories mapping
			ON mapping.sector_id = sector.id
		GROUP BY sector.id
		ORDER BY lower(sector.name) ASC;
		`,
	);

const getSectorRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Sector | null> =>
	database.getFirstAsync<Sector>(
		`
		SELECT
			sector.id,
			sector.name,
			COUNT(mapping.category_id) AS categoryCount,
			sector.created_at AS createdAt,
			sector.updated_at AS updatedAt
		FROM sectors sector
		LEFT JOIN sector_categories mapping
			ON mapping.sector_id = sector.id
		WHERE sector.id = ?
		GROUP BY sector.id;
		`,
		id,
	);

const upsertSectorRow = async (
	database: SQLiteDatabase,
	sector: Pick<Sector, "id" | "name" | "createdAt" | "updatedAt">,
): Promise<void> => {
	const result = await database.runAsync(
		"UPDATE sectors SET name = ?, updated_at = ? WHERE id = ?;",
		sector.name,
		sector.updatedAt,
		sector.id,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		"INSERT INTO sectors (id, name, created_at, updated_at) VALUES (?, ?, ?, ?);",
		sector.id,
		sector.name,
		sector.createdAt,
		sector.updatedAt,
	);
};

const deleteSectorRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.runAsync(
		"DELETE FROM sector_categories WHERE sector_id = ?;",
		id,
	);
	await database.runAsync("DELETE FROM sectors WHERE id = ?;", id);
};

const sectorNameExistsRow = async (
	database: SQLiteDatabase,
	name: string,
	excludeId?: string,
): Promise<boolean> => {
	const row = excludeId
		? await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				"SELECT id FROM sectors WHERE lower(name) = lower(?) AND id != ? LIMIT 1;",
				name,
				excludeId,
			)
		: await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				"SELECT id FROM sectors WHERE lower(name) = lower(?) LIMIT 1;",
				name,
			);
	return row !== null;
};

const getSectorCategoryIdRows = async (
	database: SQLiteDatabase,
	sectorId: string,
): Promise<readonly string[]> =>
	(
		await database.getAllAsync<Pick<SimpleEntity, "id">>(
			"SELECT category_id AS id FROM sector_categories WHERE sector_id = ?;",
			sectorId,
		)
	).map((row) => row.id);

const getSectorCategoryOwnerRows = async (
	database: SQLiteDatabase,
): Promise<readonly Pick<SectorCategoryOwner, "categoryId" | "sectorName">[]> =>
	database.getAllAsync<
		Pick<SectorCategoryOwner, "categoryId" | "sectorName">
	>(
		`SELECT mapping.category_id AS categoryId, sector.name AS sectorName
		FROM sector_categories mapping
		JOIN sectors sector ON sector.id = mapping.sector_id;`,
	);

const replaceSectorCategoryRows = async (
	database: SQLiteDatabase,
	sectorId: string,
	categoryIds: readonly string[],
	updatedAt: number,
): Promise<void> => {
	await database.runAsync(
		"DELETE FROM sector_categories WHERE sector_id = ?;",
		sectorId,
	);
	if (categoryIds.length > 0) {
		await database.runAsync(
			`DELETE FROM sector_categories
			WHERE sector_id != ? AND category_id IN
				(${categoryIds.map(() => "?").join(",")});`,
			sectorId,
			...categoryIds,
		);
	}
	for (const categoryId of categoryIds) {
		await database.runAsync(
			`INSERT INTO sector_categories (sector_id, category_id, created_at, updated_at)
				VALUES (?, ?, ?, ?);`,
			sectorId,
			categoryId,
			updatedAt,
			updatedAt,
		);
	}
};

const categoryNameExistsRow = async (
	database: SQLiteDatabase,
	name: string,
	excludeId?: string,
): Promise<boolean> => {
	const row = excludeId
		? await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`
					SELECT id FROM categories
					WHERE lower(name) = lower(?)
						AND COALESCE(archived, 0) = 0
						AND id != ?
					LIMIT 1;
				`,
				name,
				excludeId,
			)
		: await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`
					SELECT id FROM categories
					WHERE lower(name) = lower(?)
						AND COALESCE(archived, 0) = 0
					LIMIT 1;
				`,
				name,
			);
	return row !== null;
};

const getTripRows = async (
	database: SQLiteDatabase,
): Promise<readonly Trip[]> =>
	database.getAllAsync<Trip>(`
		SELECT
			trip.id,
			trip.name,
			trip.trip_type_id AS tripTypeId,
			trip_type.name AS tripTypeName,
			trip.created_at AS createdAt,
			trip.updated_at AS updatedAt,
			COALESCE(trip.archived, 0) AS archived
		FROM trips trip
		LEFT JOIN trip_types trip_type ON trip_type.id = trip.trip_type_id
		LEFT JOIN transactions txn ON txn.trip_id = trip.id AND COALESCE(txn.is_applicable, 1) = 1
		WHERE COALESCE(trip.archived, 0) = 0
		GROUP BY trip.id
		ORDER BY
			COUNT(DISTINCT txn.id) DESC,
			COALESCE(MAX(txn.created_at), 0) DESC,
			lower(trip.name) ASC;
	`);

const getArchivedTripRows = async (
	database: SQLiteDatabase,
): Promise<readonly Trip[]> =>
	database.getAllAsync<Trip>(`
		SELECT
			trips.id,
			trips.name,
			trips.trip_type_id AS tripTypeId,
			trip_type.name AS tripTypeName,
			trips.created_at AS createdAt,
			trips.updated_at AS updatedAt,
			COALESCE(trips.archived, 0) AS archived
		FROM trips
		LEFT JOIN trip_types trip_type ON trip_type.id = trips.trip_type_id
		WHERE COALESCE(trips.archived, 0) = 1
		ORDER BY lower(trips.name) ASC;
	`);

const getTripRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Trip | null> =>
	database.getFirstAsync<Trip>(
		`
			SELECT
				trips.id, trips.name, trips.trip_type_id AS tripTypeId,
				trip_type.name AS tripTypeName,
				trips.created_at AS createdAt, trips.updated_at AS updatedAt,
				COALESCE(archived, 0) AS archived
			FROM trips
			LEFT JOIN trip_types trip_type ON trip_type.id = trips.trip_type_id
			WHERE trips.id = ?;
		`,
		id,
	);

const getInvestmentRows = async (
	database: SQLiteDatabase,
): Promise<readonly Investment[]> =>
	database.getAllAsync<Investment>(`
		SELECT
			investment.id,
			investment.name,
			investment.investment_type_id AS investmentTypeId,
			investment_type.name AS investmentTypeName,
			investment.platform_id AS platformId,
			platform.name AS platformName,
			investment.created_at AS createdAt,
			investment.updated_at AS updatedAt,
			COALESCE(investment.archived, 0) AS archived
		FROM investments investment
		LEFT JOIN transaction_items txn_item ON txn_item.investment_id = investment.id
		LEFT JOIN transactions txn ON txn.id = txn_item.transaction_id AND COALESCE(txn.is_applicable, 1) = 1
		LEFT JOIN investment_types investment_type
			ON investment_type.id = investment.investment_type_id
		LEFT JOIN investment_platforms platform ON platform.id = investment.platform_id
		WHERE COALESCE(investment.archived, 0) = 0
		GROUP BY investment.id
		ORDER BY
			COUNT(DISTINCT txn.id) DESC,
			COALESCE(MAX(txn.created_at), 0) DESC,
			lower(investment.name) ASC;
	`);

const getArchivedInvestmentRows = async (
	database: SQLiteDatabase,
): Promise<readonly Investment[]> =>
	database.getAllAsync<Investment>(`
		SELECT
			investment.id,
			investment.name,
			investment.investment_type_id AS investmentTypeId,
			investment_type.name AS investmentTypeName,
			investment.platform_id AS platformId,
			investment.created_at AS createdAt,
			investment.updated_at AS updatedAt,
			COALESCE(investment.archived, 0) AS archived
		FROM investments investment
		LEFT JOIN investment_types investment_type
			ON investment_type.id = investment.investment_type_id
		WHERE COALESCE(investment.archived, 0) = 1
		ORDER BY lower(investment.name) ASC;
	`);

const getInvestmentRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Investment | null> =>
	database.getFirstAsync<Investment>(
		`
			SELECT
				id, name, investment_type_id AS investmentTypeId, platform_id AS platformId,
				created_at AS createdAt, updated_at AS updatedAt,
				COALESCE(archived, 0) AS archived
			FROM investments
			WHERE id = ?;
		`,
		id,
	);

const upsertInvestmentRow = async (
	database: SQLiteDatabase,
	investment: Pick<
		Investment,
		| "id"
		| "name"
		| "investmentTypeId"
		| "platformId"
		| "createdAt"
		| "updatedAt"
	>,
): Promise<void> => {
	const result = await database.runAsync(
		`UPDATE investments SET name = ?, investment_type_id = ?, platform_id = ?, updated_at = ? WHERE id = ?;`,
		investment.name,
		investment.investmentTypeId,
		investment.platformId ?? null,
		investment.updatedAt,
		investment.id,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		`
			INSERT INTO investments
				(id, name, investment_type_id, platform_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?);
		`,
		investment.id,
		investment.name,
		investment.investmentTypeId,
		investment.platformId ?? null,
		investment.createdAt,
		investment.updatedAt,
	);
};

const tripInUseRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<boolean> => {
	const row = await database.getFirstAsync<Pick<SimpleEntity, "id">>(
		`SELECT id FROM transactions WHERE trip_id = ? LIMIT 1;`,
		id,
	);
	return row !== null;
};

const investmentInUseRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<boolean> => {
	const row = await database.getFirstAsync<Pick<SimpleEntity, "id">>(
		"SELECT transaction_id AS id FROM transaction_items WHERE investment_id = ? LIMIT 1;",
		id,
	);
	return row !== null;
};

const getInvestmentTypeRows = async (
	database: SQLiteDatabase,
): Promise<readonly InvestmentType[]> =>
	database.getAllAsync<InvestmentType>(`
		SELECT id, name, created_at AS createdAt, updated_at AS updatedAt
		FROM investment_types
		ORDER BY lower(name) ASC;
	`);

const upsertInvestmentTypeRow = async (
	database: SQLiteDatabase,
	entity: SimpleEntity,
): Promise<void> => {
	const result = await database.runAsync(
		`UPDATE investment_types SET name = ?, updated_at = ? WHERE id = ?;`,
		entity.name,
		entity.updatedAt,
		entity.id,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		`
			INSERT INTO investment_types (id, name, created_at, updated_at)
			VALUES (?, ?, ?, ?);
		`,
		entity.id,
		entity.name,
		entity.createdAt,
		entity.updatedAt,
	);
};

const getInvestmentTypeRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<InvestmentType | null> =>
	database.getFirstAsync<InvestmentType>(
		`
			SELECT id, name, created_at AS createdAt, updated_at AS updatedAt
			FROM investment_types
			WHERE id = ?;
		`,
		id,
	);

const investmentTypeNameExistsRow = async (
	database: SQLiteDatabase,
	name: string,
	excludeId?: string,
): Promise<boolean> => {
	const row = excludeId
		? await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`SELECT id FROM investment_types WHERE lower(name) = lower(?) AND id != ? LIMIT 1;`,
				name,
				excludeId,
			)
		: await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`SELECT id FROM investment_types WHERE lower(name) = lower(?) LIMIT 1;`,
				name,
			);
	return row !== null;
};

const upsertSimpleEntityRow = async (
	database: SQLiteDatabase,
	tableName: "trips",
	entity: TripScopedEntity,
): Promise<void> => {
	const updateResult = await database.runAsync(
		`
			UPDATE ${tableName}
			SET name = ?,
				trip_type_id = ?,
				updated_at = ?
			WHERE id = ?;
		`,
		entity.name,
		entity.tripTypeId ?? null,
		entity.updatedAt,
		entity.id,
	);
	if ((updateResult as SQLiteRunResult | undefined)?.changes) return;
	await database.runAsync(
		`INSERT INTO ${tableName} (id, name, trip_type_id, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?);`,
		entity.id,
		entity.name,
		entity.tripTypeId ?? null,
		entity.createdAt,
		entity.updatedAt,
	);
};

const deleteSimpleEntityRow = async (
	database: SQLiteDatabase,
	tableName: "trips" | "investments",
	id: string,
): Promise<void> => {
	await database.runAsync(`DELETE FROM ${tableName} WHERE id = ?;`, id);
};

const setSimpleEntityArchivedRow = async (
	database: SQLiteDatabase,
	tableName: "trips" | "investments",
	id: string,
	archived: boolean,
	updatedAt: number,
): Promise<void> => {
	await database.runAsync(
		`UPDATE ${tableName} SET archived = ?, updated_at = ? WHERE id = ?;`,
		archived ? 1 : 0,
		updatedAt,
		id,
	);
};

const simpleEntityNameExistsRow = async (
	database: SQLiteDatabase,
	tableName: "trips" | "investments",
	name: string,
	excludeId?: string,
): Promise<boolean> => {
	const row = excludeId
		? await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`
					SELECT id FROM ${tableName}
					WHERE lower(name) = lower(?)
						AND COALESCE(archived, 0) = 0
						AND id != ?
					LIMIT 1;
				`,
				name,
				excludeId,
			)
		: await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`
					SELECT id FROM ${tableName}
					WHERE lower(name) = lower(?)
						AND COALESCE(archived, 0) = 0
					LIMIT 1;
				`,
				name,
			);
	return row !== null;
};

const getTransactionMinMaxDate = async (
	database: SQLiteDatabase,
): Promise<TransactionDateBounds | null> =>
	database.getFirstAsync<TransactionDateBounds>(
		`SELECT MIN(transaction_at) AS minDate, MAX(transaction_at) AS maxDate FROM transactions WHERE COALESCE(is_applicable, 1) = 1;`,
	);

const getTransactionRows = async (
	database: SQLiteDatabase,
	start?: number,
	end?: number,
	applicableOnly = false,
): Promise<readonly Transaction[]> => {
	const hasDateRange = start !== undefined && end !== undefined;
	const conditions = [
		...(hasDateRange ? ["t.transaction_at BETWEEN ? AND ?"] : []),
		...(applicableOnly ? ["COALESCE(t.is_applicable, 1) = 1"] : []),
	];
	return hydrateTransactionItems(
		database,
		await database.getAllAsync<Omit<Transaction, "items">>(
			`${TRANSACTION_SELECT} ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY t.transaction_at DESC, t.created_at DESC;`,
			...(hasDateRange ? [start, end] : []),
		),
	);
};

const getApplicableTransactionRows = async (
	database: SQLiteDatabase,
): Promise<readonly Transaction[]> =>
	getTransactionRows(database, undefined, undefined, true);

const getTransactionPageRows = async (
	database: SQLiteDatabase,
	limit: number,
	cursor?: TransactionCursor,
	classification?: TransactionClassification,
): Promise<readonly Transaction[]> => {
	const conditions = [
		...(cursor
			? ["(t.transaction_at, t.created_at, t.id) < (?, ?, ?)"]
			: []),
		...(classification ? ["t.classification = ?"] : []),
	];
	const parameters = [
		...(cursor ? [cursor.transactionAt, cursor.createdAt, cursor.id] : []),
		...(classification ? [classification] : []),
	];
	return hydrateTransactionItems(
		database,
		await database.getAllAsync<Omit<Transaction, "items">>(
			`${TRANSACTION_SELECT}
			${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
			ORDER BY t.transaction_at DESC, t.created_at DESC, t.id DESC LIMIT ?;`,
			...parameters,
			limit,
		),
	);
};

const getCategoryAnalysisRows = async (
	database: SQLiteDatabase,
	start: number,
	end: number,
): Promise<readonly CategoryAnalysisRow[]> =>
	database.getAllAsync<CategoryAnalysisRow>(
		`
		SELECT
			category.id AS categoryId,
			category.name AS categoryName,
			category.kind AS categoryKind,
			category.kind AS kind,
			allocation.currencyCode AS currencyCode,
			CASE WHEN allocation.type = 'CREDIT' THEN allocation.amount ELSE '0' END AS credits,
			CASE WHEN allocation.type = 'DEBIT' THEN allocation.amount ELSE '0' END AS debits
		${CATEGORY_ALLOCATION_FROM}
		INNER JOIN categories category ON category.id = allocation.categoryId
		ORDER BY category.id, allocation.currencyCode;
	`,
		start,
		end,
	);

const getSectorAnalysisRows = async (
	database: SQLiteDatabase,
	start: number,
	end: number,
): Promise<readonly SectorAnalysisRow[]> =>
	database.getAllAsync<SectorAnalysisRow>(
		`
		SELECT
			sector.id AS sectorId,
			sector.name AS sectorName,
			allocation.currencyCode AS currencyCode,
			CASE WHEN allocation.type = 'CREDIT' THEN allocation.amount ELSE '0' END AS credits,
			CASE WHEN allocation.type = 'DEBIT' THEN allocation.amount ELSE '0' END AS debits
		${CATEGORY_ALLOCATION_FROM}
		INNER JOIN categories category ON category.id = allocation.categoryId
		LEFT JOIN sector_categories mapping ON mapping.category_id = category.id
		LEFT JOIN sectors sector ON sector.id = mapping.sector_id
		ORDER BY sector.id, allocation.currencyCode;
	`,
		start,
		end,
	);

const getInvestmentAnalysisRows = async (
	database: SQLiteDatabase,
	start: number,
	end: number,
): Promise<readonly InvestmentAnalysisRow[]> =>
	database.getAllAsync<InvestmentAnalysisRow>(
		`
		SELECT
			investment.id AS investmentId,
			investment.name AS investmentName,
			allocation.currencyCode AS currencyCode,
			CASE WHEN allocation.type = 'DEBIT' THEN allocation.amount ELSE '0' END AS totalInvested,
			CASE WHEN allocation.type = 'CREDIT' THEN allocation.amount ELSE '0' END AS totalRedeemed
		FROM (
			SELECT item.investment_id AS investmentId, item.amount AS amount,
				t.type AS type, source.currency_code AS currencyCode
			FROM transaction_items item
			INNER JOIN transactions t ON t.id = item.transaction_id
			INNER JOIN sources source ON source.id = item.source_id
			WHERE t.classification = 'INVESTMENT'
				AND item.investment_id IS NOT NULL
				AND COALESCE(t.is_applicable, 1) = 1
				AND t.transaction_at BETWEEN ? AND ?
		) allocation
		INNER JOIN investments investment ON investment.id = allocation.investmentId
		ORDER BY investment.id, allocation.currencyCode;
	`,
		start,
		end,
	);

const getTripTotalRows = async (
	database: SQLiteDatabase,
): Promise<readonly TripTotalRow[]> =>
	database.getAllAsync<TripTotalRow>(`
		SELECT
			t.trip_id AS tripId,
			source.currency_code AS currencyCode,
			CASE WHEN t.type = 'CREDIT' THEN item.amount ELSE '0' END AS credits,
			CASE WHEN t.type = 'DEBIT' THEN item.amount ELSE '0' END AS debits
		FROM transaction_items item
		INNER JOIN transactions t ON t.id = item.transaction_id
		INNER JOIN sources source ON source.id = item.source_id
		WHERE t.classification = 'GENERAL'
			AND COALESCE(t.is_applicable, 1) = 1
			AND t.type != 'TRANSFER'
			AND t.trip_id IS NOT NULL
		ORDER BY source.currency_code, t.trip_id;
	`);

const getTransactionCurrencyRows = async (
	database: SQLiteDatabase,
	start: number,
	end: number,
): Promise<readonly Pick<Source, "currencyCode">[]> =>
	database.getAllAsync<Pick<Source, "currencyCode">>(
		`
		SELECT DISTINCT source.currency_code AS currencyCode
		FROM transaction_items item
		INNER JOIN transactions t ON t.id = item.transaction_id
		INNER JOIN sources source ON source.id = item.source_id
		WHERE t.type != 'TRANSFER'
			AND COALESCE(t.is_applicable, 1) = 1
			AND t.transaction_at BETWEEN ? AND ?
		ORDER BY currencyCode;
	`,
		start,
		end,
	);

const getTransactionRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Transaction | null> => {
	const row = await database.getFirstAsync<Omit<Transaction, "items">>(
		`${TRANSACTION_SELECT} WHERE t.id = ?;`,
		id,
	);
	const [transaction] = await hydrateTransactionItems(
		database,
		row ? [row] : [],
	);
	return transaction ?? null;
};

const getTransactionItemRows = async (
	database: SQLiteDatabase,
	transactionIds: readonly string[],
): Promise<readonly TransactionItem[]> => {
	const items: TransactionItem[] = [];
	for (let offset = 0; offset < transactionIds.length; offset += 500) {
		const ids = transactionIds.slice(offset, offset + 500);
		items.push(
			...(await database.getAllAsync<TransactionItem>(
				`SELECT item.id, item.transaction_id AS transactionId, item.category_id AS categoryId,
			 category.name AS categoryName, category.kind AS categoryKind,
			 item.investment_id AS investmentId, investment.name AS investmentName,
			 item.source_id AS sourceId, item_source.name AS sourceName,
			 item.destination_source_id AS destinationSourceId,
			 item_destination.name AS destinationSourceName,
			 item.to_amount AS toAmount,
			 item.amount, item.position,
			 item.created_at AS createdAt, item.updated_at AS updatedAt
			 FROM transaction_items item
			 LEFT JOIN categories category ON category.id = item.category_id
			 LEFT JOIN investments investment ON investment.id = item.investment_id
			 LEFT JOIN sources item_source ON item_source.id = item.source_id
			 LEFT JOIN sources item_destination ON item_destination.id = item.destination_source_id
			 WHERE item.transaction_id IN (${ids.map(() => "?").join(", ")})
			 ORDER BY item.transaction_id, item.position;`,
				...ids,
			)),
		);
	}
	return items;
};

const hydrateTransactionItems = async (
	database: SQLiteDatabase,
	transactions: readonly Omit<Transaction, "items">[],
): Promise<readonly Transaction[]> => {
	const items = await getTransactionItemRows(
		database,
		transactions.map((transaction) => transaction.id),
	);
	const itemsByTransaction = new Map<string, TransactionItem[]>();
	for (const item of items) {
		const siblings = itemsByTransaction.get(item.transactionId) ?? [];
		siblings.push(item);
		itemsByTransaction.set(item.transactionId, siblings);
	}
	return transactions.map((transaction) => ({
		...transaction,
		isApplicable: Boolean(transaction.isApplicable ?? true),
		items: itemsByTransaction.get(transaction.id) ?? [],
	}));
};

const createTransactionItemRow = async (
	database: SQLiteDatabase,
	item: Omit<TransactionItem, "categoryName">,
): Promise<void> => {
	await database.runAsync(
		`INSERT INTO transaction_items (id, transaction_id, category_id, investment_id, source_id, destination_source_id, amount, to_amount, position, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
		item.id,
		item.transactionId,
		item.categoryId ?? null,
		item.investmentId ?? null,
		item.sourceId ?? null,
		item.destinationSourceId ?? null,
		item.amount,
		item.toAmount ?? null,
		item.position,
		item.createdAt,
		item.updatedAt,
	);
};

const deleteTransactionItemRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.runAsync("DELETE FROM transaction_items WHERE id = ?;", id);
};

const getLinkedTransactionIdRows = async (
	database: SQLiteDatabase,
	kind: Extract<RelationKind, "CATEGORY" | "INVESTMENT">,
	id: string,
): Promise<readonly string[]> => {
	const rows = await database.getAllAsync<Pick<SimpleEntity, "id">>(
		kind === "CATEGORY"
			? "SELECT DISTINCT transaction_id AS id FROM transaction_items WHERE category_id = ?;"
			: "SELECT DISTINCT transaction_id AS id FROM transaction_items WHERE investment_id = ?;",
		id,
	);
	return rows.map((row) => row.id);
};

const updateTransactionRelationRow = async (
	database: SQLiteDatabase,
	id: string,
	transaction: Pick<
		TransactionInput,
		"classification" | "amount" | "toAmount" | "tripId" | "reason"
	>,
	updatedAt: number,
): Promise<void> => {
	await database.runAsync(
		`UPDATE transactions SET classification = ?, amount = ?, to_amount = ?,
			trip_id = ?, reason = ?, updated_at = ? WHERE id = ?;`,
		transaction.classification,
		transaction.amount,
		transaction.toAmount ?? null,
		transaction.tripId ?? null,
		transaction.reason,
		updatedAt,
		id,
	);
};

const deleteTransactionItemRows = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.runAsync(
		"DELETE FROM transaction_items WHERE transaction_id = ?;",
		id,
	);
};

const invalidateTransactionSources = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.runAsync(
		`UPDATE sources SET validated_at = NULL WHERE id IN (
			SELECT item.source_id FROM transaction_items item
				INNER JOIN transactions t ON t.id = item.transaction_id
				WHERE item.transaction_id = ? AND COALESCE(t.is_applicable, 1) = 1
			UNION SELECT item.destination_source_id FROM transaction_items item
				INNER JOIN transactions t ON t.id = item.transaction_id
				WHERE item.transaction_id = ? AND COALESCE(t.is_applicable, 1) = 1
		);`,
		id,
		id,
	);
};

const insertTransactionRow = async (
	database: SQLiteDatabase,
	transaction: TransactionInput,
	id: string,
	now: number,
): Promise<void> => {
	await database.runAsync(
		`
			INSERT INTO transactions (
				id, classification, type, amount, to_amount, trip_id,
				reason, transaction_at, created_at, updated_at, is_applicable
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
		`,
		id,
		transaction.classification,
		transaction.type,
		transaction.amount,
		transaction.toAmount ?? null,
		transaction.tripId ?? null,
		transaction.reason,
		transaction.transactionAt,
		now,
		now,
		Number(transaction.isApplicable ?? true),
	);
};

const createTransactionRow = async (
	database: SQLiteDatabase,
	transaction: TransactionInput,
	id: string,
	now: number,
): Promise<void> => {
	await insertTransactionRow(database, transaction, id, now);
};

const updateTransactionRow = async (
	database: SQLiteDatabase,
	transaction: TransactionInput,
	id: string,
	now: number,
): Promise<void> => {
	await database.runAsync(
		`
			UPDATE transactions SET
				classification = ?,
				type = ?,
				amount = ?,
				to_amount = ?,
				trip_id = ?,
				reason = ?,
				transaction_at = ?,
				updated_at = ?,
				is_applicable = ?
			WHERE id = ?;
		`,
		transaction.classification,
		transaction.type,
		transaction.amount,
		transaction.toAmount ?? null,
		transaction.tripId ?? null,
		transaction.reason,
		transaction.transactionAt,
		now,
		Number(transaction.isApplicable ?? true),
		id,
	);
};

const deleteTransactionRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.withTransactionAsync(async (): Promise<void> => {
		await invalidateTransactionSources(database, id);
		await database.runAsync(
			"DELETE FROM transaction_items WHERE transaction_id = ?;",
			id,
		);
		await database.runAsync("DELETE FROM transactions WHERE id = ?;", id);
	});
};

const getBudgetRows = async (
	database: SQLiteDatabase,
): Promise<readonly Budget[]> =>
	database.getAllAsync<Budget>(`
		SELECT
			budget.id,
			budget.category_id AS categoryId,
			category.name AS categoryName,
			budget.amount,
			budget.period,
			budget.created_at AS createdAt,
			budget.updated_at AS updatedAt
		FROM budgets budget
		INNER JOIN categories category ON category.id = budget.category_id
		ORDER BY lower(category.name), budget.period;
	`);

const getBudgetRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<Budget | null> =>
	database.getFirstAsync<Budget>(
		`
			SELECT
				budget.id,
				budget.category_id AS categoryId,
				category.name AS categoryName,
				budget.amount,
				budget.period,
				budget.created_at AS createdAt,
				budget.updated_at AS updatedAt
			FROM budgets budget
			INNER JOIN categories category ON category.id = budget.category_id
			WHERE budget.id = ?;
		`,
		id,
	);

const budgetExistsRow = async (
	database: SQLiteDatabase,
	categoryId: string,
	period: string,
	excludeId?: string,
): Promise<boolean> => {
	const row = excludeId
		? await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`SELECT id FROM budgets WHERE category_id = ? AND period = ? AND id != ? LIMIT 1;`,
				categoryId,
				period,
				excludeId,
			)
		: await database.getFirstAsync<Pick<SimpleEntity, "id">>(
				`SELECT id FROM budgets WHERE category_id = ? AND period = ? LIMIT 1;`,
				categoryId,
				period,
			);
	return row !== null;
};

const upsertBudgetRow = async (
	database: SQLiteDatabase,
	budget: Budget,
): Promise<void> => {
	const result = await database.runAsync(
		`UPDATE budgets SET category_id = ?, amount = ?, period = ?, updated_at = ? WHERE id = ?;`,
		budget.categoryId,
		budget.amount,
		budget.period,
		budget.updatedAt,
		budget.id,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		`
			INSERT INTO budgets (
				id, category_id, amount, period, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?);
		`,
		budget.id,
		budget.categoryId,
		budget.amount,
		budget.period,
		budget.createdAt,
		budget.updatedAt,
	);
};

const deleteBudgetRow = async (
	database: SQLiteDatabase,
	id: string,
): Promise<void> => {
	await database.runAsync("DELETE FROM budgets WHERE id = ?;", id);
};

const getExchangeRateRows = async (
	database: SQLiteDatabase,
): Promise<readonly ExchangeRate[]> =>
	database.getAllAsync<ExchangeRate>(`
		SELECT
			currency_code AS currencyCode,
			rate_to_inr AS rateToInr,
			source,
			fetched_at AS fetchedAt,
			updated_at AS updatedAt
		FROM exchange_rates
		ORDER BY currency_code;
	`);

const upsertExchangeRateRow = async (
	database: SQLiteDatabase,
	rate: ExchangeRate,
): Promise<void> => {
	const result = await database.runAsync(
		`UPDATE exchange_rates SET rate_to_inr = ?, source = ?, fetched_at = ?, updated_at = ? WHERE currency_code = ?;`,
		rate.rateToInr,
		rate.source,
		rate.fetchedAt,
		rate.updatedAt,
		rate.currencyCode,
	);
	if (result.changes > 0) return;
	await database.runAsync(
		`
			INSERT INTO exchange_rates (
				currency_code, rate_to_inr, source, fetched_at, updated_at
			) VALUES (?, ?, ?, ?, ?);
		`,
		rate.currencyCode,
		rate.rateToInr,
		rate.source,
		rate.fetchedAt,
		rate.updatedAt,
	);
};

const financeRepository = {
	budgetExistsRow,
	categoryNameExistsRow,
	createSourceRow,
	createTransactionRow,
	createTransactionItemRow,
	deleteBudgetRow,
	deleteCategoryBudgetRows,
	deleteCategoryRow,
	deleteSectorRow,
	deleteSimpleEntityRow,
	deleteSourceRow,
	deleteTransactionRow,
	deleteTransactionItemRow,
	deleteTransactionItemRows,
	expireStaleValidatedSourceRows,
	getArchivedCategoryRows,
	getArchivedInvestmentRows,
	getArchivedSourceRows,
	getArchivedTripRows,
	getBudgetRow,
	getBudgetRows,
	getCategoryAnalysisRows,
	getCategoryRow,
	getCategoryRows,
	categoryInUseRow,
	getExchangeRateRows,
	getInvestmentAnalysisRows,
	getInvestmentRow,
	getInvestmentRows,
	getInvestmentTypeRow,
	getInvestmentTypeRows,
	getLinkedTransactionIdRows,
	getSectorAnalysisRows,
	getSectorCategoryIdRows,
	getSectorCategoryOwnerRows,
	getSectorRow,
	getSectorRows,
	getSourceRow,
	getSourceRows,
	getTransactionCurrencyRows,
	getTransactionMinMaxDate,
	getTransactionItemRows,
	getTransactionPageRows,
	getTransactionRow,
	getTransactionRows,
	getApplicableTransactionRows,
	getTripRow,
	getTripRows,
	getTripTotalRows,
	tripInUseRow,
	investmentInUseRow,
	investmentTypeNameExistsRow,
	insertTransactionRow,
	invalidateTransactionSources,
	mergeCategoryRows,
	replaceSectorCategoryRows,
	sectorNameExistsRow,
	setCategoryArchivedRow,
	setSimpleEntityArchivedRow,
	setSourceArchivedRow,
	simpleEntityNameExistsRow,
	sourceInUseRow,
	sourceNameExistsRow,
	updateSourceNameRow,
	updateTransactionRow,
	updateTransactionRelationRow,
	upsertBudgetRow,
	upsertCategoryRow,
	upsertExchangeRateRow,
	upsertInvestmentRow,
	upsertInvestmentTypeRow,
	upsertSectorRow,
	upsertSimpleEntityRow,
	validateSourceRow,
};

export default financeRepository;
