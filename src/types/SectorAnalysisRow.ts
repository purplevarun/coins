type SectorAnalysisRow = Readonly<{
	sectorId: string | null;
	sectorName: string | null;
	currencyCode: string;
	credits: string;
	debits: string;
}>;

export type { SectorAnalysisRow as default };
