type CategoryAnalysisRow = Readonly<{
	categoryId: string;
	categoryName: string;
	kind: string;
	currencyCode: string;
	credits: string;
	debits: string;
}>;

export type { CategoryAnalysisRow as default };
