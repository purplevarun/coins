import CustomText from "@/components/CustomText";

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type DateFieldProps from "@/types/DateFieldProps";
import createThemedStyles from "@/utils/createThemedStyles";
import dateUtils from "@/utils/date";
const { formatDate } = dateUtils;

const DateField = ({
	label,
	value,
	onChange,
	isCompact = false,
}: DateFieldProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const [isPickerVisible, setIsPickerVisible] = useState(false);

	return (
		<View style={[styles.container, isCompact && styles.compactContainer]}>
			{!isCompact ? (
				<CustomText style={styles.label}>{label}</CustomText>
			) : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${label}: ${formatDate(value)}`}
				onPress={() => setIsPickerVisible(true)}
				style={[styles.trigger, isCompact && styles.compactTrigger]}
			>
				<CustomText
					style={[styles.value, isCompact && styles.compactValue]}
				>
					{formatDate(value)}
				</CustomText>
				<Ionicons
					color={COLORS.textMuted}
					name="calendar-outline"
					size={19}
				/>
			</Pressable>
			{isPickerVisible ? (
				<DateTimePicker
					display={Platform.OS === "ios" ? "inline" : "default"}
					mode="date"
					onDismiss={() => setIsPickerVisible(false)}
					onValueChange={(_event, selectedDate) => {
						onChange(selectedDate.getTime());
						if (Platform.OS === "android") {
							setIsPickerVisible(false);
						}
					}}
					value={new Date(value)}
				/>
			) : null}
		</View>
	);
};

const {
	ALIGN,
	BORDER,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	LETTER_SPACING,
	RADIUS,
	SIZES,
	SPACING,
	TEXT_TRANSFORM,
} = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		container: {
			gap: SPACING.S7,
			maxWidth: "100%",
		},
		compactContainer: {
			minWidth: 0,
			flexBasis: "auto",
			alignSelf: ALIGN.START,
			flexShrink: 1,
		},
		compactTrigger: {
			minHeight: SIZES.S44,
			borderRadius: RADIUS.S12,
			paddingHorizontal: SPACING.S8,
			gap: SPACING.S5,
		},
		compactValue: {
			fontSize: FONT_SIZE.S13,
			fontWeight: FONT_WEIGHT.BOLD,
			flex: 0,
			flexShrink: 1,
		},
		label: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
			fontWeight: FONT_WEIGHT.BOLD,
			textTransform: TEXT_TRANSFORM.UPPERCASE,
			letterSpacing: LETTER_SPACING.WIDEST,
		},
		trigger: {
			minHeight: SIZES.S50,
			paddingVertical: SPACING.S8,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.borderStrong,
			borderRadius: RADIUS.S15,
			backgroundColor: COLORS.surfaceLight,
			paddingHorizontal: SPACING.S14,
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
		},
		value: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
		},
	}),
);

export default DateField;
