# Encrypted `.pc` backups

**Status: implemented.** New exports write PCENC1 ciphertext; restore
auto-detects the format and still accepts legacy plaintext SQLite backups
forever.

## Goals

- A `.pc` file on disk / in transit is ciphertext, not a raw SQLite image.
- Only the app can open it: restore detects the format and decrypts before the
  existing `restoreBackup` flow runs.
- Backwards compatible: plain SQLite backups (the old format) keep restoring.

## Honest threat model

"Only the app can open it" means the key must live inside the app binary. That
stops casual inspection and anyone who grabs the file from a share sheet or
cloud drive — it does **not** stop a determined attacker who decompiles the
APK (`APP_SECRET` is in `src/services/backupEncryption.ts`). A user
passphrase-derived key (`kdf=1`) is the designed escape hatch and is not yet
implemented.

## File format

```
+-------------------------------------------+
| magic   "PCENC1"                (6 bytes) |
| version u8 = 1                  (1 byte)  |
| kdf     u8  0=app-key 1=passphrase        |
| salt    16 bytes                          |
| nonce   24 bytes (XChaCha20)              |
| ciphertext + Poly1305 tag       (rest)    |
+-------------------------------------------+
```

- Header is 48 bytes; everything after `nonce` is one AEAD blob: the exact
  bytes `database.serializeAsync()` returns.
- The header itself is the AEAD's additional authenticated data, so tampering
  with version/kdf/salt/nonce fails decryption.

## Algorithm

- **Cipher:** XChaCha20-Poly1305.
- **KDF (kdf=0, implemented):**
  `key = HKDF-SHA256(ikm=APP_SECRET, salt=salt, info="purplecoins-backup")`.
- **KDF (kdf=1, future):** `key = Argon2id(passphrase, salt, m=64MB, t=3, p=1)`;
  fallback `PBKDF2-HMAC-SHA256` ≥600k iterations. Restore must prompt when the
  header says passphrase. Never store the passphrase.

## Implementation

- `src/utils/crypto.ts` — dependency-free SHA-256 / HMAC / HKDF /
  ChaCha20 / Poly1305 / XChaCha20-Poly1305, verified against RFC 8439, 5869,
  4231 and libsodium vectors in `test/utils/crypto.test.ts`.
- `src/services/backupEncryption.ts` — `APP_SECRET`, header format,
  `encryptBackup` / `decryptBackup` / `isEncryptedBackup`.
- `src/services/backupService.ts` — `exportBackup` integrity-checks,
  serializes, then encrypts; `restoreBackup` branches on the `PCENC1` magic
  (absent → legacy plaintext path, unchanged). Bad tag / wrong key →
  `AppError("BACKUP_DECRYPT_FAILED")`.
- No native or third-party crypto dependency: Hermes BigInt powers Poly1305.

## Working with `.pc` files (agents & scripts)

`tools/pc-backup.ts` is a bun script sharing the app's exact crypto code:

```bash
bun tools/pc-backup.ts info backup.pc        # PCENC1 or legacy plaintext?
bun tools/pc-backup.ts decrypt backup.pc     # -> backup.db (plaintext passes through)
bun tools/pc-backup.ts decrypt backup.pc out.db
bun tools/pc-backup.ts encrypt edited.db     # -> edited.pc (app-restorable)
```

Typical audit/edit flow — same as working with a raw `.db`:

```bash
bun tools/pc-backup.ts decrypt latest.pc work.db
sqlite3 work.db "UPDATE ... ;"
bun tools/pc-backup.ts encrypt work.db latest.pc
```

Any standard XChaCha20-Poly1305 + HKDF-SHA256 toolchain can also produce
app-readable files: derive `key = HKDF-SHA256(APP_SECRET, salt,
"purplecoins-backup")`, then seal with the 48-byte header as AAD. `APP_SECRET`
(hex) is the byte array in `src/services/backupEncryption.ts`; a known-good
interop fixture lives in `test/services/backupEncryption.test.ts`
("matches a libsodium-produced PCENC1 file").
