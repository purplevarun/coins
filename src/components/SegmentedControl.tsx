import CustomText from "@/components/CustomText";
import { Pressable, StyleSheet, View } from "react-native";

import styleConstants from "@/constants/styleConstants";
import useThemedStyles from "@/hooks/useThemedStyles";
import type SegmentedControlProps from "@/types/SegmentedControlProps";
import createThemedStyles from "@/utils/createThemedStyles";

const SegmentedControl = ({
	value,
	options,
	onChange,
	labelNumberOfLines = 0,
}: SegmentedControlProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	return (
		<View style={styles.container}>
			{options.map((option) => {
				const isSelected = option.value === value;

				return (
					<Pressable
						key={option.value}
						onPress={() => onChange(option.value)}
						style={[
							styles.option,
							isSelected && styles.selectedOption,
						]}
					>
						<CustomText
							numberOfLines={labelNumberOfLines}
							style={[
								styles.label,
								isSelected && styles.selectedLabel,
							]}
						>
							{option.label}
						</CustomText>
					</Pressable>
				);
			})}
		</View>
	);
};

const { ALIGN, BORDER, FLEX, FONT_SIZE, FONT_WEIGHT, RADIUS, SIZES, SPACING } =
	styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		container: {
			flexDirection: FLEX.ROW,
			flexWrap: FLEX.WRAP,
			padding: SPACING.S4,
			borderRadius: RADIUS.S16,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			backgroundColor: COLORS.surfaceSoft,
			gap: SPACING.S4,
		},
		option: {
			flexBasis: "auto",
			flexGrow: FLEX.FILL,
			maxWidth: "100%",
			minWidth: SIZES.S0,
			minHeight: SIZES.S42,
			borderRadius: RADIUS.S12,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
			paddingHorizontal: SPACING.S8,
			paddingVertical: SPACING.S6,
		},
		selectedOption: {
			backgroundColor: COLORS.primaryMuted,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.borderStrong,
		},
		label: {
			flexShrink: 1,
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S13,
			fontWeight: FONT_WEIGHT.BOLD,
			textAlign: ALIGN.CENTER,
		},
		selectedLabel: {
			color: COLORS.primaryBright,
		},
	}),
);

export default SegmentedControl;
