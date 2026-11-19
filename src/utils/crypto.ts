/* eslint-disable @typescript-eslint/no-non-null-assertion --
	fixed-bounds cryptographic primitives where every index is in range */
import type XChaCha20Subkey from "@/types/XChaCha20Subkey";

// Dependency-free crypto primitives for PCENC1 backup encryption.
// Every primitive is verified against public test vectors (RFC 8439,
// RFC 5869, RFC 4231, XChaCha20 draft) in test/utils/crypto.test.ts.

const rotl32 = (value: number, count: number): number =>
	(value << count) | (value >>> (32 - count)) | 0;

const rotr32 = (value: number, count: number): number =>
	(value >>> count) | (value << (32 - count)) | 0;

const readUint32LE = (data: Uint8Array, offset: number): number =>
	data[offset]! |
	(data[offset + 1]! << 8) |
	(data[offset + 2]! << 16) |
	(data[offset + 3]! << 24) |
	0;

const writeUint32LE = (
	target: Uint8Array,
	value: number,
	offset: number,
): void => {
	target[offset] = value & 0xff;
	target[offset + 1] = (value >>> 8) & 0xff;
	target[offset + 2] = (value >>> 16) & 0xff;
	target[offset + 3] = (value >>> 24) & 0xff;
};

const concatBytes = (parts: readonly Uint8Array[]): Uint8Array => {
	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const result = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		result.set(part, offset);
		offset += part.length;
	}
	return result;
};

const SHA256_INITIAL_STATE: readonly number[] = [
	0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
	0x1f83d9ab, 0x5be0cd19,
];

const SHA256_ROUND_CONSTANTS: readonly number[] = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
	0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
	0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
	0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
	0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
	0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
	0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
	0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const sha256 = (data: Uint8Array): Uint8Array => {
	const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64);
	padded.set(data);
	padded[data.length] = 0x80;
	const paddedView = new DataView(padded.buffer);
	paddedView.setUint32(padded.length - 4, data.length * 8, false);
	const state = [...SHA256_INITIAL_STATE];
	const words = new Uint32Array(64);
	for (let block = 0; block < padded.length; block += 64) {
		for (let t = 0; t < 16; t += 1)
			words[t] = paddedView.getUint32(block + t * 4, false);
		for (let t = 16; t < 64; t += 1) {
			const s0 =
				rotr32(words[t - 15]!, 7) ^
				rotr32(words[t - 15]!, 18) ^
				(words[t - 15]! >>> 3);
			const s1 =
				rotr32(words[t - 2]!, 17) ^
				rotr32(words[t - 2]!, 19) ^
				(words[t - 2]! >>> 10);
			words[t] = (words[t - 16]! + s0 + words[t - 7]! + s1) | 0;
		}
		let a = state[0]!;
		let b = state[1]!;
		let c = state[2]!;
		let d = state[3]!;
		let e = state[4]!;
		let f = state[5]!;
		let g = state[6]!;
		let h = state[7]!;
		for (let t = 0; t < 64; t += 1) {
			const bigS1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 =
				(h + bigS1 + ch + SHA256_ROUND_CONSTANTS[t]! + words[t]!) | 0;
			const bigS0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (bigS0 + maj) | 0;
			h = g;
			g = f;
			f = e;
			e = (d + temp1) | 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) | 0;
		}
		state[0] = (state[0]! + a) | 0;
		state[1] = (state[1]! + b) | 0;
		state[2] = (state[2]! + c) | 0;
		state[3] = (state[3]! + d) | 0;
		state[4] = (state[4]! + e) | 0;
		state[5] = (state[5]! + f) | 0;
		state[6] = (state[6]! + g) | 0;
		state[7] = (state[7]! + h) | 0;
	}
	const digest = new Uint8Array(32);
	const digestView = new DataView(digest.buffer);
	state.forEach((word, index) =>
		digestView.setUint32(index * 4, word >>> 0, false),
	);
	return digest;
};

const hmacSha256 = (key: Uint8Array, message: Uint8Array): Uint8Array => {
	const paddedKey = new Uint8Array(64);
	paddedKey.set(key.length > 64 ? sha256(key) : key);
	const innerPad = paddedKey.map((byte) => byte ^ 0x36);
	const outerPad = paddedKey.map((byte) => byte ^ 0x5c);
	return sha256(
		concatBytes([outerPad, sha256(concatBytes([innerPad, message]))]),
	);
};

const hkdfSha256 = (
	ikm: Uint8Array,
	salt: Uint8Array,
	info: Uint8Array,
	length = 32,
): Uint8Array => {
	const prk = hmacSha256(salt.length ? salt : new Uint8Array(32), ikm);
	const okm = new Uint8Array(length);
	let previous: Uint8Array = new Uint8Array(0);
	let offset = 0;
	for (let block = 1; offset < length; block += 1) {
		previous = hmacSha256(
			prk,
			concatBytes([previous, info, new Uint8Array([block])]),
		);
		okm.set(previous.subarray(0, length - offset), offset);
		offset += previous.length;
	}
	return okm;
};

const CHACHA20_CONSTANTS: readonly number[] = [
	0x61707865, 0x3320646e, 0x79622d32, 0x6b206574,
];

const chacha20QuarterRound = (
	state: Uint32Array,
	a: number,
	b: number,
	c: number,
	d: number,
): void => {
	let va = state[a]!;
	let vb = state[b]!;
	let vc = state[c]!;
	let vd = state[d]!;
	va = (va + vb) | 0;
	vd = rotl32(vd ^ va, 16);
	vc = (vc + vd) | 0;
	vb = rotl32(vb ^ vc, 12);
	va = (va + vb) | 0;
	vd = rotl32(vd ^ va, 8);
	vc = (vc + vd) | 0;
	vb = rotl32(vb ^ vc, 7);
	state[a] = va;
	state[b] = vb;
	state[c] = vc;
	state[d] = vd;
};

const chacha20Block = (
	key: Uint8Array,
	counter: number,
	nonce: Uint8Array,
): Uint8Array => {
	const initial = new Uint32Array(16);
	initial.set(CHACHA20_CONSTANTS);
	for (let i = 0; i < 8; i += 1) initial[4 + i] = readUint32LE(key, i * 4);
	initial[12] = counter >>> 0;
	for (let i = 0; i < 3; i += 1) initial[13 + i] = readUint32LE(nonce, i * 4);
	const working = new Uint32Array(initial);
	for (let i = 0; i < 10; i += 1) {
		chacha20QuarterRound(working, 0, 4, 8, 12);
		chacha20QuarterRound(working, 1, 5, 9, 13);
		chacha20QuarterRound(working, 2, 6, 10, 14);
		chacha20QuarterRound(working, 3, 7, 11, 15);
		chacha20QuarterRound(working, 0, 5, 10, 15);
		chacha20QuarterRound(working, 1, 6, 11, 12);
		chacha20QuarterRound(working, 2, 7, 8, 13);
		chacha20QuarterRound(working, 3, 4, 9, 14);
	}
	const output = new Uint8Array(64);
	for (let i = 0; i < 16; i += 1)
		writeUint32LE(output, (working[i]! + initial[i]!) | 0, i * 4);
	return output;
};

const hchacha20 = (key: Uint8Array, nonce16: Uint8Array): Uint8Array => {
	const state = new Uint32Array(16);
	state.set(CHACHA20_CONSTANTS);
	for (let i = 0; i < 8; i += 1) state[4 + i] = readUint32LE(key, i * 4);
	for (let i = 0; i < 4; i += 1) state[12 + i] = readUint32LE(nonce16, i * 4);
	for (let i = 0; i < 10; i += 1) {
		chacha20QuarterRound(state, 0, 4, 8, 12);
		chacha20QuarterRound(state, 1, 5, 9, 13);
		chacha20QuarterRound(state, 2, 6, 10, 14);
		chacha20QuarterRound(state, 3, 7, 11, 15);
		chacha20QuarterRound(state, 0, 5, 10, 15);
		chacha20QuarterRound(state, 1, 6, 11, 12);
		chacha20QuarterRound(state, 2, 7, 8, 13);
		chacha20QuarterRound(state, 3, 4, 9, 14);
	}
	const subkey = new Uint8Array(32);
	for (let i = 0; i < 4; i += 1) writeUint32LE(subkey, state[i]!, i * 4);
	for (let i = 0; i < 4; i += 1)
		writeUint32LE(subkey, state[12 + i]!, 16 + i * 4);
	return subkey;
};

const chacha20Xor = (
	key: Uint8Array,
	nonce: Uint8Array,
	counter: number,
	data: Uint8Array,
): Uint8Array => {
	const output = new Uint8Array(data.length);
	for (let offset = 0; offset < data.length; offset += 64) {
		const keystream = chacha20Block(key, counter, nonce);
		counter = (counter + 1) >>> 0;
		const length = Math.min(64, data.length - offset);
		for (let i = 0; i < length; i += 1)
			output[offset + i] = data[offset + i]! ^ keystream[i]!;
	}
	return output;
};

const leBytesToBigInt = (bytes: Uint8Array): bigint =>
	bytes.reduceRight(
		(accumulator, byte) => (accumulator << 8n) | BigInt(byte),
		0n,
	);

const poly1305 = (message: Uint8Array, key: Uint8Array): Uint8Array => {
	const rBytes = key.slice(0, 16);
	rBytes[3] = rBytes[3]! & 15;
	rBytes[7] = rBytes[7]! & 15;
	rBytes[11] = rBytes[11]! & 15;
	rBytes[15] = rBytes[15]! & 15;
	rBytes[4] = rBytes[4]! & 252;
	rBytes[8] = rBytes[8]! & 252;
	rBytes[12] = rBytes[12]! & 252;
	const r = leBytesToBigInt(rBytes);
	const s = leBytesToBigInt(key.slice(16, 32));
	const prime = (1n << 130n) - 5n;
	let accumulator = 0n;
	for (let offset = 0; offset < message.length; offset += 16) {
		const block = message.subarray(offset, offset + 16);
		const value = leBytesToBigInt(block) + (1n << BigInt(block.length * 8));
		accumulator = ((accumulator + value) * r) % prime;
	}
	const tag = (accumulator + s) & ((1n << 128n) - 1n);
	const output = new Uint8Array(16);
	let remaining = tag;
	for (let i = 0; i < 16; i += 1) {
		output[i] = Number(remaining & 0xffn);
		remaining >>= 8n;
	}
	return output;
};

const pad16 = (length: number): number =>
	length % 16 === 0 ? 0 : 16 - (length % 16);

const aeadMacData = (ciphertext: Uint8Array, aad: Uint8Array): Uint8Array => {
	const lengths = new Uint8Array(16);
	const view = new DataView(lengths.buffer);
	view.setUint32(0, aad.length, true);
	view.setUint32(8, ciphertext.length, true);
	return concatBytes([
		aad,
		new Uint8Array(pad16(aad.length)),
		ciphertext,
		new Uint8Array(pad16(ciphertext.length)),
		lengths,
	]);
};

const xchacha20Subkey = (
	key: Uint8Array,
	nonce24: Uint8Array,
): XChaCha20Subkey => ({
	subkey: hchacha20(key, nonce24.slice(0, 16)),
	nonce12: concatBytes([new Uint8Array(4), nonce24.slice(16, 24)]),
});

const xchacha20Poly1305Seal = (
	key: Uint8Array,
	nonce24: Uint8Array,
	plaintext: Uint8Array,
	aad: Uint8Array = new Uint8Array(0),
): Uint8Array => {
	const { subkey, nonce12 } = xchacha20Subkey(key, nonce24);
	const ciphertext = chacha20Xor(subkey, nonce12, 1, plaintext);
	const polyKey = chacha20Block(subkey, 0, nonce12).slice(0, 32);
	const tag = poly1305(aeadMacData(ciphertext, aad), polyKey);
	return concatBytes([ciphertext, tag]);
};

const xchacha20Poly1305Open = (
	key: Uint8Array,
	nonce24: Uint8Array,
	sealed: Uint8Array,
	aad: Uint8Array = new Uint8Array(0),
): Uint8Array | null => {
	if (sealed.length < 16) return null;
	const ciphertext = sealed.slice(0, sealed.length - 16);
	const tag = sealed.slice(sealed.length - 16);
	const { subkey, nonce12 } = xchacha20Subkey(key, nonce24);
	const polyKey = chacha20Block(subkey, 0, nonce12).slice(0, 32);
	const expected = poly1305(aeadMacData(ciphertext, aad), polyKey);
	let diff = 0;
	for (let i = 0; i < 16; i += 1) diff |= tag[i]! ^ expected[i]!;
	if (diff !== 0) return null;
	return chacha20Xor(subkey, nonce12, 1, ciphertext);
};

export {
	hkdfSha256,
	hmacSha256,
	sha256,
	xchacha20Poly1305Open,
	xchacha20Poly1305Seal,
};
