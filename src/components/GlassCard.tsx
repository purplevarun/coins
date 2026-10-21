import type ThemeColors from "@/types/ThemeColors";
import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type GlassCardProps from "@/types/GlassCardProps";
import createThemedStyles from "@/utils/createThemedStyles";

const { BORDER, OVERFLOW, RADIUS, SHADOW, SPACING } = styleConstants;

const getAccentColor = (
	COLORS: ThemeColors,
	accent: GlassCardProps["accent"],
): string => {
	if (accent === "success") {
		return COLORS.success;
	}
	if (accent === "danger") {
		return COLORS.danger;
	}
	if (accent === "warning") {
		return COLORS.warning;
	}
	return COLORS.border;
};

const GlassCard = ({
	children,
	accent = "default",
	style,
}: GlassCardProps): ReactNode => {
	const { colors: COLORS, isDark } = useTheme();
	const styles = useThemedStyles(themedStyles);
	return (
		<View
			style={[
				styles.wrapper,
				{ borderColor: getAccentColor(COLORS, accent) },
				style,
			]}
		>
			<BlurView
				intensity={32}
				tint={isDark ? "dark" : "light"}
				style={styles.blur}
			>
				<View style={styles.content}>{children}</View>
			</BlurView>
		</View>
	);
};

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		wrapper: {
			overflow: OVERFLOW.HIDDEN,
			borderWidth: BORDER.THICK,
			borderRadius: RADIUS.S20,
			backgroundColor: COLORS.glass,
			shadowColor: COLORS.black,
			shadowOpacity: SHADOW.OPACITY_SOFT,
			shadowRadius: SHADOW.RADIUS_LG,
			shadowOffset: {
				width: SHADOW.OFFSET_X,
				height: SHADOW.OFFSET_Y_SM,
			},
			elevation: SHADOW.ELEVATION_LOW,
		},
		blur: {
			backgroundColor: COLORS.glass,
		},
		content: {
			padding: SPACING.S16,
		},
	}),
);

export default GlassCard;
