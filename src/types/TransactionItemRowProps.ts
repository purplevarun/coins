import type SelectOption from "@/types/SelectOption";
import type TransactionItemDraft from "@/types/TransactionItemDraft";

type TransactionItemRowProps = {
	item: TransactionItemDraft;
	position: number;
	count: number;
	isDisabled?: boolean;
	currencyCode?: string;
	categoryOptions: readonly SelectOption[];
	onAmountChange: (value: string) => void;
	onCategoryChange: (value: string) => void;
	onRemove: () => void;
};

export default TransactionItemRowProps;
