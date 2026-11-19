const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sources (
	id TEXT,
	name TEXT,
	currency_code TEXT,
	archived INTEGER,
	validated_at INTEGER,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS categories (
	id TEXT,
	name TEXT,
	kind TEXT,
	trip_agnostic INTEGER,
	archived INTEGER,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS trips (
	id TEXT,
	name TEXT,
	trip_type_id TEXT,
	archived INTEGER,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS investment_types (
	id TEXT,
	name TEXT,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS investments (
	id TEXT,
	name TEXT,
	investment_type_id TEXT,
	platform_id TEXT,
	archived INTEGER,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS investment_platforms (
	id TEXT,
	name TEXT,
	archived INTEGER,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS trip_types (
	id TEXT,
	name TEXT,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS sectors (
	id TEXT,
	name TEXT,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS sector_categories (
	sector_id TEXT,
	category_id TEXT,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS transactions (
	id TEXT,
	classification TEXT,
	type TEXT,
	is_applicable INTEGER,
	source_id TEXT,
	destination_source_id TEXT,
	amount TEXT,
	to_amount TEXT,
	category_id TEXT,
	trip_id TEXT,
	investment_id TEXT,
	reason TEXT,
	transaction_at INTEGER,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS transaction_items (
	id TEXT,
	transaction_id TEXT,
	category_id TEXT,
	amount TEXT,
	position INTEGER,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS budgets (
	id TEXT,
	category_id TEXT,
	amount TEXT,
	period TEXT,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS exchange_rates (
	currency_code TEXT,
	rate_to_inr TEXT,
	source TEXT,
	fetched_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS passwords (
	id TEXT,
	title TEXT,
	username TEXT,
	password TEXT,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS cards (
	id TEXT,
	name TEXT,
	card_number TEXT,
	card_type TEXT,
	expiry TEXT,
	cvv TEXT,
	pin TEXT,
	network TEXT,
	created_at INTEGER,
	updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
	key TEXT,
	value TEXT,
	updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_transactions_date
	ON transactions(transaction_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created
	ON transactions(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_source
	ON transactions(source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_destination
	ON transactions(destination_source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category
	ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_trip
	ON transactions(trip_id);
CREATE INDEX IF NOT EXISTS idx_transactions_investment
	ON transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_investments_type
	ON investments(investment_type_id);
CREATE INDEX IF NOT EXISTS idx_investments_platform
	ON investments(platform_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_category
	ON transaction_items(category_id);
CREATE INDEX IF NOT EXISTS idx_sector_categories_sector
	ON sector_categories(sector_id);
CREATE INDEX IF NOT EXISTS idx_sector_categories_category
	ON sector_categories(category_id);
`;

export default SCHEMA_SQL;
