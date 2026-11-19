// Work with .pc backup files outside the app — see ENCRYPTION.md.
//
//   bun tools/pc-backup.ts info <file.pc>
//   bun tools/pc-backup.ts decrypt <file.pc> [out.db]
//   bun tools/pc-backup.ts encrypt <in.db> [out.pc]
//
// decrypt auto-detects: a plaintext (legacy) .pc is copied through untouched.

import { getRandomValues } from "node:crypto";
import {
	decryptBackup,
	encryptBackup,
	isEncryptedBackup,
} from "../src/services/backupEncryption";

const SQLITE_MAGIC = new TextEncoder().encode("SQLite format 3\0");

const usage = (): never => {
	console.error(
		"usage: bun tools/pc-backup.ts <info|decrypt|encrypt> <input> [output]",
	);
	process.exit(1);
};

const command = process.argv[2] ?? "";
const inputPath = process.argv[3] ?? "";
const outputPath = process.argv[4];
if (!command || !inputPath) usage();

const input = new Uint8Array(await Bun.file(inputPath).arrayBuffer());

const isSqlite = input
	.slice(0, SQLITE_MAGIC.length)
	.every((byte, index) => byte === SQLITE_MAGIC[index]);

if (command === "info") {
	const format = isEncryptedBackup(input)
		? "PCENC1 encrypted (version 1, app-key)"
		: isSqlite
			? "plaintext SQLite (legacy)"
			: "unknown";
	console.log(`${inputPath}: ${format} (${input.length} bytes)`);
} else if (command === "decrypt") {
	const output =
		outputPath ??
		inputPath.replace(/\.[^.]+$/, "") +
			(isEncryptedBackup(input) ? ".db" : ".pc");
	const plaintext = isEncryptedBackup(input) ? decryptBackup(input) : input;
	await Bun.write(output, plaintext);
	console.log(`${inputPath} -> ${output} (${plaintext.length} bytes)`);
} else if (command === "encrypt") {
	if (!isSqlite) {
		console.error(`${inputPath} is not a SQLite database.`);
		process.exit(1);
	}
	const output = outputPath ?? inputPath.replace(/\.[^.]+$/, "") + ".pc";
	const sealed = encryptBackup(input, getRandomValues(new Uint8Array(40)));
	await Bun.write(output, sealed);
	console.log(`${inputPath} -> ${output} (${sealed.length} bytes)`);
} else {
	usage();
}
