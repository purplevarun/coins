import type SelectOption from "@/types/SelectOption";

type SelectSheetProps = Readonly<{
	label: string;
	options: readonly SelectOption[];
	onSelect: (value: string) => void;
	onClose: () => void;
	value?: string;
	isOptional?: boolean;
	isSearchable?: boolean;
}>;

export type { SelectSheetProps as default };
