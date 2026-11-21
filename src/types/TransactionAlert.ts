type TransactionAlert = Readonly<{
	type: "DEBIT" | "CREDIT";
	amount: string;
	reason: string;
	packageName: string;
	postedAt: number;
}>;

export type { TransactionAlert as default };
