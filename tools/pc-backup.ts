// Work with .pc/.pczip backup files outside the app.
//
//   bun tools/pc-backup.ts info <file>
//   bun tools/pc-backup.ts decrypt <file.pc|.pczip> [out.db]
//   bun tools/pc-backup.ts pack <in.db> [out.pczip]
//
// decrypt auto-detects: PCENC1 (legacy encrypted) is decrypted, .pczip is
// unzipped, plaintext SQLite is copied through untouched.

import { unzipSync, zipSync } from "fflate";
import { hkdfSha256, xchacha20Poly1305Open } from "../src/utils/crypto";

const SQLITE_MAGIC = new TextEncoder().encode("SQLite format 3\0");
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
const PCENC1_MAGIC = new Uint8Array([0x50, 0x43, 0x45, 0x4e, 0x43, 0x31]);
const PCENC1_HEADER_LENGTH = 48;
const PCENC1_SALT_LENGTH = 16;
const PCENC1_KDF_APP_KEY = 0;
const PCENC1_HKDF_INFO = new TextEncoder().encode("purplecoins-backup");
const PCENC1_APP_SECRET = new Uint8Array([
	0x33, 0x62, 0x49, 0x67, 0x4c, 0xbd, 0xaf, 0xea, 0x0b, 0xf3, 0x13, 0x3a,
	0x12, 0xd6, 0x76, 0xe8, 0x19, 0x83, 0x69, 0x50, 0x4d, 0xd3, 0x7c, 0x4f,
	0x40, 0x8b, 0xa6, 0xdd, 0xcc, 0x7f, 0xc9, 0xcb,
]);

const usage = (): never => {
	console.error(
		"usage: bun tools/pc-backup.ts <info|decrypt|pack> <input> [output]",
	);
	process.exit(1);
};

const hasMagic = (data: Uint8Array, magic: Uint8Array): boolean =>
	data.length >= magic.length &&
	magic.every((byte, index) => data[index] === byte);

const decryptPcenc1 = (data: Uint8Array): Uint8Array => {
	if (data[6] !== 1 || data[7] !== PCENC1_KDF_APP_KEY) {
		console.error("Unsupported PCENC1 version/kdf in this backup.");
		process.exit(1);
	}
	const key = hkdfSha256(
		PCENC1_APP_SECRET,
		data.slice(8, 8 + PCENC1_SALT_LENGTH),
		PCENC1_HKDF_INFO,
	);
	const plaintext = xchacha20Poly1305Open(
		key,
		data.slice(8 + PCENC1_SALT_LENGTH, PCENC1_HEADER_LENGTH),
		data.slice(PCENC1_HEADER_LENGTH),
		data.slice(0, PCENC1_HEADER_LENGTH),
	);
	if (plaintext === null) {
		console.error("PCENC1 decryption failed — corrupted or wrong file.");
		process.exit(1);
	}
	return plaintext;
};

const command = process.argv[2] ?? "";
const inputPath = process.argv[3] ?? "";
const outputPath = process.argv[4];
if (!command || !inputPath) usage();

const input = new Uint8Array(await Bun.file(inputPath).arrayBuffer());

const isSqlite = hasMagic(input, SQLITE_MAGIC);
const isZip = hasMagic(input, ZIP_MAGIC);
const isPcenc1 = hasMagic(input, PCENC1_MAGIC);

const unzipDatabase = (data: Uint8Array): Uint8Array => {
	const entries = unzipSync(data);
	const entry = entries["purplecoins.db"] ?? Object.values(entries)[0];
	if (!entry) {
		console.error("Zip archive is empty.");
		process.exit(1);
	}
	return entry;
};

if (command === "info") {
	const format = isPcenc1
		? `PCENC1 encrypted (version ${input[6]}, app-key)`
		: isZip
			? "zip archive (.pczip)"
			: isSqlite
				? "plaintext SQLite"
				: "unknown";
	console.log(`${inputPath}: ${format} (${input.length} bytes)`);
} else if (command === "decrypt") {
	const output = outputPath ?? inputPath.replace(/\.[^.]+$/, "") + ".db";
	const plaintext = isPcenc1
		? decryptPcenc1(input)
		: isZip
			? unzipDatabase(input)
			: input;
	await Bun.write(output, plaintext);
	console.log(`${inputPath} -> ${output} (${plaintext.length} bytes)`);
} else if (command === "pack") {
	if (!isSqlite) {
		console.error(`${inputPath} is not a SQLite database.`);
		process.exit(1);
	}
	const output = outputPath ?? inputPath.replace(/\.[^.]+$/, "") + ".pczip";
	const zipped = zipSync({ "purplecoins.db": input }, { level: 9 });
	await Bun.write(output, zipped);
	console.log(`${inputPath} -> ${output} (${zipped.length} bytes)`);
} else {
	usage();
}
