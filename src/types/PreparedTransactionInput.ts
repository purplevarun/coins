import type PreparedTransactionItemInput from "@/types/PreparedTransactionItemInput";
import type TransactionInput from "@/types/TransactionInput";

type PreparedTransactionInput = TransactionInput & {
	items: PreparedTransactionItemInput[];
};

export type { PreparedTransactionInput as default };
