import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import CustomText from "@/components/CustomText";
import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type BottomNavBarProps from "@/types/BottomNavBarProps";
import type IconName from "@/types/IconName";
import createThemedStyles from "@/utils/createThemedStyles";

const {
	ALIGN,
	BORDER,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	RADIUS,
	SCALE,
	SIZES,
	SPACING,
} = styleConstants;

const getActiveIconName = (icon: IconName): IconName =>
	icon.replace(/-outline$/, "") as IconName;

const BottomNavBar = ({
	options,
	activeMode,
	onSelectMode,
}: BottomNavBarProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	return (
		<View style={styles.dock}>
			<View style={styles.bar}>
				{options.map((option) => {
					const isActive = option.mode === activeMode;
					return (
						<Pressable
							accessibilityLabel={option.label}
							accessibilityRole="tab"
							accessibilityState={{ selected: isActive }}
							key={option.mode}
							onPress={() => onSelectMode(option.mode)}
							style={({ pressed }) => [
								styles.item,
								pressed && styles.itemPressed,
							]}
						>
							<View style={styles.itemContent}>
								<View
									style={[
										styles.iconContainer,
										isActive && styles.iconContainerActive,
									]}
								>
									<Ionicons
										color={
											isActive
												? COLORS.primaryBright
												: COLORS.textMuted
										}
										name={
											isActive
												? getActiveIconName(option.icon)
												: option.icon
										}
										size={22}
									/>
								</View>
								<CustomText
									style={[
										styles.label,
										isActive && styles.labelActive,
									]}
								>
									{option.label}
								</CustomText>
							</View>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
};

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		dock: {
			borderTopWidth: BORDER.THIN,
			borderColor: COLORS.border,
			backgroundColor: COLORS.backgroundElevated,
		},
		bar: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
			paddingHorizontal: SPACING.S8,
			paddingVertical: SPACING.S8,
			gap: SPACING.S4,
		},
		item: {
			flex: FLEX.FILL,
			minWidth: 0,
			alignItems: ALIGN.CENTER,
		},
		itemPressed: {
			transform: [{ scale: SCALE.LIGHT }],
		},
		itemContent: {
			minHeight: SIZES.S54,
			alignItems: ALIGN.CENTER,
			alignSelf: FLEX.STRETCH,
			justifyContent: ALIGN.CENTER,
			gap: SPACING.S4,
			paddingHorizontal: SPACING.S8,
		},
		iconContainer: {
			width: SIZES.S64,
			height: SIZES.S40,
			borderRadius: RADIUS.S16,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
		},
		iconContainerActive: {
			backgroundColor: COLORS.primaryMuted,
		},
		label: {
			flexShrink: 1,
			textAlign: ALIGN.CENTER,
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
			fontWeight: FONT_WEIGHT.BOLD,
		},
		labelActive: {
			color: COLORS.text,
			fontWeight: FONT_WEIGHT.HEAVY,
		},
	}),
);

export default BottomNavBar;
