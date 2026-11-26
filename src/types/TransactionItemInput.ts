type TransactionItemInput = Readonly<{
	id?: string;
	categoryId?: string | null;
	investmentId?: string | null;
	sourceId?: string | null;
	destinationSourceId?: string | null;
	toAmount?: string | null;
	amount: string;
}>;

export type { TransactionItemInput as default };
