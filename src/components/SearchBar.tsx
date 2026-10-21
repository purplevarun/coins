import CustomTextInput from "@/components/CustomTextInput";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type SearchBarProps from "@/types/SearchBarProps";
import createThemedStyles from "@/utils/createThemedStyles";

const SearchBar = ({
	value,
	onChangeText,
	placeholder = MESSAGES.COMPONENTS.SEARCH_PLACEHOLDER,
	autoFocus = true,
}: SearchBarProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	return (
		<View style={styles.container}>
			<Ionicons
				color={COLORS.textDim}
				name="search-outline"
				size={16}
				style={styles.icon}
			/>
			<CustomTextInput
				autoFocus={autoFocus}
				onChangeText={onChangeText}
				placeholder={placeholder}
				style={styles.input}
				value={value}
			/>
		</View>
	);
};

const { ALIGN, BORDER, FLEX, FONT_SIZE, RADIUS, SPACING } = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		container: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			backgroundColor: COLORS.surfaceHigh,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			borderRadius: RADIUS.S12,
			paddingHorizontal: SPACING.S10,
			marginBottom: SPACING.S8,
		},
		icon: {
			marginRight: SPACING.S6,
		},
		input: {
			flex: FLEX.FILL,
			paddingVertical: SPACING.S10,
			fontSize: FONT_SIZE.S14,
			color: COLORS.text,
		},
	}),
);

export default SearchBar;
