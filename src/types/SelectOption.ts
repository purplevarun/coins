type SelectOption = Readonly<{
	label: string;
	value: string;
	description?: string;
	swatches?: readonly string[];
}>;

export type { SelectOption as default };
