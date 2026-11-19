import type CategoryAnalysis from "@/types/CategoryAnalysis";
import type InvestmentAnalysis from "@/types/InvestmentAnalysis";
import type SectorAnalysis from "@/types/SectorAnalysis";

type AnalysisDetailsView = Readonly<{
	type: "error" | "empty" | "list";
	items: readonly (CategoryAnalysis | InvestmentAnalysis | SectorAnalysis)[];
	emptyMessage: string;
	emptyTitle: string;
	errorMessage: string;
}>;

export type { AnalysisDetailsView as default };
