import type CategoryAnalysis from "@/types/CategoryAnalysis";
import type InvestmentAnalysis from "@/types/InvestmentAnalysis";
import type SectorAnalysis from "@/types/SectorAnalysis";

type AnalysisSummary = Readonly<{
	categories: readonly CategoryAnalysis[];
	refundNets: readonly CategoryAnalysis[];
	investments: readonly InvestmentAnalysis[];
	sectors: readonly SectorAnalysis[];
	totalIncome: string;
	totalExpense: string;
	netProfit: string;
	missingCurrencies: readonly string[];
}>;

export type { AnalysisSummary as default };
