type InvestmentAnalysisRow = Readonly<{
	investmentId: string;
	investmentName: string;
	currencyCode: string;
	totalInvested: string;
	totalRedeemed: string;
}>;

export type { InvestmentAnalysisRow as default };
