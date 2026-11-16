# Encrypted `.pc` backups

Design for encrypting Purplecoins backup files so vault data (passwords, card
numbers, CVVs, PINs) is not readable outside the app. This is a spec to
implement later — no code yet.

## Goals

- A `.pc` file on disk / in transit is ciphertext, not a raw SQLite image.
- Only the app can open it: restore detects the format and decrypts before the
  existing `restoreBackup` flow runs.
- Backwards compatible: plain SQLite backups (today's format) must keep
  restoring forever.

## Honest threat model

"Only the app can open it" means the key must live inside the app binary. That
stops casual inspection and anyone who grabs the file from a share sheet or
cloud drive — it does **not** stop a determined attacker who decompiles the
APK. For real protection we additionally derive the key from a user passphrase
(optional layer below). Treat the embedded key as obfuscation + a hard format
boundary, not as a vault-grade secret.

## File format

```
+-------------------------------------------+
| magic   "PCENC1"                (6 bytes) |
| version u8                      (1 byte)  |
| kdf     u8  0=app-key 1=passphrase        |
| salt    16 bytes                          |
| nonce   24 bytes (XChaCha20)              |
| ciphertext + Poly1305 tag       (rest)    |
+-------------------------------------------+
```

- Magic `PCENC1` lets `restoreBackup` branch: header present → decrypt;
  absent → treat as legacy plaintext SQLite (current path untouched).
- Everything after `nonce` is one AEAD blob: the exact bytes
  `database.serializeAsync()` returns today.

## Algorithm

- **Cipher:** XChaCha20-Poly1305 (AES-256-GCM is an acceptable substitute;
  XChaCha20's 24-byte random nonce removes nonce-misuse risk).
- **KDF:**
    - `kdf=0` (default, app-key): `key = HKDF-SHA256(ikm=APP_SECRET, salt=salt,
info="purplecoins-backup")` where `APP_SECRET` is a 32-byte constant
      generated once and shipped in the binary.
    - `kdf=1` (optional passphrase): `key = Argon2id(passphrase, salt,
m=64MB, t=3, p=1)`; fallback `PBKDF2-HMAC-SHA256` with ≥600k iterations
      if Argon2 is unavailable.

## Implementation notes (when we build it)

- `expo-crypto` only ships hashing — not AEAD or Argon2. Pick a native lib
  that works in Expo (`react-native-quick-crypto`, or `libsodium` via
  `react-native-libsodium` — preferred: it gives XChaCha20-Poly1305 +
  Argon2id in one dependency).
- `exportBackup`: `serializeAsync()` → encrypt → write ciphertext. Also
  write an integrity check marker inside the plaintext (already covered by
  `pragma_integrity_check` today — run it before encrypting).
- `restoreBackup`: read first 6 bytes → `PCENC1` → parse header → decrypt to
  a temp file → continue with existing open-validate-merge flow. Wrong key /
  corrupted tag → `AppError("BACKUP_DECRYPT_FAILED", ...)`.
- Passphrase prompt (`kdf=1`): on export ask the user; on restore prompt only
  when the header says passphrase. Never store the passphrase.
- Rename both `BACKUP_EXTENSION` consumers minimally — keep `.pc`; the magic
  header, not the extension, defines encryption.
- Tests: round-trip encrypt/decrypt, legacy plaintext restore still works,
  bad-tag rejection, wrong-passphrase rejection, header parsing edge cases.
