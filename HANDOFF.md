# HANDOFF — Purplecoins session context

Everything learned building + verifying the itemized-transactions era. Read alongside
`AGENTS.md` (conventions) — this file is the "how things actually work" companion.

## Environment (Windows)

- `node` is NOT on PATH — lives at `C:\Users\Varun\tools\node-v24.22.3-win-x64\node.exe`.
  Prefix shell commands: `export PATH="/c/Users/Varun/tools/node-v24.22.3-win-x64:$PATH"`.
- `adb`/`emulator` at `C:\Users\Varun\AppData\Local\Android\Sdk\platform-tools`. One AVD
  (emulator-5554) which the user keeps booted; `adb root` works on it.
- Builds need `JAVA_HOME="C:\Users\Varun\tools\jdk-17.0.21.1+2"` exported — JDK is
  installed but NOT in user/machine env vars.
- `~/.gradle/gradle.properties` written: daemon, parallel, build-cache, `-Xmx4g`.
  Defender exclusions added (repos, `.gradle`, Android Sdk, `tools`).
- `./run build` ≈30 min on Windows (clean prebuild → full Kotlin + RN C++ codegen +
  R8 minify). `cd android && ./gradlew assembleDebug` is the fast dev loop.
- `gh` installed + authed as `purplevarun`. Remote: `purplevarun/coins`.
- Git-bash path mangling: `adb push/pull` to Android paths needs `MSYS_NO_PATHCONV=1`.
- The AVD is SLOW on the real 3,346-txn DB: white screen 1–4 min on cold start is
  normal (Hermes + init), not a crash. Sources screen then takes ~1 min — it hydrates
  ALL transactions+items to compute balances in JS (`getApplicableTransactionRows`).

## Data model (current — items-only)

- `transactions` = slim linking row (id, classification, type, trip, reason, dates,
  is_applicable). NO entity columns — parent `source_id`/`category_id`/`investment_id`
  are dropped by migration.
- `transaction_items` carries EVERYTHING: position, `source_id`,
  `destination_source_id`, `to_amount`, `category_id`, `investment_id`, `amount`.
  Every transaction (incl. TRANSFER) has ≥1 item; service synthesizes items from
  legacy top-level fields when input omits them, but explicit `items: []` throws
  `TRANSACTION_ITEMS_REQUIRED`.
- `sources.validated_at` = epoch ms; NULL = pending. `sources.archived` is
  NULL/0/1 in real data — NULL means unarchived, always `COALESCE`/truthiness-check.
- `trips.trip_type_id` → `trip_types` (all 25 trips typed as of fixed.pczip).
- CARDs display: position-0 item hydrates the transaction's display entity fields.

## Feature map

| Feature                                                                                    | Where                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item-only transactions (per-item source/dest/category/investment/to_amount)                | `transactionService.ts`, `financeRepository.ts`, `migrations.ts` (set-based backfill + column drop)                                                |
| Per-item source select on every row; no top-level Source in form                           | `TransactionFormScreen.tsx` — top-level `sourceId` state KEPT as item fallback (`rawItem.sourceId ?? input.sourceId`)                              |
| "Item N of M" heading always visible; remove-btn only when >1                              | `TransactionItemRow.tsx`                                                                                                                           |
| Carousel arrows = standalone HeaderIconButtons (10% width each, card 80%, no grey card bg) | `TransactionFormScreen.tsx` styles                                                                                                                 |
| Sources header Validate button → jumps filter to Pending                                   | `SourcesScreen.tsx` (`setSourceFilter("PENDING_VALIDATION")`)                                                                                      |
| 48h validation expiry — sweep on every cold open                                           | `initializeDatabase.ts` calls `sourceService.expireStaleSourceValidations`; cutoff = now − `SOURCE_VALIDATION_STALE_HOURS`×`MILLISECONDS_PER_HOUR` |
| `.pczip` backup export/import; legacy decrypt only in tooling                              | `src/services/backupService.ts`, `tools/pc-backup.ts`                                                                                              |
| Release signing                                                                            | `plugins/withReleaseSigning.js` + gitignored `release.keystore`/`keystore.properties` — back them up OUTSIDE the repo                              |

## Hard-won pitfalls

- **Screen tests mock `useState` POSITIONALLY.** Current TransactionFormScreen order:
  1=classification, 2=type, 3=sourceId, 4=tripId, 5=reason, 6=transactionAt,
  7=sources, 8=categories, 9=trips, 10=investments, 11=isSaving, 12=error,
  13=items, 14=isApplicable, 15=itemsWidth, 16=activeItemIndex. Removing/inserting
  a `useState` shifts every later index — update map entries AND `return [N, setter]`
  literals, and watch the mechanical-regex trap (`\[\s*NUM` spans lines).
- **vitest, not jest** — `npx vitest run <file>` (`npx jest` pulls a stale binary).
- 100% coverage enforced — `??`/`||` dead arms must be deleted or given a fixture
  that hits them (e.g. `items ?? []` is dead when `items` is non-optional).
- `invalidateTransactionSources` must BRACKET item writes in `saveTransaction`
  (old items before delete, new items after insert) — running it post-UPDATE reads
  empty items and misses sources. Fixed at `transactionService.saveTransaction`.
- `getLinkedTransactionIdRows` needs `SELECT DISTINCT` — one row per matching ITEM
  otherwise splits a txn once per same-entity item (duplicated rows bug).
- **`initializeDatabase` test must mock the service boundary** — importing
  `sourceService` for real pulls `expo-crypto` → `react-native` Flow source →
  rolldown parse failure. Mock `@/services/sourceService`, assert delegation.
- expo-sqlite stores DBs at `files/SQLite/`; poke the real DB via
  `adb root` + `sqlite3 /data/data/com.purple.coins/files/SQLite/purplecoins.db`
  and `chown u0_aXXX` after `adb push` (app uid from `ps -A | grep coins`).
- Real-DB upgrade test recipe: push the actual `.pczip`-extracted legacy DB over the
  app DB, `chown`, launch → migration backfills under "Opening the vault…".
- `transactions.id`/`transaction_items.id` have NO unique indexes — hand-edited
  backup transforms must dedupe themselves.
- `./run build` clean-prebuilds — `android/` + `local.properties` regenerated;
  persist build config in `app.json` (`expo-build-properties`), never in `android/`.
- `git status` shows ~30 ` M` entries that are CRLF-normalization noise — `git add -A`
  stages only real diffs; don't panic-stage phantom changes.
- Restore-bearing tests (real backup fixtures) need `it(..., fn, 20000)` timeouts —
  coverage instrumentation pushes them past the 5s default under load.

## Delivered artifacts outside the repo

- `Desktop\fixed.pczip` + `Downloads\purplecoins-2026-11-26-fixed.pczip` — user's real
  backup fixed (9 INDmoney transfers→GENERAL, 3 credits→Investment Charges, INDmoney
  entity deleted, all trips typed, renames "Work + Buggu"→"Meeting Reet",
  "Life"→"Relocation"). In ORIGINAL legacy schema — app migrates on restore.
- `mockups/` dir = user's own untracked mockups — keep out of commits.

## Future plans / open items

- **Perf:** `getSources`/`getApplicableTransactionRows` hydrate every txn+item to
  compute balances in JS — the emulator takes ~1 min on Sources. Candidate for
  SQL-side or cached/lazy balance computation. Cold-start init likewise heavy.
- **Validation:** `SOURCE_VALIDATION_STALE_HOURS = 48` in `financeConstants.ts` is the
  knob. Sweep runs inside `initializeDatabase` after migrations — also runs on
  backup restore (intended).
- `./run release` needs node on PATH; tags `v<version>` + uploads the APK at
  `android/app/build/outputs/apk/release/`. Never moves an existing tag — force-move
  manually when re-releasing.
- **Signature change vs pre-signing installs: must uninstall + reinstall** (export
  `.pczip` first) — still true for any user on a pre-`v2026.11.21` build.

## Release state

- Latest: `v2026.11.27.00` (commit `6021772`) — 48h validation sweep.
- `v2026.11.26.02` (`33a8a41`) — per-item sources UI, Item-N-of-M, Sources validate
  button. `v2026.11.26.01` (`1615c3a`) — items-only refactor.
- `main` fully pushed; working tree clean.
