const COMMON = {
	ARCHIVE_CONFIRM:
		"It will be hidden from lists and dropdowns everywhere. You can restore it anytime from Settings \u2192 Archived relations.",
	ADD: "Add",
	ARCHIVE: "Archive",
	CANCEL: "Cancel",
	CLOSE_SEARCH: "Close search",
	COPY: "Copy",
	CREATE: "Create",
	DELETE: "Delete",
	EDIT: "Edit",
	CHANGE: "Change",
	CONTINUE: "Continue",
	HIDE: "Hide",
	IRREVERSIBLE: "This action cannot be undone.",
	LOAD_MORE: "Load more",
	NEW: "New",
	NO_SEARCH_RESULTS: "No results match your search.",
	RETRY: "Retry",
	RESTORE: "Restore",
	SAVE: "Save",
	SEARCH: "Search",
	SELECT: "Select",
	SEND: "Send",
	VALIDATE: "Validate",
	VACUUM_DONE: "Vacuum done!",
	VIEW: "View",
	UNABLE_TO_ARCHIVE: "Unable to archive",
	UNABLE_TO_DELETE: "Unable to delete",
} as const;

const HOME = {
	ANALYSIS_LABEL: "Analysis",
	ANALYSIS_SUBTITLE: "Category-driven",
	CARDS_LABEL: "Cards",
	CARDS_SUBTITLE: "Payment details",
	CATEGORIES_LABEL: "Categories",
	CATEGORIES_SUBTITLE: "Income & expense",
	INVESTMENTS_LABEL: "Investments",
	INVESTMENTS_SUBTITLE: "Invested & redeemed",
	PASSWORDS_LABEL: "Passwords",
	PASSWORDS_SUBTITLE: "Local credentials",
	SETTINGS: "Settings",
	SOURCES_LABEL: "Sources",
	SOURCES_SUBTITLE: "Accounts & cards",
	TRANSACTIONS_LABEL: "Transactions",
	TRANSACTIONS_SUBTITLE: "Money movements",
	TRIPS_LABEL: "Trips",
	TRIPS_SUBTITLE: "Travel spending",
} as const;

const TRANSACTIONS = {
	EMPTY_MESSAGE: "Add a general or investment transaction.",
	EMPTY_TITLE: "No transactions found",
	LOADING: "Loading transactions",
	NEXT_DAY: "Next day",
	NO_MATCHES_TITLE: "No matching transactions",
	PREVIOUS_DAY: "Previous day",
	SEARCH_PLACEHOLDER: "Search transactions...",
	SWITCH_TO_DAY_VIEW: "Switch to day view",
	SWITCH_TO_SCROLL_VIEW: "Switch to scroll view",
} as const;

const FINANCIAL_METRICS = {
	EXPENSES: "Expenses",
	INCOME: "Income",
	NET: "Net",
} as const;

const SOURCES = {
	EMPTY_MESSAGE: "Add your first source to get started.",
	EMPTY_TITLE: "No sources yet",
	FILTERED_MESSAGE: "No sources match the selected filters.",
	NO_MATCHES_TITLE: "No matching sources",
	SEARCH_PLACEHOLDER: "Search sources...",
	UNABLE_TO_VALIDATE: "Unable to validate",
} as const;

const CATEGORIES = {
	EMPTY_MESSAGE: "Add your first category to get started.",
	EMPTY_TITLE: "No categories yet",
	NO_MATCHES_TITLE: "No matching categories",
	REFUND_NET_PREFIX: "Refund net ",
	SEARCH_PLACEHOLDER: "Search categories...",
} as const;

const TRIPS = {
	EMPTY_MESSAGE: "Add your first trip to get started.",
	EMPTY_TITLE: "No trips yet",
	NO_MATCHES_TITLE: "No matching trips",
	SEARCH_PLACEHOLDER: "Search trips...",
	TAB_TRIPS: "Trips",
	TAB_TYPES: "Types",
	TYPES_EMPTY_MESSAGE: "Add your first trip type to get started.",
	TYPES_EMPTY_TITLE: "No Trip Types yet",
	TYPES_NO_MATCHES_TITLE: "No matching trip types",
} as const;

const INVESTMENTS = {
	EMPTY_MESSAGE: "Add your first investment to get started.",
	EMPTY_TITLE: "No investments yet",
	INVESTMENTS_TAB: "Investments",
	NO_MATCHES_TITLE: "No matching investments",
	NO_PLATFORM: "No platform",
	NO_TYPE: "No type",
	PLATFORMS_EMPTY_MESSAGE: "Add your first platform to get started.",
	PLATFORMS_EMPTY_TITLE: "No Investment Platforms yet",
	PLATFORMS_NO_MATCHES_TITLE: "No matching platforms",
	PLATFORMS_TAB: "Platforms",
	SEARCH_PLACEHOLDER: "Search investments...",
	TYPES_EMPTY_MESSAGE: "Add your first investment type to get started.",
	TYPES_EMPTY_TITLE: "No Investment Types yet",
	TYPES_NO_MATCHES_TITLE: "No matching investment types",
	TYPES_TAB: "Types",
} as const;

const VAULT = {
	CARD_NUMBER: "Card number",
	CREDIT_CARD: "Credit card",
	DEBIT_CARD: "Debit card",
	EMPTY_MESSAGE: "Add your first local vault entry.",
	EMPTY_TITLE: "Nothing here yet",
	EXPIRY: "Expiry",
	HIDE_CARD_DETAILS: "Hide card details",
	IDENTITY_CARD: "Identity card",
	NO_MATCHES_TITLE: "No matching entries",
	NO_USERNAME: "No username",
	SEARCH_PLACEHOLDER: "Search vault",
	SHOW_CARD_DETAILS: "Show card details",
} as const;

const TRANSACTION_FORM = {
	APPLICABLE: "Applicable",
	NOT_APPLICABLE: "Not applicable",
	ADD_ITEM: "Add item",
	CATEGORY_LABEL: "Category",
	CLASSIFICATION_LABEL: "Transaction type",
	CLONE_TITLE: "Clone transaction",
	DATE_LABEL: "Date",
	DEFAULTS_TO_CATEGORY: "Defaults to the selected category",
	DEFAULTS_TO_INVESTMENT: "Defaults to the selected investment",
	DEFAULTS_TO_ITEMS: "Defaults to the item categories",
	DEFAULTS_TO_TRANSFER: "Defaults to Source A to Source B",
	DELETE_ACTION: "Delete transaction",
	DELETE_TITLE: "Delete transaction?",
	DESTINATION_SOURCE: "Destination source",
	EDIT_TITLE: "Edit transaction",
	INVESTMENT: "Investment",
	NEW_TITLE: "New transaction",
	NO_SOURCES: "Create a source before adding transactions.",
	PAYMENT_TYPE_LABEL: "Payment type",
	REASON_LABEL: "Reason (optional)",
	REMOVE_ITEMS_MESSAGE:
		"Keep the total as one amount and remove the individual expense items?",
	REMOVE_ITEMS_TITLE: "Remove item breakdown?",
	SAVE_ACTION: "Save transaction",
	SELECT_CATEGORY: COMMON.SELECT,
	SELECT_DESTINATION: "Select destination",
	SELECT_INVESTMENT: COMMON.SELECT,
	SELECT_SOURCE: "Select source",
	TRIP_LABEL: "Trip",
} as const;

const VAULT_FORM = {
	CARD_NAME: "Card name",
	CARD_NAME_PLACEHOLDER: "Personal Visa",
	CARD_NUMBER_PLACEHOLDER: "Card number",
	CARD_TYPE: "Card type",
	DELETE_ACTION: "Delete entry",
	DELETE_TITLE: "Delete vault entry?",
	EDIT_CARD: "Edit card",
	EDIT_PASSWORD: "Edit password",
	ENTRY_TITLE: "Entry title",
	EXPIRY_PLACEHOLDER: "MM/YY",
	NETWORK: "Network",
	NETWORK_PLACEHOLDER: "Visa, Mastercard, RuPay...",
	NEW_CARD: "New card",
	NEW_PASSWORD: "New password",
	PASSWORD: "Password",
	PASSWORD_PLACEHOLDER: "Password",
	USERNAME: "Username",
	SAVE_ACTION: "Save entry",
	USERNAME_PLACEHOLDER: "Username or email",
} as const;

const ANALYSIS = {
	ALL_TRANSACTIONS: "All transactions",
	CATEGORY_NET_DESCRIPTION:
		"Credits minus debits for every category. Classification decides the analysis bucket.",
	CATEGORY_NET_TITLE: "Category net",
	CUSTOM_PERIOD: "Custom period",
	EMPTY_MESSAGE: "Add categorized transactions in this period.",
	EMPTY_TITLE: "Nothing to analyse",
	INVESTMENTS_METRIC: "Investments",
	LAST_12_MONTHS: "Last 12 months",
	MANAGE_EXCHANGE_RATES: "Manage exchange rates",
	NET_AFTER_INVESTMENTS_METRIC: "Net after investments",
	SAVINGS_METRIC: "Savings %",
	SEE_ALL_CATEGORIES: "Categories",
	SEE_ALL_INVESTMENTS: "Investments",
	TREND_DESCRIPTION:
		"Income, expenses and net worth year by year, across every transaction regardless of the selected period.",
	TREND_EMPTY_MESSAGE: "Add transactions to see trends over time.",
	TREND_EMPTY_TITLE: "No trend data",
	TRENDS_TITLE: "Trends",
} as const;

const SETTINGS = {
	ARCHIVED_RELATIONS: "Archived relations",
	BACKUP_PREPARED: "Backup prepared successfully.",
	BACKUP_RESTORED: "Backup restored successfully.",
	DEFAULT_SOURCE: "Default source",
	DEFAULT_TRIP: "Default trip",
	EXPORT: "Export .pc",
	FY_START_MONTH: "Financial year start month",
	NO_DEFAULT_SOURCE: "No default source",
	NO_DEFAULT_TRIP: "No default trip",
	NONE: "None",
	RESTORE: "Restore .pc",
	RELATIONS: "Relations",
	THEME: "Theme",
} as const;

const BUDGETS = {
	CALENDAR_MONTH: "Calendar month",
	CALENDAR_YEAR: "Calendar year",
	DELETE_TITLE: "Delete budget?",
	TITLE: "Budgets",
	EMPTY_MESSAGE: "Set a monthly or yearly target for an expense category.",
	EMPTY_TITLE: "No budgets yet",
	MISSING_RATES:
		"Some foreign-currency spending is excluded until INR exchange rates are set.",
	MONTHLY: "Monthly",
	RESET_NOTICE:
		"Budgets use INR and reset on calendar month or calendar year boundaries.",
	YEARLY: "Yearly",
} as const;

const GLOBAL_SEARCH = {
	EMPTY_MESSAGE: "Type at least two characters.",
	INVESTMENT: "Investment",
	NO_DETAILS: "No details",
	NO_MATCHES: "No matching records found.",
	TRIP: "Trip",
	SEARCH_PLACEHOLDER: "Search all records",
} as const;

const RELATION_DETAILS = {
	INVESTMENT_PLATFORM: "Investment platform",
	INVESTMENT_TYPE: "Investment type",
	NO_INVESTMENTS_LINKED: "No investments linked here.",
	NO_INVESTMENTS_TITLE: "No investments yet",
	NO_TRIPS_LINKED: "No trips linked to this type.",
	NO_TRIPS_TITLE: "No trips yet",
	TRIP_TYPE: "Trip type",
} as const;

const EXCHANGE_RATES = {
	DESCRIPTION:
		"Rates are master values used only for converted category and analysis totals. Transfers always use their stored from and to amounts.",
	EMPTY_MESSAGE: "Add a source with a currency other than INR.",
	EMPTY_TITLE: "No foreign currencies",
	FETCH_LATEST: "Fetch latest rates",
	NO_FOREIGN_CURRENCIES: "No foreign source currencies found.",
	RATE_NOT_SET: "Rate not set",
	SAVE_MANUAL: "Save manual rate",
} as const;

const ARCHIVED = {
	EMPTY_MESSAGE:
		"Anything you archive from Sources, Categories, Trips or Investments will show up here.",
	EMPTY_TITLE: "No archived relations",
	NO_MATCHES_MESSAGE: "No archived relations match your search.",
	RESTORE_CONFIRM:
		"It will be visible again in lists and dropdowns everywhere.",
	SEARCH_PLACEHOLDER: "Search archived relations...",
	UNABLE_TO_RESTORE: "Unable to restore",
} as const;

const ANALYSIS_DETAILS = {
	INVESTMENTS_EMPTY_MESSAGE: "No investment activity in this period.",
	INVESTMENTS_EMPTY_TITLE: "No investment activity",
	CATEGORIES_EMPTY_MESSAGE: "No categories in this period.",
} as const;

const BUDGET_FORM = {
	CATEGORY_LABEL: "Expense category",
	EDIT_TITLE: "Edit budget",
	NEW_TITLE: "New budget",
	PERIOD_HINT:
		"The period follows calendar boundaries, not a rolling window.",
	SAVE_ACTION: "Save budget",
	SELECT_CATEGORY: "Select category",
} as const;

const RELATION_FORMS = {
	CATEGORY_NAME: "Category name",
	CURRENCY_LOCKED:
		"Currency is fixed after a source is created. Only the source name can be edited.",
	EDIT_CATEGORY: "Edit category",
	EDIT_INVESTMENT: "Edit investment",
	EDIT_INVESTMENT_TYPE: "Edit investment type",
	EDIT_PLATFORM: "Edit investment platform",
	EDIT_SOURCE: "Edit source",
	EDIT_TRIP: "Edit trip",
	EDIT_TRIP_TYPE: "Edit trip type",
	INVESTMENT_NAME: "Investment name",
	INVESTMENT_TYPE: "Investment type",
	NEW_CATEGORY: "New category",
	NEW_INVESTMENT: "New investment",
	NEW_INVESTMENT_TYPE: "New investment type",
	NEW_PLATFORM: "New investment platform",
	NEW_SOURCE: "New source",
	NEW_TRIP: "New trip",
	NEW_TRIP_TYPE: "New trip type",
	RECLASSIFY_MESSAGE:
		"This will reclassify the category across all historical analysis.",
	RECLASSIFY_TITLE: "Change analysis classification?",
	SELECT_TRIP_TYPE: "Select trip type",
	SOURCE_NAME: "Source name",
	TRIP_NAME: "Trip name",
} as const;

const LINKED_TRANSACTIONS = {
	EMPTY_TITLE: "No linked transactions",
} as const;

const RELATION_ACTIONS = {
	CATEGORY_CONVERTED_MESSAGE:
		"Category history now belongs to the selected investment.",
	CONVERT: "Convert",
	CONVERTED_TITLE: "Conversion complete",
	CONVERT_TO_CATEGORY: "Convert to category",
	CONVERT_TO_INVESTMENT: "Convert to investment",
	INTO_CATEGORY: "Into category",
	INVESTMENT_CONVERTED_MESSAGE:
		"Investment history now belongs to the selected category.",
	MERGE: "Merge",
	MERGE_CATEGORIES: "Merge categories",
	MERGE_CATEGORY: "Merge category",
	MERGED_MESSAGE: "Category history now belongs to the selected category.",
	MERGED_TITLE: "Categories merged",
	MERGE_MESSAGE:
		"Transactions, expense items and budgets move into the second category, then the first category is deleted. Budgets already on the second category are kept. Source balances stay the same.",
	NEW_CATEGORY: "New category",
	NEW_INVESTMENT: "New investment",
	NO_MERGE_TARGETS: "No other category of this kind",
	SELECT_CATEGORY: "Select category",
	TARGET_CATEGORY: "Target category",
	TARGET_INVESTMENT: "Target investment",
	TO_CATEGORY_MESSAGE:
		"Invested amounts become expense items and redemptions become credits. This investment is then deleted. Source balances stay the same.",
	TO_INVESTMENT_MESSAGE:
		"Debits become invested amounts and credits become redemptions. Mixed expenses are split, trip tags and this category's budgets are removed, then this category is deleted. Source balances stay the same.",
} as const;

const COMPONENTS = {
	CURRENCY: "Currency",
	DATE: "Date",
	EXPIRY: "Expiry",
	FROM: "From",
	NAME: "Name",
	NETWORK: "Network",
	NO_TRIP: "No trip",
	NET_WORTH: "Net worth",
	NO_OPTIONS: "Nothing to select yet.",
	PIN: "PIN",
	PLATFORM: "Platform",
	SEARCH: "Search...",
	SEARCH_PLACEHOLDER: "Search...",
	SELECT_PLATFORM: "Select platform",
	TYPE: "Type",
	TO: "To",
	TITLE: "Title",
	CVV: "CVV",
} as const;

const MESSAGES = {
	ANALYSIS,
	ANALYSIS_DETAILS,
	ARCHIVED,
	BUDGET_FORM,
	BUDGETS,
	CATEGORIES,
	COMMON,
	COMPONENTS,
	EXCHANGE_RATES,
	FINANCIAL_METRICS,
	GLOBAL_SEARCH,
	HOME,
	INVESTMENTS,
	LINKED_TRANSACTIONS,
	RELATION_DETAILS,
	RELATION_ACTIONS,
	RELATION_FORMS,
	SETTINGS,
	SOURCES,
	TRANSACTION_FORM,
	TRANSACTIONS,
	TRIPS,
	VAULT,
	VAULT_FORM,
} as const;

export default MESSAGES;
