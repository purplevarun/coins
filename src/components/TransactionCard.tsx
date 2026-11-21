import CustomText from "@/components/CustomText";
import type ThemeColors from "@/types/ThemeColors";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import GlassCard from "@/components/GlassCard";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import transactionService from "@/services/transactionService";
import type Transaction from "@/types/Transaction";
import type TransactionCardProps from "@/types/TransactionCardProps";
import createThemedStyles from "@/utils/createThemedStyles";
import dateUtils from "@/utils/date";
import moneyUtils from "@/utils/money";
const { getTransactionDisplayReason } = transactionService;
const { formatDate } = dateUtils;
const { formatMoney, sumMoney } = moneyUtils;

const getTransactionColor = (
	COLORS: ThemeColors,
	transaction: Transaction,
): string => {
	if (transaction.type === "CREDIT") {
		return COLORS.success;
	}
	if (transaction.type === "DEBIT") {
		return COLORS.danger;
	}
	return COLORS.blue;
};

const getTransactionIcon = (
	transaction: Transaction,
): React.ComponentProps<typeof Ionicons>["name"] => {
	if (transaction.type === "CREDIT") {
		return "arrow-down";
	}
	if (transaction.type === "DEBIT") {
		return "arrow-up";
	}
	return "swap-horizontal";
};

const TransactionCard = ({
	transaction,
	categoryId,
	onPress,
	onLongPress,
}: TransactionCardProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const color = getTransactionColor(COLORS, transaction);
	const hasItems = transaction.items.length > 0;
	const categories = hasItems
		? [...new Set(transaction.items.map((item) => item.categoryName))].join(
				", ",
			)
		: (transaction.categoryName ?? "");
	const matchedItems =
		categoryId && hasItems
			? transaction.items.filter((item) => item.categoryId === categoryId)
			: [];
	const matchedCategory = matchedItems[0]?.categoryName;

	return (
		<Pressable onPress={onPress} onLongPress={onLongPress}>
			<GlassCard>
				<View style={styles.row}>
					<View
						style={[
							styles.typeIcon,
							{
								backgroundColor: `${color}20`,
							},
						]}
					>
						<Ionicons
							color={color}
							name={getTransactionIcon(transaction)}
							size={22}
						/>
					</View>
					<View style={styles.details}>
						<View style={styles.headingRow}>
							{transaction.isApplicable === false ? (
								<Ionicons
									accessible
									accessibilityRole="image"
									accessibilityLabel={
										MESSAGES.TRANSACTION_FORM.NOT_APPLICABLE
									}
									color={COLORS.warning}
									name="warning"
									size={20}
								/>
							) : null}
							<CustomText style={styles.reason}>
								{getTransactionDisplayReason(transaction)}
							</CustomText>
						</View>
						<CustomText style={styles.meta}>
							{transaction.classification === "INVESTMENT"
								? transaction.investmentName
								: transaction.type === "TRANSFER"
									? `${transaction.sourceName} -> ${transaction.destinationSourceName ?? ""}`
									: `${transaction.sourceName} · ${categories}`}
						</CustomText>
						{matchedCategory && transaction.items.length > 1 ? (
							<CustomText
								style={styles.meta}
							>{`${matchedCategory}: ${formatMoney(sumMoney(matchedItems.map((item) => item.amount)), transaction.sourceCurrencyCode)} of ${formatMoney(transaction.amount, transaction.sourceCurrencyCode)}`}</CustomText>
						) : null}
						{transaction.tripName ? (
							<CustomText style={styles.trip}>
								{transaction.tripName}
							</CustomText>
						) : null}
						<CustomText style={styles.date}>
							{formatDate(transaction.transactionAt)}
						</CustomText>
					</View>
					<View style={styles.amountColumn}>
						<CustomText style={[styles.amount, { color }]}>
							{transaction.type === "DEBIT"
								? "-"
								: transaction.type === "CREDIT"
									? "+"
									: ""}
							{formatMoney(
								transaction.amount,
								transaction.sourceCurrencyCode,
							)}
						</CustomText>
						{transaction.type === "TRANSFER" &&
						transaction.toAmount &&
						transaction.destinationCurrencyCode ? (
							<CustomText style={styles.toAmount}>
								{"-> "}
								{formatMoney(
									transaction.toAmount,
									transaction.destinationCurrencyCode,
								)}
							</CustomText>
						) : null}
					</View>
				</View>
			</GlassCard>
		</Pressable>
	);
};

const { ALIGN, FLEX, FONT_SIZE, FONT_WEIGHT, RADIUS, SIZES, SPACING } =
	styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		row: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.START,
			gap: SPACING.S11,
		},
		typeIcon: {
			width: SIZES.S43,
			height: SIZES.S43,
			borderRadius: RADIUS.S15,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
		},
		details: {
			flex: FLEX.FILL,
			gap: SPACING.S3,
		},
		headingRow: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S5,
		},
		reason: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			fontWeight: FONT_WEIGHT.BLACK,
			flexShrink: FLEX.SHRINK,
		},
		meta: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
		},
		trip: {
			color: COLORS.primaryBright,
			fontSize: FONT_SIZE.S11,
			fontWeight: FONT_WEIGHT.BOLD,
		},
		date: {
			color: COLORS.textDim,
			fontSize: FONT_SIZE.S11,
		},
		amountColumn: {
			alignItems: ALIGN.END,
			gap: SPACING.S3,
			flexShrink: FLEX.NONE,
		},
		amount: {
			fontSize: FONT_SIZE.S14,
			fontWeight: FONT_WEIGHT.BLACK,
			textAlign: ALIGN.RIGHT,
		},
		toAmount: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S11,
			fontWeight: FONT_WEIGHT.BOLD,
		},
	}),
);

export default TransactionCard;
