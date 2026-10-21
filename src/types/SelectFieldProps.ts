import type SelectOption from "@/types/SelectOption";

type SelectFieldProps = Readonly<{
	label: string;
	value: string;
	options: readonly SelectOption[];
	onChange: (value: string) => void;
	placeholder?: string;
	isOptional?: boolean;
	isCompact?: boolean;
	isSearchable?: boolean;
	isDisabled?: boolean;
}>;

export type { SelectFieldProps as default };
