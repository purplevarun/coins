import type { TextInput, TextInputProps } from "react-native";

type CustomTextInputProps = TextInputProps & {
	ref?: React.Ref<TextInput>;
};

export default CustomTextInputProps;
