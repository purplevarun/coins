import type TransactionItemInput from "@/types/TransactionItemInput";

type TransactionItemDraft = TransactionItemInput &
	Readonly<{
		key: string;
		categoryName?: string;
		investmentName?: string;
		sourceName?: string;
		destinationSourceName?: string;
	}>;

export type { TransactionItemDraft as default };
