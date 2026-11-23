import type CategoryKind from "@/types/CategoryKind";

type TransactionItem = Readonly<{
	id: string;
	transactionId: string;
	categoryId: string | null;
	categoryKind?: CategoryKind | null;
	categoryName?: string;
	investmentId?: string | null;
	investmentName?: string;
	amount: string;
	position: number;
	createdAt: number;
	updatedAt: number;
}>;

export type { TransactionItem as default };
