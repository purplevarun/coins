type SimpleEntityFormProps = Readonly<{
	initialName?: string;
	onSave: (name: string) => Promise<void>;
}>;

export type { SimpleEntityFormProps as default };
