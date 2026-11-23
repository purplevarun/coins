type TransactionItemInput = Readonly<{
	id?: string;
	categoryId?: string | null;
	investmentId?: string | null;
	amount: string;
}>;

export type { TransactionItemInput as default };
