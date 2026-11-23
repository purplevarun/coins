import type { KeyboardTypeOptions } from "react-native";

type ModalFieldSheetProps = Readonly<{
	label: string;
	initialValue: string;
	onCommit: (value: string) => void;
	placeholder?: string;
	keyboardType?: KeyboardTypeOptions;
}>;

export type { ModalFieldSheetProps as default };
