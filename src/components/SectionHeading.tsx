import CustomText from "@/components/CustomText";
import { StyleSheet, View } from "react-native";

import styleConstants from "@/constants/styleConstants";
import useThemedStyles from "@/hooks/useThemedStyles";
import type SectionHeadingProps from "@/types/SectionHeadingProps";
import createThemedStyles from "@/utils/createThemedStyles";

const SectionHeading = ({
	title,
	subtitle,
}: SectionHeadingProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	return (
		<View style={styles.container}>
			<CustomText style={styles.title}>{title}</CustomText>
			{subtitle ? (
				<CustomText style={styles.subtitle}>{subtitle}</CustomText>
			) : null}
		</View>
	);
};

const { FONT_SIZE, FONT_WEIGHT, LETTER_SPACING, LINE_HEIGHT, SPACING } =
	styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		container: {
			gap: SPACING.S3,
		},
		title: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S18,
			fontWeight: FONT_WEIGHT.BLACK,
			letterSpacing: LETTER_SPACING.SNUG,
		},
		subtitle: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S13,
			lineHeight: LINE_HEIGHT.S18,
		},
	}),
);

export default SectionHeading;
