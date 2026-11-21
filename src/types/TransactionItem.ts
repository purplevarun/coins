import type CategoryKind from "@/types/CategoryKind";

type TransactionItem = Readonly<{
	id: string;
	transactionId: string;
	categoryId: string;
	categoryKind?: CategoryKind | null;
	categoryName: string;
	amount: string;
	position: number;
	createdAt: number;
	updatedAt: number;
}>;

export type { TransactionItem as default };
