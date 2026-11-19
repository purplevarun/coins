// PCENC1 encrypted backup files — see ENCRYPTION.md for the format spec.
// Pure TS: this module is importable outside the app (bun tools, tests) so
// agents and scripts can decrypt .pc files with the same code the app uses.

import AppError from "@/errors/AppError";
import {
	hkdfSha256,
	xchacha20Poly1305Open,
	xchacha20Poly1305Seal,
} from "@/utils/crypto";

const MAGIC = new Uint8Array([0x50, 0x43, 0x45, 0x4e, 0x43, 0x31]); // "PCENC1"
const HEADER_LENGTH = 48;
const VERSION = 1;
const KDF_APP_KEY = 0;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 24;
const ENTROPY_LENGTH = SALT_LENGTH + NONCE_LENGTH;
const HKDF_INFO = new TextEncoder().encode("purplecoins-backup");

// 32-byte constant shipped in the binary (kdf=0 mode). This is obfuscation,
// not a vault-grade secret — see ENCRYPTION.md's threat model.
const APP_SECRET = new Uint8Array([
	0x33, 0x62, 0x49, 0x67, 0x4c, 0xbd, 0xaf, 0xea, 0x0b, 0xf3, 0x13, 0x3a,
	0x12, 0xd6, 0x76, 0xe8, 0x19, 0x83, 0x69, 0x50, 0x4d, 0xd3, 0x7c, 0x4f,
	0x40, 0x8b, 0xa6, 0xdd, 0xcc, 0x7f, 0xc9, 0xcb,
]);

const isEncryptedBackup = (data: Uint8Array): boolean =>
	data.length >= HEADER_LENGTH &&
	MAGIC.every((byte, index) => data[index] === byte);

const encryptBackup = (
	plaintext: Uint8Array,
	entropy: Uint8Array,
): Uint8Array => {
	if (entropy.length < ENTROPY_LENGTH) {
		throw new AppError(
			"BACKUP_ENCRYPT_FAILED",
			"Not enough random data to encrypt the backup.",
		);
	}
	const salt = entropy.slice(0, SALT_LENGTH);
	const nonce = entropy.slice(SALT_LENGTH, ENTROPY_LENGTH);
	const header = new Uint8Array(HEADER_LENGTH);
	header.set(MAGIC);
	header[6] = VERSION;
	header[7] = KDF_APP_KEY;
	header.set(salt, 8);
	header.set(nonce, 8 + SALT_LENGTH);
	const key = hkdfSha256(APP_SECRET, salt, HKDF_INFO);
	const ciphertext = xchacha20Poly1305Seal(key, nonce, plaintext, header);
	const sealed = new Uint8Array(HEADER_LENGTH + ciphertext.length);
	sealed.set(header);
	sealed.set(ciphertext, HEADER_LENGTH);
	return sealed;
};

const decryptBackup = (data: Uint8Array): Uint8Array => {
	if (!isEncryptedBackup(data)) {
		throw new AppError(
			"BACKUP_DECRYPT_FAILED",
			"This file is not a PCENC1 encrypted backup.",
		);
	}
	if (data[6] !== VERSION || data[7] !== KDF_APP_KEY) {
		throw new AppError(
			"BACKUP_DECRYPT_FAILED",
			"This backup uses an unsupported encryption format.",
		);
	}
	const header = data.slice(0, HEADER_LENGTH);
	const salt = data.slice(8, 8 + SALT_LENGTH);
	const nonce = data.slice(8 + SALT_LENGTH, HEADER_LENGTH);
	const key = hkdfSha256(APP_SECRET, salt, HKDF_INFO);
	const plaintext = xchacha20Poly1305Open(
		key,
		nonce,
		data.slice(HEADER_LENGTH),
		header,
	);
	if (plaintext === null) {
		throw new AppError(
			"BACKUP_DECRYPT_FAILED",
			"This backup could not be decrypted — it is corrupted or was not made by this app.",
		);
	}
	return plaintext;
};

export { decryptBackup, encryptBackup, isEncryptedBackup };
