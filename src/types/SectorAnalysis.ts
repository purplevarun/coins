type SectorAnalysis = Readonly<{
	sectorId: string;
	sectorName: string;
	currencyCode: string;
	credits: string;
	debits: string;
	net: string;
}>;

export type { SectorAnalysis as default };
