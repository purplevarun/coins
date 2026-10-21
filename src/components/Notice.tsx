import CustomText from "@/components/CustomText";
import type ThemeColors from "@/types/ThemeColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type NoticeProps from "@/types/NoticeProps";
import createThemedStyles from "@/utils/createThemedStyles";

const getToneColor = (
	COLORS: ThemeColors,
	tone: NoticeProps["tone"],
): string => {
	if (tone === "danger") {
		return COLORS.danger;
	}
	if (tone === "warning") {
		return COLORS.warning;
	}
	return COLORS.blue;
};

const Notice = ({ message, tone = "info" }: NoticeProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const color = getToneColor(COLORS, tone);
	return (
		<View style={[styles.container, { borderColor: color }]}>
			<Ionicons
				color={color}
				name={tone === "danger" ? "alert-circle" : "information-circle"}
				size={20}
			/>
			<CustomText style={styles.message}>{message}</CustomText>
		</View>
	);
};

const { ALIGN, BORDER, FLEX, FONT_SIZE, LINE_HEIGHT, RADIUS, SPACING } =
	styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		container: {
			borderWidth: BORDER.THIN,
			borderRadius: RADIUS.S14,
			padding: SPACING.S12,
			backgroundColor: COLORS.surfaceSoft,
			flexDirection: FLEX.ROW,
			gap: SPACING.S9,
			alignItems: ALIGN.START,
		},
		message: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S13,
			lineHeight: LINE_HEIGHT.S19,
			flex: FLEX.FILL,
		},
	}),
);

export default Notice;
