import {
	hkdfSha256,
	hmacSha256,
	sha256,
	xchacha20Poly1305Open,
	xchacha20Poly1305Seal,
} from "@/utils/crypto";
import { describe, expect, it } from "vitest";

const hexToBytes = (hex: string): Uint8Array =>
	new Uint8Array(
		((hex.match(/../g) ?? []) as string[]).map((byte) =>
			parseInt(byte, 16),
		),
	);

const bytesToHex = (bytes: Uint8Array): string =>
	[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

describe("sha256", () => {
	it("matches the FIPS test vector for 'abc'", () => {
		expect(bytesToHex(sha256(new TextEncoder().encode("abc")))).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});

	it("matches the empty-input vector", () => {
		expect(bytesToHex(sha256(new Uint8Array(0)))).toBe(
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
	});
});

describe("hmacSha256", () => {
	it("matches RFC 4231 test case 2", () => {
		expect(
			bytesToHex(
				hmacSha256(
					new TextEncoder().encode("Jefe"),
					new TextEncoder().encode("what do ya want for nothing?"),
				),
			),
		).toBe(
			"5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
		);
	});

	it("hashes keys longer than the block size (RFC 4231 case 6)", () => {
		expect(
			bytesToHex(
				hmacSha256(
					new Uint8Array(131).fill(0xaa),
					new TextEncoder().encode(
						"Test Using Larger Than Block-Size Key - Hash Key First",
					),
				),
			),
		).toBe(
			"60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54",
		);
	});
});

describe("hkdfSha256", () => {
	it("matches RFC 5869 test case 1", () => {
		const ikm = hexToBytes("0b".repeat(22));
		const salt = hexToBytes("000102030405060708090a0b0c");
		const info = hexToBytes("f0f1f2f3f4f5f6f7f8f9");
		expect(bytesToHex(hkdfSha256(ikm, salt, info, 42))).toBe(
			"3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865",
		);
	});

	it("defaults a missing salt to zeros (RFC 5869 case 3)", () => {
		const ikm = hexToBytes("0b".repeat(22));
		expect(
			bytesToHex(
				hkdfSha256(ikm, new Uint8Array(0), new Uint8Array(0), 42),
			),
		).toBe(
			"8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8",
		);
	});
});

describe("xchacha20Poly1305", () => {
	const key = hexToBytes(
		"000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
	);
	const nonce = hexToBytes(
		"000102030405060708090a0b0c0d0e0f1011121314151617",
	);
	const aad = hexToBytes("5043454e4331010 0".replace(" ", ""));
	const plaintext = new TextEncoder().encode(
		"Purplecoins backup test vector",
	);

	it("matches a libsodium-generated vector", () => {
		expect(
			bytesToHex(xchacha20Poly1305Seal(key, nonce, plaintext, aad)),
		).toBe(
			"ceb77d0ffcb7eec15a2a55eea933cb833e3708d198a569cb097f5cc252df44573ddd6273e4c8b90a160e868b9d10",
		);
	});

	it("opens a libsodium-sealed ciphertext", () => {
		const sealed = hexToBytes(
			"ceb77d0ffcb7eec15a2a55eea933cb833e3708d198a569cb097f5cc252df44573ddd6273e4c8b90a160e868b9d10",
		);
		expect(
			new TextDecoder().decode(
				xchacha20Poly1305Open(key, nonce, sealed, aad) ??
					new Uint8Array(0),
			),
		).toBe("Purplecoins backup test vector");
	});

	it("round-trips arbitrary data", () => {
		const data = hexToBytes("deadbeef".repeat(500));
		const sealed = xchacha20Poly1305Seal(key, nonce, data);
		expect(xchacha20Poly1305Open(key, nonce, sealed)).toEqual(data);
	});

	it("rejects a tampered tag", () => {
		const sealed = xchacha20Poly1305Seal(key, nonce, plaintext, aad);
		const tampered = sealed.slice();
		tampered[tampered.length - 1] =
			(tampered[tampered.length - 1] ?? 0) ^ 0xff;
		expect(xchacha20Poly1305Open(key, nonce, tampered, aad)).toBeNull();
	});

	it("rejects a tampered ciphertext", () => {
		const sealed = xchacha20Poly1305Seal(key, nonce, plaintext, aad);
		const tampered = sealed.slice();
		tampered[0] = (tampered[0] ?? 0) ^ 0xff;
		expect(xchacha20Poly1305Open(key, nonce, tampered, aad)).toBeNull();
	});

	it("rejects wrong AAD", () => {
		const sealed = xchacha20Poly1305Seal(key, nonce, plaintext, aad);
		expect(
			xchacha20Poly1305Open(key, nonce, sealed, new Uint8Array([1])),
		).toBeNull();
	});

	it("rejects truncated input", () => {
		expect(
			xchacha20Poly1305Open(key, nonce, new Uint8Array(10)),
		).toBeNull();
	});
});
