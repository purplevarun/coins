type XChaCha20Subkey = Readonly<{
	subkey: Uint8Array;
	nonce12: Uint8Array;
}>;

export type { XChaCha20Subkey as default };
