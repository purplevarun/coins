# `.pc` / `.pczip` backup files

**Status: plaintext.** Encryption was removed — backups are plain SQLite.

- Exports write `.pczip`: a standard ZIP archive (deflate level 9) containing
  one entry, `purplecoins.db`, which is the exact bytes
  `database.serializeAsync()` returns. ~72% smaller than the raw database.
- Restore accepts `.pczip`, `.pc`, and legacy `.purplecoins`. Content is
  auto-detected by the `PK\x03\x04` zip magic — anything else is treated as a
  raw SQLite image.
- `.pczip` files open in any zip tool (`unzip -p file.pczip > db.sqlite`).

## Legacy: PCENC1 encrypted backups

Older exports were PCENC1-encrypted (XChaCha20-Poly1305 over the SQLite image,
48-byte header — see git history for the full spec). The app no longer
encrypts or decrypts; `tools/pc-backup.ts` can still decrypt PCENC1 files:

```
bun tools/pc-backup.ts decrypt old-backup.pc   # -> .db (also unzips .pczip)
bun tools/pc-backup.ts pack db.sqlite          # -> .pczip
bun tools/pc-backup.ts info file.pc
```
