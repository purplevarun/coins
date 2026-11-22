import CustomText from "@/components/CustomText";
import HeaderIconButton from "@/components/HeaderIconButton";
import ModalTextField from "@/components/ModalTextField";
import SelectField from "@/components/SelectField";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useThemedStyles from "@/hooks/useThemedStyles";
import type TransactionItemRowProps from "@/types/TransactionItemRowProps";
import createThemedStyles from "@/utils/createThemedStyles";
import { StyleSheet, View } from "react-native";

const TransactionItemRow = ({
	item,
	position,
	count,
	isDisabled = false,
	currencyCode,
	categoryOptions,
	onAmountChange,
	onCategoryChange,
	onRemove,
}: TransactionItemRowProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	return (
		<View style={styles.item}>
			{count > 1 ? (
				<View style={styles.itemHeading}>
					<CustomText
						style={styles.itemTitle}
					>{`Item ${position + 1} of ${count}`}</CustomText>
					<HeaderIconButton
						icon="close-outline"
						isDisabled={isDisabled}
						accessibilityLabel={`Remove item ${position + 1}`}
						onPress={onRemove}
					/>
				</View>
			) : null}
			<View style={styles.itemFields}>
				<View style={styles.fieldColumn}>
					<ModalTextField
						isDisabled={isDisabled}
						keyboardType="decimal-pad"
						label={`Amount${currencyCode ? ` (${currencyCode})` : ""}`}
						placeholder="0.00"
						value={item.amount}
						onChange={onAmountChange}
					/>
				</View>
				<View style={styles.fieldColumn}>
					<SelectField
						label={MESSAGES.TRANSACTION_FORM.CATEGORY_LABEL}
						placeholder={MESSAGES.TRANSACTION_FORM.SELECT_CATEGORY}
						value={item.categoryId}
						onChange={onCategoryChange}
						options={
							item.categoryId &&
							!categoryOptions.some(
								(option) => option.value === item.categoryId,
							)
								? [
										{
											value: item.categoryId,
											label:
												item.categoryName ?? "Category",
										},
										...categoryOptions,
									]
								: categoryOptions
						}
					/>
				</View>
			</View>
		</View>
	);
};

const { ALIGN, FLEX, FONT_SIZE, FONT_WEIGHT, SIZES, SPACING } = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		item: { gap: SPACING.S12 },
		itemHeading: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
			minHeight: SIZES.S44,
		},
		itemTitle: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			fontWeight: FONT_WEIGHT.BOLD,
		},
		itemFields: {
			flexDirection: FLEX.ROW,
			flexWrap: FLEX.WRAP,
			gap: SPACING.S12,
		},
		fieldColumn: { flexGrow: 1, flexBasis: SIZES.S120, minWidth: 0 },
	}),
);

export default TransactionItemRow;
