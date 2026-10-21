import categoryService from "@/services/categoryService";
import type ListItemProps from "@/types/ListItemProps";
import type ThemeColors from "@/types/ThemeColors";

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import CategoryConversionModal from "@/components/CategoryConversionModal";
import CustomText from "@/components/CustomText";
import EmptyState from "@/components/EmptyState";
import FloatingAddButton from "@/components/FloatingAddButton";
import GlassCard from "@/components/GlassCard";
import InvestmentConversionModal from "@/components/InvestmentConversionModal";
import ListHeader from "@/components/ListHeader";
import Notice from "@/components/Notice";
import ScreenList from "@/components/ScreenList";
import TransactionCard from "@/components/TransactionCard";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import investmentService from "@/services/investmentService";
import sourceService from "@/services/sourceService";
import transactionService from "@/services/transactionService";
import tripService from "@/services/tripService";
import type LinkedTransactionsScreenProps from "@/types/LinkedTransactionsScreenProps";
import type RelationKind from "@/types/RelationKind";
import type Transaction from "@/types/Transaction";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
import getRelationLabels from "@/utils/relation";
import runAfterRender from "@/utils/runAfterRender";
const { deleteCategory } = categoryService;
const { deleteInvestment } = investmentService;
const { deleteSource } = sourceService;
const { getLinkedTransactions } = transactionService;
const { deleteTrip } = tripService;

const getRelationIcon = (
	kind: RelationKind,
): React.ComponentProps<typeof Ionicons>["name"] => {
	if (kind === "SOURCE") {
		return "wallet-outline";
	}
	if (kind === "CATEGORY") {
		return "pricetag-outline";
	}
	if (kind === "TRIP") {
		return "airplane-outline";
	}
	return "trending-up";
};

const getRelationColor = (COLORS: ThemeColors, kind: RelationKind): string => {
	if (kind === "SOURCE") {
		return COLORS.blue;
	}
	if (kind === "CATEGORY") {
		return COLORS.warning;
	}
	if (kind === "TRIP") {
		return COLORS.cyan;
	}
	return COLORS.success;
};

const LinkedTransactionsScreen = ({
	navigation,
	route,
}: LinkedTransactionsScreenProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const {
		entityId,
		entityName,
		kind,
		dateRangeStart,
		dateRangeEnd,
		dateRangeLabel,
	} = route.params;
	const { database, dataVersion, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const [transactions, setTransactions] = useState<readonly Transaction[]>(
		[],
	);
	const [error, setError] = useState("");
	const [isConvertOpen, setIsConvertOpen] = useState(false);
	const relationLabels = getRelationLabels(kind);
	const isConvertible = kind === "CATEGORY" || kind === "INVESTMENT";

	const getScreenData = useCallback(async (): Promise<void> => {
		try {
			const all = await getLinkedTransactions(database, {
				entityId,
				kind,
			});
			// Filter by date range if provided (from Analysis screen drill-down)
			const filtered =
				dateRangeStart !== undefined && dateRangeEnd !== undefined
					? all.filter(
							(t) =>
								t.transactionAt >= dateRangeStart &&
								t.transactionAt <= dateRangeEnd,
						)
					: all;
			setTransactions(filtered);
			setError("");
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		}
	}, [database, entityId, kind, dateRangeStart, dateRangeEnd]);

	useEffect(
		() =>
			runAfterRender(() => {
				void getScreenData();
			}),
		[dataVersion, getScreenData],
	);

	const processDelete = useCallback(async (): Promise<void> => {
		try {
			if (kind === "SOURCE") {
				await deleteSource(database, entityId);
			} else if (kind === "CATEGORY") {
				await deleteCategory(database, entityId);
			} else if (kind === "TRIP") {
				await deleteTrip(database, entityId);
			} else {
				await deleteInvestment(database, entityId);
			}
			refreshData();
			navigation.goBack();
		} catch (caughtError: unknown) {
			dialog.showMessage({
				title: MESSAGES.COMMON.UNABLE_TO_DELETE,
				message: getErrorMessage(caughtError),
				variant: "danger",
			});
		}
	}, [database, dialog, entityId, kind, navigation, refreshData]);

	const handleDelete = useCallback((): void => {
		dialog.confirm({
			title: `Delete ${entityName}?`,
			message: `This permanently deletes the ${relationLabels.singular} when it has no linked transactions.`,
			confirmLabel: MESSAGES.COMMON.DELETE,
			variant: "danger",
			onConfirm: () => {
				void processDelete();
			},
		});
	}, [dialog, entityName, processDelete, relationLabels.singular]);

	const handleConverted = (): void => {
		setIsConvertOpen(false);
		refreshData();
		navigation.goBack();
	};

	const handleEdit = useCallback((): void => {
		if (kind === "SOURCE") {
			navigation.navigate("SourceForm", { entityId });
			return;
		}
		if (kind === "CATEGORY") {
			navigation.navigate("CategoryForm", { entityId });
			return;
		}
		if (kind === "TRIP") {
			navigation.navigate("TripForm", { entityId });
			return;
		}
		navigation.navigate("InvestmentForm", { entityId });
	}, [entityId, kind, navigation]);

	const listHeader = useMemo(
		() => (
			<ListHeader>
				<GlassCard>
					<View style={styles.summaryRow}>
						<View
							style={[
								styles.iconBox,
								{
									backgroundColor: `${getRelationColor(COLORS, kind)}20`,
								},
							]}
						>
							<Ionicons
								color={getRelationColor(COLORS, kind)}
								name={getRelationIcon(kind)}
								size={23}
							/>
						</View>
						<View style={styles.summaryDetails}>
							<CustomText style={styles.title}>
								{entityName}
							</CustomText>
							{dateRangeLabel ? (
								<CustomText style={styles.dateRange}>
									{dateRangeLabel}
								</CustomText>
							) : null}
							<CustomText style={styles.subtitle}>
								{transactions.length} linked{" "}
								{transactions.length === 1
									? "transaction"
									: "transactions"}
							</CustomText>
						</View>
					</View>
					<View style={styles.actions}>
						<AppButton
							icon="create-outline"
							isCompact
							label={MESSAGES.COMMON.EDIT}
							onPress={handleEdit}
							style={styles.action}
							variant="secondary"
						/>
						{isConvertible ? (
							<AppButton
								icon="swap-horizontal-outline"
								isCompact
								label={MESSAGES.RELATION_ACTIONS.CONVERT}
								onPress={() => setIsConvertOpen(true)}
								style={styles.action}
								variant="secondary"
							/>
						) : null}
						<AppButton
							icon="trash-outline"
							isCompact
							label={MESSAGES.COMMON.DELETE}
							onPress={handleDelete}
							style={styles.action}
							variant="danger"
						/>
					</View>
				</GlassCard>
				{error ? <Notice message={error} tone="danger" /> : null}
			</ListHeader>
		),
		[
			dateRangeLabel,
			entityName,
			error,
			handleDelete,
			handleEdit,
			isConvertible,
			kind,
			transactions.length,
			styles,
			COLORS,
		],
	);

	const listEmpty = useMemo(
		() => (
			<EmptyState
				icon="swap-horizontal-outline"
				message={`No transactions are linked to this ${relationLabels.singular}.`}
				title={MESSAGES.LINKED_TRANSACTIONS.EMPTY_TITLE}
			/>
		),
		[relationLabels.singular],
	);

	const renderTransaction = useCallback(
		({
			item: transaction,
		}: ListItemProps<Transaction>): React.JSX.Element => (
			<TransactionCard
				transaction={transaction}
				categoryId={kind === "CATEGORY" ? entityId : undefined}
				onPress={() =>
					navigation.navigate("TransactionForm", {
						transactionId: transaction.id,
					})
				}
			/>
		),
		[navigation, kind, entityId],
	);

	return (
		<View style={styles.screen}>
			<ScreenList
				ListEmptyComponent={listEmpty}
				ListHeaderComponent={listHeader}
				data={transactions}
				keyExtractor={(transaction) => transaction.id}
				renderItem={renderTransaction}
			/>
			{kind === "SOURCE" || kind === "CATEGORY" ? (
				<FloatingAddButton
					onPress={() =>
						navigation.navigate(
							"TransactionForm",
							kind === "SOURCE"
								? { initialSourceId: entityId }
								: { initialCategoryId: entityId },
						)
					}
				/>
			) : null}
			{kind === "CATEGORY" ? (
				<CategoryConversionModal
					category={{ id: entityId, name: entityName }}
					isVisible={isConvertOpen}
					onClose={() => setIsConvertOpen(false)}
					onCompleted={handleConverted}
				/>
			) : null}
			{kind === "INVESTMENT" ? (
				<InvestmentConversionModal
					investment={{ id: entityId, name: entityName }}
					isVisible={isConvertOpen}
					onClose={() => setIsConvertOpen(false)}
					onCompleted={handleConverted}
				/>
			) : null}
		</View>
	);
};

const { ALIGN, FLEX, FONT_SIZE, FONT_WEIGHT, RADIUS, SIZES, SPACING } =
	styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		screen: {
			flex: FLEX.FILL,
			backgroundColor: COLORS.background,
		},
		summaryRow: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S12,
		},
		iconBox: {
			width: SIZES.S48,
			height: SIZES.S48,
			borderRadius: RADIUS.S16,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
		},
		summaryDetails: {
			flex: FLEX.FILL,
			gap: SPACING.S3,
		},
		title: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S18,
			fontWeight: FONT_WEIGHT.BLACK,
		},
		dateRange: {
			color: COLORS.primaryBright,
			fontSize: FONT_SIZE.S11,
			fontWeight: FONT_WEIGHT.BOLD,
		},
		subtitle: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
		},
		actions: {
			flexDirection: FLEX.ROW,
			flexWrap: FLEX.WRAP,
			justifyContent: ALIGN.END,
			gap: SPACING.S8,
			marginTop: SPACING.S14,
		},
		action: {
			flexGrow: FLEX.FILL,
			flexBasis: SIZES.S120,
			minWidth: SIZES.S120,
			maxWidth: "100%",
		},
	}),
);

export default LinkedTransactionsScreen;
