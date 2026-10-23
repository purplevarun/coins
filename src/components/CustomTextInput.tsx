import { TextInput as RNTextInput, type TextInputProps } from "react-native";

import useTheme from "@/hooks/useTheme";
import applyAppFontStyle from "@/utils/appFontStyle";

const CustomTextInput = ({
	style,
	...props
}: TextInputProps): React.JSX.Element => {
	const { colors } = useTheme();
	return (
		<RNTextInput
			keyboardAppearance="dark"
			selectionColor={colors.primary}
			cursorColor={colors.primary}
			placeholderTextColor={colors.textDim}
			style={applyAppFontStyle(style)}
			{...props}
		/>
	);
};

export default CustomTextInput;
