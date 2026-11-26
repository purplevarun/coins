import CustomText from "@/components/CustomText";
import HeaderIconButton from "@/components/HeaderIconButton";
import ModalTextField from "@/components/ModalTextField";
import SelectField from "@/components/SelectField";
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
	entityLabel,
	entityOptions,
	entityPlaceholder,
	entityValue,
	entityName,
	isToAmountDisabled = false,
	sourceLabel,
	sourceName,
	sourceOptions,
	sourcePlaceholder,
	sourceValue,
	toCurrencyCode,
	onAmountChange,
	onEntityChange,
	onSourceChange,
	onToAmountChange,
	onRemove,
}: TransactionItemRowProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	const hasSecondaryRow =
		onSourceChange !== undefined || onToAmountChange !== undefined;
	return (
		<View style={styles.item}>
			<View style={styles.itemHeading}>
				<CustomText
					style={styles.itemTitle}
				>{`Item ${position + 1} of ${count}`}</CustomText>
				{count > 1 ? (
					<HeaderIconButton
						icon="close-outline"
						isDisabled={isDisabled}
						accessibilityLabel={`Remove item ${position + 1}`}
						onPress={onRemove}
					/>
				) : null}
			</View>
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
						label={entityLabel}
						placeholder={entityPlaceholder}
						value={entityValue ?? ""}
						onChange={onEntityChange}
						options={
							entityValue &&
							!entityOptions.some(
								(option) => option.value === entityValue,
							)
								? [
										{
											value: entityValue,
											label: entityName ?? entityLabel,
										},
										...entityOptions,
									]
								: entityOptions
						}
					/>
				</View>
				{hasSecondaryRow && onToAmountChange ? (
					<View style={styles.fieldColumn}>
						<ModalTextField
							isDisabled={isDisabled || isToAmountDisabled}
							keyboardType="decimal-pad"
							label={`To amount${toCurrencyCode ? ` (${toCurrencyCode})` : ""}`}
							placeholder="0.00"
							value={item.toAmount ?? ""}
							onChange={onToAmountChange}
						/>
					</View>
				) : null}
				{onSourceChange ? (
					<View style={styles.fieldColumn}>
						<SelectField
							label={sourceLabel ?? "Source"}
							placeholder={sourcePlaceholder ?? "Select source"}
							value={sourceValue ?? ""}
							onChange={onSourceChange}
							options={
								sourceValue &&
								sourceOptions &&
								!sourceOptions.some(
									(option) => option.value === sourceValue,
								)
									? [
											{
												value: sourceValue,
												label:
													sourceName ??
													sourceLabel ??
													"Source",
											},
											...sourceOptions,
										]
									: (sourceOptions ?? [])
							}
						/>
					</View>
				) : null}
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
