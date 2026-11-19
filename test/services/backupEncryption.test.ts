import {
	decryptBackup,
	encryptBackup,
	isEncryptedBackup,
} from "@/services/backupEncryption";
import { describe, expect, it } from "vitest";

const hexToBytes = (hex: string): Uint8Array =>
	new Uint8Array(
		((hex.match(/../g) ?? []) as string[]).map((byte) =>
			parseInt(byte, 16),
		),
	);

const ENTROPY = hexToBytes(
	"11223344556677889900aabbccddeeff" +
		"aabbccddeeff00112233445566778899aabbccddeeff0011",
);

const PLAINTEXT = new TextEncoder().encode("hello encrypted world");

describe("isEncryptedBackup", () => {
	it("detects PCENC1 files", () => {
		expect(isEncryptedBackup(encryptBackup(PLAINTEXT, ENTROPY))).toBe(true);
	});

	it("rejects plaintext sqlite and short files", () => {
		expect(
			isEncryptedBackup(
				new TextEncoder().encode("SQLite format 3\0rest"),
			),
		).toBe(false);
		expect(isEncryptedBackup(new Uint8Array(10))).toBe(false);
	});
});

describe("encryptBackup", () => {
	it("writes the PCENC1 header and appends ciphertext", () => {
		const sealed = encryptBackup(PLAINTEXT, ENTROPY);
		expect([...sealed.slice(0, 6)]).toEqual([
			0x50, 0x43, 0x45, 0x4e, 0x43, 0x31,
		]);
		expect(sealed[6]).toBe(1); // version
		expect(sealed[7]).toBe(0); // kdf = app-key
		expect(sealed.length).toBe(48 + PLAINTEXT.length + 16);
	});

	it("round-trips through decryptBackup", () => {
		const sealed = encryptBackup(PLAINTEXT, ENTROPY);
		expect(decryptBackup(sealed)).toEqual(PLAINTEXT);
	});

	it("round-trips a large payload", () => {
		const big = new Uint8Array(1_000_000).map((_, i) => i % 256);
		expect(decryptBackup(encryptBackup(big, ENTROPY))).toEqual(big);
	});

	it("rejects insufficient entropy", () => {
		expect(() => encryptBackup(PLAINTEXT, new Uint8Array(10))).toThrowError(
			/random data/,
		);
	});

	it("matches a libsodium-produced PCENC1 file", () => {
		// Generated with libsodium's crypto_aead_xchacha20poly1305_ietf_encrypt
		// using the same header as AAD — proves external tools can produce
		// app-readable files (see ENCRYPTION.md's agent section).
		const file = hexToBytes(
			"5043454e43310100" +
				"11223344556677889900aabbccddeeff" +
				"aabbccddeeff00112233445566778899aabbccddeeff0011" +
				"50c6d6f2f975840a659de6224e31a6f4ffa2607b4f3c0082911f6dea1ee7375cc52e2b3836",
		);
		expect(decryptBackup(file)).toEqual(PLAINTEXT);
	});
});

describe("decryptBackup", () => {
	it("rejects non-PCENC1 input", () => {
		expect(() =>
			decryptBackup(new TextEncoder().encode("SQLite format 3\0")),
		).toThrowError(/PCENC1/);
	});

	it("rejects unsupported version or kdf", () => {
		const sealed = encryptBackup(PLAINTEXT, ENTROPY);
		const badVersion = sealed.slice();
		badVersion[6] = 99;
		expect(() => decryptBackup(badVersion)).toThrowError(/unsupported/);
		const badKdf = sealed.slice();
		badKdf[7] = 1;
		expect(() => decryptBackup(badKdf)).toThrowError(/unsupported/);
	});

	it("rejects a tampered file", () => {
		const sealed = encryptBackup(PLAINTEXT, ENTROPY);
		const tampered = sealed.slice();
		tampered[60] = (tampered[60] ?? 0) ^ 0xff;
		expect(() => decryptBackup(tampered)).toThrowError(/decrypted/);
	});

	it("rejects a header-only file", () => {
		const sealed = encryptBackup(new Uint8Array(0), ENTROPY);
		// 48-byte header + 16-byte empty plaintext tag is still a valid file
		expect(decryptBackup(sealed.slice(0, 64))).toEqual(new Uint8Array(0));
		expect(() => decryptBackup(sealed.slice(0, 48))).toThrowError();
	});
});
