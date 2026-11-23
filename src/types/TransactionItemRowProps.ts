import type SelectOption from "@/types/SelectOption";
import type TransactionItemDraft from "@/types/TransactionItemDraft";

type TransactionItemRowProps = {
	item: TransactionItemDraft;
	position: number;
	count: number;
	isDisabled?: boolean;
	currencyCode?: string;
	entityLabel: string;
	entityOptions: readonly SelectOption[];
	entityPlaceholder: string;
	entityValue?: string | null;
	entityName?: string;
	onAmountChange: (value: string) => void;
	onEntityChange: (value: string) => void;
	onRemove: () => void;
};

export default TransactionItemRowProps;
