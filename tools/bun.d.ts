declare const Bun: {
	file(path: string): { arrayBuffer(): Promise<ArrayBuffer> };
	write(path: string, data: Uint8Array): Promise<unknown>;
};
