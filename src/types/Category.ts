import type CategoryKind from "@/types/CategoryKind";

type Category = Readonly<{
	id: string;
	name: string;
	kind: CategoryKind;
	isIncome: boolean;
	tripAgnostic?: boolean;
	createdAt: number;
	updatedAt: number;
	archived: boolean;
}>;

export type { Category as default };
