import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";

import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type HeaderIconButtonProps from "@/types/HeaderIconButtonProps";
import createThemedStyles from "@/utils/createThemedStyles";

const { ALIGN, BORDER, OPACITY, RADIUS, SCALE, SIZES } = styleConstants;

const HeaderIconButton = ({
	icon,
	onPress,
	isActive = false,
	isDisabled = false,
	accessibilityLabel,
}: HeaderIconButtonProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	return (
		<Pressable
			accessibilityLabel={accessibilityLabel}
			accessibilityRole="button"
			accessibilityState={{ disabled: isDisabled }}
			disabled={isDisabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.button,
				isActive && styles.active,
				pressed && !isDisabled && styles.pressed,
				isDisabled && styles.disabled,
			]}
		>
			<Ionicons
				color={isActive ? COLORS.primaryBright : COLORS.text}
				name={icon}
				size={21}
			/>
		</Pressable>
	);
};

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		button: {
			width: SIZES.S40,
			height: SIZES.S40,
			borderRadius: RADIUS.S14,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			backgroundColor: COLORS.surfaceRaised,
		},
		active: {
			borderColor: COLORS.borderStrong,
			backgroundColor: COLORS.primaryMuted,
		},
		pressed: {
			transform: [{ scale: SCALE.LIGHT }],
		},
		disabled: {
			opacity: OPACITY.MEDIUM,
		},
	}),
);

export default HeaderIconButton;
