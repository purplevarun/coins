# Purplecoins

Purplecoins is a local-first Expo Android application for finance, utilities,
and private vault records. SQLite is the source of truth.

## Highlights

- General debit, credit, and transfer transactions
- Split expenses with multiple categorized items in one payment
- Investment debit and credit transactions
- Exact decimal amounts stored as canonical decimal strings
- Cross-currency transfers with independent `amount` and `to_amount`
- Sources, categories, trips, investments, and calendar budgets
- Category-driven analysis with month, year, all-time, and custom periods
- INR analysis backed by persisted manual and API-fetched exchange rates
- Source validation invalidated by linked payment changes
- Notes, todos, folders, passwords, cards, and identity records
- Raw `.pc` SQLite backup export; restore accepts `.pc` and `.purplecoins`

## Finance Rules

- Credits include income, reimbursements, refunds, and redemptions.
- Debits include expenses and invested amounts.
- A general debit has one or more amount/category items, with a shared source,
  date, reason, and optional trip. Its total is the sum of its items.
- A general credit has exactly one category and may have one trip.
- Source balances and transaction counts include each payment once. Category
  analysis and budgets allocate expense amounts using the individual items.
- A blank expense reason defaults to the distinct item category names.
- Creating, editing, or deleting an expense keeps its payment and items atomic.
- An investment transaction has one source and one investment only.
- Transfers have a source, destination, from amount, and to amount.
- Transfers are excluded from category analysis.
- Category net is `credits - debits`.
- `is_income` selects the analysis bucket; the net sign never changes it.
- Investment net is `total invested - total redeemed`.
- Source currency is immutable after creation.

## Transaction Views

The button immediately left of Search switches between day and scroll views.
Day view queries only the selected calendar day. The arrows move between days
without loading the rest of the transaction history.

Scroll view is the default and starts with the 10 most recently created
transactions, regardless of their transaction dates, without a date-range heading.
**Load more** appends the next 10 transactions, or the remaining transactions if
fewer are available. The button is hidden when the list is empty or no more
transactions remain. Failed loads can be retried without discarding already-loaded
rows. Paging uses creation time and transaction ID to keep a stable order when
multiple transactions share the same creation timestamp.

Search and classification filters apply to the loaded transactions. Switching
views retains the selected date and filters; changing views or refreshing data
resets scroll pagination to its first 10 transactions.

Expense search includes item categories and amounts. Category-linked lists show
the matched allocation alongside the payment total. Opening a split payment
allows editing all items together; cloning creates a new payment and new item IDs.

## Transaction Entry

New transactions put amount and category first, with classification, payment type,
source, date, and optional trip available through compact tap-to-edit controls.
These controls share one wrapping flow: their selected values determine their
widths, and there is no fixed number of controls per line.
General debits start with one item; additional items share the same transaction
type, source, date, and trip. Credits remain a single amount and category,
investments use an amount and investment, and transfers keep separate accounts
and received amounts when currencies differ.

The total and Save action remain outside the scrolling form. New amount fields
receive focus automatically, while edit and clone flows retain their existing
values and date rules. Switching a multi-item debit to another mode still requires
confirmation before removing the item breakdown.
General debits use the Add item action in the navigation header; there is no
add-item control inside the item rows. Home navigation remains full-width, with
a compact indicator around the active tab icon.

Display zoom and font scaling are respected. Tabs size to their labels, action rows
wrap when space is limited, and text is allowed to wrap instead of being truncated.
Transaction category and investment fields use the shorter "Select" placeholder
because their labels already identify the field. The layout may reflow on smaller
or zoomed displays while keeping the same actions and complete text available.

### Applicability

Transactions are applicable by default. Turn off **Applicable** in the transaction
form to retain a planned or excluded payment without counting it. These entries
remain visible and editable, with a yellow warning triangle in transaction lists
and search, but do not contribute to source balances, category/budget spending,
trip totals, investment totals, analysis, trends, or required exchange rates.
Excluded transfers affect neither account. The amount shown in the form and list
remains the planned amount.

The flag is stored as `transactions.is_applicable` and survives edits, clones,
merges, conversions, restarts, and backups. Existing transactions and older backups
remain applicable. Changing the transaction date does not automatically change the
flag. Enabling applicability adds the payment to calculations; disabling it removes
its effect. Either transition invalidates affected source validation, while edits
or deletion of an already excluded payment do not. References still protect sources
and categories from deletion even when the linked payment is excluded.

## Themes

Settings > Configuration > Theme offers Obsidian, GitHub, Monokai, One Dark,
VS Code, Gruvbox, and Original (the classic purple). All seven themes are dark.
Obsidian is the default for both new and existing installations. Selection is
explicit, not based on the device's preferred appearance.

The selected ID is stored under `theme` in the existing `settings` table. Changes
apply immediately after a successful save and persist across app restarts and
backup restore. Missing or unknown theme IDs fall back to the Obsidian default.
No schema migration is required. The amethyst launcher icon is shared across
themes.

Components use the shared theme context and cached per-palette styles. Navigation,
inputs, dialogs, charts, and system appearance follow the active palette without
remounting screens. The splash stays visible until the saved theme is loaded.

## Architecture

Dependencies flow in one direction:

```text
Screens and components
        |
Hooks and services
        |
Repositories
        |
Expo SQLite
```

Shared domain types live in `src/types`. Database access is contained in
repositories, business rules live in services, and screens focus on
presentation and interaction.

Keep named types and object type definitions in dedicated type files. Test-only
types live in `test/types`.
Reuse library prop types or existing domain types with `Pick`/`Omit` where suitable.
Native ESLint rejects local type declarations outside the type directories.

## Development

```sh
./run setup
```

Run every local quality gate from the repository root:

```sh
./run format
./run test
./run build
```

The test command verifies strict TypeScript, Vitest with coverage, and ESLint.
Real SQLite tests cover empty and populated restores, incomplete backup schemas,
rollback, exact decimal totals, source validation, and currency conversion.
To also verify an existing backup without modifying it:

```sh
PURPLECOINS_TEST_BACKUP=/path/to/backup.purplecoins ./run test
```

To generate synthetic valid and incomplete backups for native regression testing:

```sh
PURPLECOINS_TEST_ARTIFACTS=/tmp/purplecoins-native-fixtures ./run test
```

Yearly trends include each itemized expense once and use persisted INR exchange
rates. Missing historical rates hide the trend chart with a warning. Source
validation is cleared atomically when a linked payment is created, edited, moved,
or deleted, including both sides of transfers.

## Backups

Settings can export the live database as `purplecoins-YYYY-MM-DD.pc`, a raw SQLite
snapshot. Restore accepts `.pc` and older `.purplecoins` files and checks the
picked file before replacing local data. Documents and record attachments are no
longer supported or included in new backups.

### Database Setup

The app creates any missing current-schema tables automatically using the fully
migrated 2026.10.13 schema as its baseline. Completed migrations have been retired.
`migrateDatabase` runs after schema creation for fresh databases and temporary
restore databases. It drops the retired attachment table and its index, adds the
plain integer `is_applicable` column when absent, and backfills only missing values
to `1`. Column detection uses prepared-statement metadata, without a new PRAGMA or
DDL constraint. Explicit exclusions are preserved. Upgrading an existing installation also removes legacy app-owned preview
and picker cache files once. The database is compacted on the first app start or
foreground return of each local calendar day. Successful completion shows a
"Vacuum done!" toast. The last successful compaction day is stored in settings;
same-day skips and failed attempts do not show a success toast. Failed attempts
are retried on a later open. Importing an older backup
discards its attachments while preserving other records and the original backup
file outside the app cache.
Older, unmigrated databases and backups are no longer automatically upgraded.

Backups must contain every live table, including transaction items. After applying
supported migrations to a temporary copy, restore checks that every required
column exists before replacing any live rows. An incomplete schema is rejected;
a copy failure rolls back the entire replacement. Older app versions may not
understand backups written by newer app versions.

**Privacy:** Backups are unencrypted and may include passwords, card details,
identities, and financial records. Keep them private. Backup files remain ignored
by Git to prevent accidental commits.
