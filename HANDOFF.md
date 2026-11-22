# HANDOFF — Purplecoins session context

Everything learned building + verifying the Nov 2025 feature set. Read alongside
`AGENTS.md` (conventions) — this file is the "how things actually work" companion.

## Environment

- `node` is NOT on PATH — it lives at `/opt/homebrew/opt/node/bin/node`.
  Prefix commands with `export PATH=/opt/homebrew/opt/node/bin:$PATH` (bun works without it).
- `adb`/`emulator` on PATH; SDK at `~/Library/Android/sdk`, apksigner in `build-tools/35.0.0`.
- One AVD: `Local_AVD` (emulator-5554). `./run avd` starts it.
- **The AVD clock is ~4 days behind the host.** Any fixture timestamps must be
  generated from `adb shell date +%s%3N`, not host `time.time()`.
- `gh` is installed + authed as `purplevarun`. GitHub remote: `purplevarun/coins`.
- `local.properties` is wiped by clean prebuild — `./run build` recreates it.

## Feature map (what was built)

| Feature                                                                                                           | Where                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.pczip` export/import (plain zip of the db, ~72% smaller)                                                        | `src/services/backupService.ts` (`fflate`, `isZipArchive`/`extractDatabase`), restore accepts `.pczip`/`.pc`/`.purplecoins`                                                                                      |
| App-side backup encryption REMOVED (plain SQLite in/out); legacy PCENC1 decrypt kept only in `tools/pc-backup.ts` | `tools/pc-backup.ts`, spec in `ENCRYPTION.md`                                                                                                                                                                    |
| APK size 19.68→17.58MB                                                                                            | Direct `import Ionicons from "@expo/vector-icons/Ionicons"` in 28 files — the named import eagerly bundles all 19 icon TTFs                                                                                      |
| CREDIT multi-item                                                                                                 | `src/screens/TransactionFormScreen.tsx` (`isItemized` = GENERAL DEBIT                                                                                                                                            | CREDIT), `src/services/analysisService.ts`, `src/utils/trends.ts` (itemized CREDIT counted via per-item refund logic) |
| Notification alerts — REMOVED 2026.11.23.00                                                                       | Whole feature deleted: `ValidationReminder` opened `purplecoins.db` directly (hourly WorkManager + sync on app start) → "database is locked" crash; the listener also lacked a manifest entry so it never worked |
| Release signing                                                                                                   | `plugins/withReleaseSigning.js` + gitignored `release.keystore`/`keystore.properties` at root                                                                                                                    |

## Hard-won pitfalls (each cost real debugging time)

- **expo-sqlite stores DBs at `filesDir/SQLite/`**, NOT `getDatabasePath()`. Native
  code must open `File(context.filesDir, "SQLite/purplecoins.db")`.
- `sources.archived` is **NULL**, not 0, in real data — always `COALESCE(archived, 0)`.
- `transactions.id` and `transaction_items.id` have **no unique indexes** — `INSERT OR
REPLACE` silently duplicates rows when re-running transforms.
- Native code must NEVER open `filesDir/SQLite/purplecoins.db` directly — a second
  connection races expo-sqlite (esp. the foreground `VACUUM`) and throws
  "database is locked". Removed alert feature did exactly this.
- The restore flow rejects backups that lack all 4 core tables
  (`transactions`, `sources`, `categories`, `transaction_items`) AND requires the
  merged tables' column sets to match — minimal fixtures fail with
  `INVALID_BACKUP_DATABASE`. Use a real backup as the fixture base.
- Screen tests mock `useState` positionally — items index is 18 (1-based) in
  TransactionFormScreen.
- `zipSync({})` emits `PK\x05\x06` (EOCD only) — does NOT pass the `PK\x03\x04`
  magic check, so empty zips fall through to the raw-SQLite path.

## Test/verify recipes

- `./run avd-backup-test <file>` — fresh install + empty-state checks + restore +
  populated checks (fails only if fixture lacks trips — over-asserts).
- `./run avd-ui` — accessibility dump for UI driving; taps via `adb shell input tap`.
- File picker: files pushed to `/sdcard/Download/` appear in DocumentsUI.
- `./run test` = typecheck + vitest coverage (100% global thresholds) + eslint
  (`--max-warnings=0`). `non-null assertion` and `as` casts differ in lint — `!`
  is banned in src, `as T` is not.
- Lint rule `react-hooks/set-state-in-effect` fires on mount drains — the codebase
  suppresses with reasoned `eslint-disable-next-line` comments.

## Release state

- Latest: `v2026.11.21.01` — release-signed APK (debug signing removed; Play
  Protect block was debug signature + notification-listener + sideload).
- Signature change vs older installs: **must uninstall + reinstall** (export
  `.pczip` backup first).
- Tag mechanics: `./run release` never moves tags — `git tag -f` + `push -f` when
  re-releasing the same version name.
- `modules/*/android/build/` is gitignored (Gradle output inside local modules).
