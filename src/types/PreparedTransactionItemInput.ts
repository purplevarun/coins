import type TransactionItemInput from "@/types/TransactionItemInput";

type PreparedTransactionItemInput = TransactionItemInput & {
	sourceId: string;
};

export type { PreparedTransactionItemInput as default };
