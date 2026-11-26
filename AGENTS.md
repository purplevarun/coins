# Command Execution Policy (Highest Priority)

1. For build, always use `./run build`.
2. For testing, always use `./run test`.
3. For uploading github release, always use `./run release`.

# Database Rules

1. No PRAGMA
2. No Constraints, No Checks
3. DDL will be very simple - just the tables and indexes
4. Any new migration will be added to migrations file and also in the default schema for new installs!

# Transaction Data Rules

1. EVERY transaction is itemized — it must have at least one `transaction_items` row.
   All entity attribution lives ONLY on the items: `source_id`, `destination_source_id`,
   `category_id`, `investment_id`, `to_amount`. The `transactions` row keeps txn-level
   fields only (classification, type, reason, `amount`/`to_amount` = item sums, `trip_id`,
   `is_applicable`, `transaction_at`) — it is a linking/context row, never an entity carrier.
2. Every item carries `source_id` (the wallet it debits from / credits into). Items may
   share or differ in `source_id` — that is how one payment splits across wallets.
3. GENERAL DEBIT/CREDIT items carry `category_id`; INVESTMENT DEBIT/CREDIT items carry
   `investment_id`; TRANSFER items carry `destination_source_id` + `to_amount` (and
   `investment_id` when the transfer funds an investment). Never mix entity kinds on one item.
4. NEVER create an INVESTMENT transaction without `investment_id` on its items; NEVER create
   a GENERAL DEBIT/CREDIT transaction without `category_id` on its items.
5. Buys/sells/dividends/investment returns/related wallet movements = `INVESTMENT` + one or more
   `transaction_items` rows each linked to an `investment_id` (splits one payment across investments).
6. Fees, commissions and charges = `GENERAL` DEBIT + an expense category (e.g. `Investment Charges`, `Bank Charges`).
7. Transfers between own sources = `TRANSFER`; an `INVESTMENT` DEBIT funds an investment
   instead — do not use TRANSFER for that.
8. After inserting/editing transactions, ALWAYS run a sweep for violations:
   `transactions` rows with no `transaction_items`, items with NULL `source_id`,
   GENERAL DEBIT/CREDIT items without `category_id`, INVESTMENT DEBIT/CREDIT items
   without `investment_id`, TRANSFER items without `destination_source_id`, and items
   carrying both `category_id` and `investment_id`. Fix before delivering.

# Backup (.pc) Data Editing — hard-won rules

Applies when hand-editing `.pc` backup files (SQLite). Every rule below exists because
a mistake was made without it:

1. NEVER recategorize by updating a row on the wrong table — entity fields live on
   `transaction_items` (`category_id`, `investment_id`, `source_id`, `destination_source_id`,
   `to_amount`). Update the item rows; keep `transactions.amount`/`to_amount` as item sums.
2. Every transaction created must get at least one `transaction_items` row (position 0,
   same amount + the appropriate entity fields) or it is invisible — the select joins the
   position-0 item and the form shows an empty item list.
3. NEVER hand-compute epoch timestamps blind — a date constant was off by a full day once.
   Verify `transaction_at` against existing rows on the same calendar date after insert.
4. Schema conventions: `id` = uuid string, `amount` = TEXT, `created_at`/`updated_at`/
   `transaction_at` = epoch millis.
5. Repo delete hooks hard-delete and require zero references — they delete `sector_categories`
   rows first, so sectors tables must exist BEFORE running the delete in one batch.
6. Older backups may lack newer tables (e.g. `sectors`/`sector_categories`) — safe to
   pre-create, the app uses CREATE TABLE IF NOT EXISTS in migrations.
7. NEVER add "adjustment" transactions when the real value is derivable — reconcile against
   real statements; only adjust when genuinely unknowable (and flag it in the reason).
8. Known external conventions: INDmoney posts commissions the day AFTER trades (~0.30%),
   Groww credits settle as combined wallet amounts.
9. Always edit the working copy first, then `cp` to every delivered location — and RE-SYNC
   after any later edit. Verify delivered files by md5, not assumption.
10. Final checklist before delivering an edited .pc: `PRAGMA integrity_check` ok, zero
    orphaned `investment_id`/`category_id`/`source_id`/`trip_id` refs, rule-sweep clean
    (section above), and wallet/source balances recomputed from scratch match expectations.

# Scope Control

- Make the minimum change required to satisfy the request.
- Do not refactor unrelated code.
- Do not rename files unless necessary.
- Do not modify unrelated tests.
- Do not introduce new libraries without user approval.
- Reuse existing implementations before creating new ones.
- Search for similar patterns before adding new code.

# Repository Exploration

- Before creating a new file, search for an existing equivalent.
- Before creating a new component, hook, service, utility, constant or helper, search the repository for an existing implementation.
- Extend existing code instead of duplicating functionality.
- Do not create alternative implementations of existing logic.

# Token Usage

- Read only files relevant to the task.
- Avoid scanning the entire repository unless explicitly required.
- Avoid repeatedly opening the same files.
- Avoid generating large plans for small changes.
- Avoid explaining obvious code.
- Keep implementation summaries concise.
- Prefer targeted file inspection over broad repository analysis.
- Do not repeatedly run the same command unless the previous result indicates it is necessary.

# Change Size Limits

- Do not modify more files than necessary.
- Prefer updating existing files over creating new files.
- Create new files only when no suitable location exists.
- Keep pull-request scope focused on the requested change.

# Debugging Strategy

When a build or test fails:

1. Identify the root cause.
2. Explain the root cause briefly.
3. Implement the smallest fix possible.
4. Re-run validation.
5. Stop once the issue is resolved.

Do not perform speculative fixes.

# Testing & Release Notes

- Screen tests mock `useState` POSITIONALLY by call index — adding a `useState` before
  existing ones shifts every index and breaks the harness. Add new state AFTER existing hooks,
  or update the mock indices.
- `./run release` re-uploads assets (`--clobber`) but does NOT move an existing tag — force-move
  it manually (`git tag -f <v> <sha> && git push -f origin <v>`) when re-releasing.
- `./run build` does a CLEAN prebuild — `android/` is regenerated and ALL manual edits there
  (gradle.properties, build.gradle) are wiped. Persist build config in `app.json` via
  `expo-build-properties` (e.g. `buildArchs`, `enableMinifyInReleaseBuilds`), not in android/.
- Version format is `YYYY.MM.DD.XX` where XX is a per-day build counter starting at 00.
  versionCode = YYYY*1e6 + MM*1e4 + DD*100 + XX.
- ALWAYS bump `.version` (and sync `app.json` version/versionCode + `package.json`
  version) BEFORE making any other changes in a work session — new version = today's
  date + counter starting at 00 (increment the counter if a version for today already
  exists).
- Release builds are signed with `release.keystore` at the repo root via
  `plugins/withReleaseSigning.js` (reads `keystore.properties`). BOTH files are
  gitignored — losing the keystore means users must uninstall before updating.
  Back it up outside the repo. PKCS12 keystores require storePassword ==
  keyPassword.

# Completion Requirements

Before marking work as complete:

- Run `./run format`
- Run `./run test`
- Ensure 100% coverage on modified code
- Ensure build passes
- Remove dead code
- Remove unused imports
- Verify no duplicated logic exists

# Code Quality

- Follow existing project architecture.
- Follow existing naming conventions.
- Keep the code DRY.
- Prefer composition over duplication.
- Prefer constants over magic strings.
- Extract reusable logic when duplicated 2+ times.
- Avoid unnecessary comments when code is self-explanatory.

# Constants

- Use `*constants.ts` files for all shared constants.
- Extract hardcoded strings into constants when reused.
- Do not introduce magic strings in business logic.
- Group related constants together.

# Confidence

Before making assumptions:

- Search the codebase for evidence.
- If evidence cannot be found, explicitly state:
  "I could not find evidence for this assumption."
