import type { KeyboardTypeOptions } from "react-native";

type ModalTextFieldProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	keyboardType?: KeyboardTypeOptions;
	isCompact?: boolean;
	isDisabled?: boolean;
};

export default ModalTextFieldProps;
