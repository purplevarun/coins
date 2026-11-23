import { TextInput as RNTextInput } from "react-native";

import useTheme from "@/hooks/useTheme";
import type CustomTextInputProps from "@/types/CustomTextInputProps";
import applyAppFontStyle from "@/utils/appFontStyle";

const CustomTextInput = ({
	style,
	ref,
	...props
}: CustomTextInputProps): React.JSX.Element => {
	const { colors } = useTheme();
	return (
		<RNTextInput
			keyboardAppearance="dark"
			selectionColor={colors.primary}
			cursorColor={colors.primary}
			placeholderTextColor={colors.textDim}
			ref={ref}
			style={applyAppFontStyle(style)}
			{...props}
		/>
	);
};

export default CustomTextInput;
