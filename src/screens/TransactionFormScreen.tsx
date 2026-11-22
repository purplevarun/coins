import CustomText from "@/components/CustomText";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";

import AppButton from "@/components/AppButton";
import DateField from "@/components/DateField";
import GlassCard from "@/components/GlassCard";
import HeaderIconButton from "@/components/HeaderIconButton";
import ModalTextField from "@/components/ModalTextField";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import SelectField from "@/components/SelectField";
import TransactionItemRow from "@/components/TransactionItemRow";
import financeConstants from "@/constants/financeConstants";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import categoryService from "@/services/categoryService";
import investmentService from "@/services/investmentService";
import settingsService from "@/services/settingsService";
import sourceService from "@/services/sourceService";
import transactionService from "@/services/transactionService";
import tripService from "@/services/tripService";
import type Category from "@/types/Category";
import type Investment from "@/types/Investment";
import type SelectOption from "@/types/SelectOption";
import type Source from "@/types/Source";
import type TransactionClassification from "@/types/TransactionClassification";
import type TransactionFormScreenProps from "@/types/TransactionFormScreenProps";
import type TransactionItemDraft from "@/types/TransactionItemDraft";
import type TransactionItemInput from "@/types/TransactionItemInput";
import type TransactionType from "@/types/TransactionType";
import type Trip from "@/types/Trip";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
import createId from "@/utils/id";
import moneyUtils from "@/utils/money";
const { normalizeMoney, sumMoney, formatMoney } = moneyUtils;
const { getCategories } = categoryService;
const { getInvestments } = investmentService;
const { getDefaultSourceId, getDefaultTripId } = settingsService;
const { getSources } = sourceService;
const { deleteTransaction, getTransaction, saveTransaction } =
	transactionService;
const { getTrips } = tripService;

const {
	CATEGORY_KIND_LABELS,
	DEFAULT_TRANSACTION_CLASSIFICATION,
	DEFAULT_TRANSACTION_TYPE,
	GENERAL_TRANSACTION_TYPE_OPTIONS,
	INVESTMENT_TRANSACTION_TYPE_OPTIONS,
	TRANSACTION_CLASSIFICATION_OPTIONS,
} = financeConstants;

const createItemDraft = (
	amount = "",
	categoryId = "",
): TransactionItemDraft => ({ key: createId(), amount, categoryId });

const TransactionFormScreen = ({
	navigation,
	route,
}: TransactionFormScreenProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const transactionId = route.params?.transactionId;
	const cloneFromTransactionId = route.params?.cloneFromTransactionId;
	const initialSourceId = route.params?.initialSourceId;
	const initialCategoryId = route.params?.initialCategoryId;
	const { database, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const [classification, setClassification] =
		useState<TransactionClassification>(DEFAULT_TRANSACTION_CLASSIFICATION);
	const [type, setType] = useState<TransactionType>(
		route.params?.initialType ?? DEFAULT_TRANSACTION_TYPE,
	);
	const [sourceId, setSourceId] = useState("");
	const [destinationSourceId, setDestinationSourceId] = useState("");
	const [amount, setAmount] = useState(route.params?.initialAmount ?? "");
	const [toAmount, setToAmount] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [tripId, setTripId] = useState("");
	const [investmentId, setInvestmentId] = useState("");
	const [reason, setReason] = useState(route.params?.initialReason ?? "");
	const [transactionAt, setTransactionAt] = useState(
		() => route.params?.initialTransactionAt ?? Date.now(),
	);
	const [sources, setSources] = useState<readonly Source[]>([]);
	const [categories, setCategories] = useState<readonly Category[]>([]);
	const [trips, setTrips] = useState<readonly Trip[]>([]);
	const [investments, setInvestments] = useState<readonly Investment[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const [items, setItems] = useState<readonly TransactionItemDraft[]>(() => [
		createItemDraft(
			route.params?.initialAmount ?? "",
			initialCategoryId ?? "",
		),
	]);
	const [isApplicable, setIsApplicable] = useState(true);
	const [itemsWidth, setItemsWidth] = useState(0);
	const [activeItemIndex, setActiveItemIndex] = useState(0);
	const saving = useRef(false);
	const itemsScroller = useRef<ScrollView>(null);

	useEffect(() => {
		const getFormData = async (): Promise<void> => {
			try {
				const lookupTransactionId =
					transactionId ?? cloneFromTransactionId;
				const [
					loadedSources,
					loadedCategories,
					loadedTrips,
					loadedInvestments,
					existingTransaction,
					defaultTrip,
					defaultSource,
				] = await Promise.all([
					getSources(database),
					getCategories(database),
					getTrips(database),
					getInvestments(database),
					lookupTransactionId
						? getTransaction(database, lookupTransactionId)
						: Promise.resolve(null),
					// Only load default trip for new (non-edit, non-clone) txns
					!lookupTransactionId
						? getDefaultTripId(database)
						: Promise.resolve(null),
					!lookupTransactionId
						? getDefaultSourceId(database)
						: Promise.resolve(null),
				]);
				setSources(loadedSources);
				setCategories(loadedCategories);
				setTrips(loadedTrips);
				setInvestments(loadedInvestments);
				if (!existingTransaction) {
					if (!lookupTransactionId) {
						setSourceId(
							initialSourceId ??
								loadedSources.find(
									(source) => source.id === defaultSource,
								)?.id ??
								"",
						);
						setCategoryId(initialCategoryId ?? "");
					}
					// Prefill default trip for new transactions
					if (defaultTrip) {
						setTripId(defaultTrip);
					}
					return;
				}
				setClassification(existingTransaction.classification);
				setType(existingTransaction.type);
				setSourceId(existingTransaction.sourceId);
				setDestinationSourceId(
					existingTransaction.destinationSourceId ?? "",
				);
				setAmount(existingTransaction.amount);
				setToAmount(existingTransaction.toAmount ?? "");
				setCategoryId(existingTransaction.categoryId ?? "");
				setTripId(existingTransaction.tripId ?? "");
				setInvestmentId(existingTransaction.investmentId ?? "");
				setReason(existingTransaction.reason);
				setIsApplicable(existingTransaction.isApplicable ?? true);
				if (
					existingTransaction.classification === "GENERAL" &&
					existingTransaction.type !== "TRANSFER"
				) {
					setItems(
						existingTransaction.items.length > 0
							? existingTransaction.items.map((item) => ({
									key: createId(),
									id: cloneFromTransactionId
										? undefined
										: item.id,
									amount: item.amount,
									categoryId: item.categoryId,
									categoryName: item.categoryName,
								}))
							: [
									createItemDraft(
										existingTransaction.amount,
										existingTransaction.categoryId ?? "",
									),
								],
					);
				}
				// For clone mode: use today's date, not the original date
				if (!cloneFromTransactionId) {
					setTransactionAt(existingTransaction.transactionAt);
				}
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getFormData();
	}, [
		database,
		transactionId,
		cloneFromTransactionId,
		initialSourceId,
		initialCategoryId,
	]);

	const selectedSource = sources.find((source) => source.id === sourceId);
	const selectedDestination = sources.find(
		(source) => source.id === destinationSourceId,
	);
	const isTransfer = classification === "GENERAL" && type === "TRANSFER";
	const isItemized =
		classification === "GENERAL" && (type === "DEBIT" || type === "CREDIT");
	const isInvestment = classification === "INVESTMENT";
	const itemCardWidth = Math.max(itemsWidth * 0.8, 1);
	const itemArrowWidth = itemsWidth * 0.1;
	const shownItemIndex = Math.min(
		activeItemIndex,
		Math.max(items.length - 1, 0),
	);
	const scrollToItem = (index: number): void => {
		const target = Math.max(0, Math.min(index, items.length - 1));
		itemsScroller.current?.scrollTo({
			x: target * itemCardWidth,
			animated: true,
		});
		setActiveItemIndex(target);
	};
	const isSameCurrencyTransfer =
		isTransfer &&
		selectedSource?.currencyCode === selectedDestination?.currencyCode;
	const effectiveToAmount = isSameCurrencyTransfer ? amount : toAmount;
	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={styles.headerActions}>
					<Switch
						accessibilityLabel={
							MESSAGES.TRANSACTION_FORM.APPLICABLE
						}
						value={isApplicable}
						onValueChange={setIsApplicable}
						disabled={isSaving}
						trackColor={{
							false: COLORS.borderStrong,
							true: COLORS.primaryMuted,
						}}
						thumbColor={
							isApplicable ? COLORS.primary : COLORS.textMuted
						}
					/>
					{isItemized ? (
						<HeaderIconButton
							icon="add"
							isDisabled={isSaving}
							accessibilityLabel={
								MESSAGES.TRANSACTION_FORM.ADD_ITEM
							}
							onPress={() => {
								const item = createItemDraft();
								setItems((current) => [...current, item]);
								setTimeout(() => {
									const scroller = itemsScroller.current;
									if (
										typeof scroller?.scrollToEnd ===
										"function"
									) {
										scroller.scrollToEnd({
											animated: true,
										});
									}
								}, 0);
							}}
						/>
					) : null}
				</View>
			),
		});
	}, [isItemized, isApplicable, isSaving, navigation, styles, COLORS]);
	let itemTotal: string | null;
	try {
		itemTotal = sumMoney(items.map((item) => normalizeMoney(item.amount)));
	} catch {
		itemTotal = null;
	}
	let total = itemTotal;
	if (!isItemized) {
		try {
			total = normalizeMoney(amount);
		} catch {
			total = null;
		}
	}

	const updateItem = (
		key: string,
		changes: Partial<TransactionItemInput>,
	): void => {
		setItems((current) =>
			current.map((item) =>
				item.key === key ? { ...item, ...changes } : item,
			),
		);
	};

	const sourceOptions: readonly SelectOption[] = sources.map((source) => ({
		label: source.name,
		value: source.id,
		description: `${source.currencyCode} · ${source.balance}`,
	}));
	const categoryOptions: readonly SelectOption[] = categories.map(
		(category) => ({
			label: category.name,
			value: category.id,
			description: CATEGORY_KIND_LABELS[category.kind],
		}),
	);
	const tripOptions: readonly SelectOption[] = trips.map((trip) => ({
		label: trip.name,
		value: trip.id,
	}));
	const clearTripForAgnosticCategory = (selectedId: string): void => {
		if (
			categories.find((category) => category.id === selectedId)
				?.tripAgnostic
		)
			setTripId("");
	};
	const investmentOptions: readonly SelectOption[] = investments.map(
		(investment) => ({
			label: investment.name,
			value: investment.id,
		}),
	);

	const changeMode = (
		nextClassification: TransactionClassification,
		nextType: TransactionType,
	): void => {
		const nextIsItemized =
			nextClassification === "GENERAL" &&
			(nextType === "DEBIT" || nextType === "CREDIT");
		const applyChange = (): void => {
			if (isItemized && !nextIsItemized) {
				setAmount(itemTotal ?? "");
				setCategoryId(items[0]?.categoryId ?? "");
				setItems([createItemDraft()]);
			} else if (!isItemized && nextIsItemized) {
				setItems([createItemDraft(amount, categoryId)]);
			}
			setClassification(nextClassification);
			setType(nextType);
		};
		if (isItemized && !nextIsItemized && items.length > 1) {
			dialog.confirm({
				title: MESSAGES.TRANSACTION_FORM.REMOVE_ITEMS_TITLE,
				message: MESSAGES.TRANSACTION_FORM.REMOVE_ITEMS_MESSAGE,
				confirmLabel: MESSAGES.COMMON.CONTINUE,
				onConfirm: applyChange,
			});
		} else {
			applyChange();
		}
	};

	const handleClassificationChange = (value: string): void => {
		const nextClassification =
			value === "INVESTMENT" ? "INVESTMENT" : "GENERAL";
		changeMode(
			nextClassification,
			nextClassification === "INVESTMENT" && type === "TRANSFER"
				? "DEBIT"
				: type,
		);
	};

	const handleTypeChange = (value: string): void => {
		changeMode(
			classification,
			value === "CREDIT" || value === "TRANSFER" ? value : "DEBIT",
		);
	};

	const handleSave = async (): Promise<void> => {
		if (saving.current) return;
		saving.current = true;
		setIsSaving(true);
		setError("");
		try {
			await saveTransaction(database, {
				id: transactionId,
				classification,
				type,
				isApplicable,
				sourceId,
				destinationSourceId:
					isTransfer && destinationSourceId
						? destinationSourceId
						: undefined,
				amount: isItemized ? (itemTotal ?? "0") : amount,
				items: isItemized
					? items.map((item) => ({
							id: item.id,
							amount: item.amount,
							categoryId: item.categoryId,
						}))
					: undefined,
				toAmount:
					isTransfer && effectiveToAmount
						? effectiveToAmount
						: undefined,
				categoryId: undefined,
				tripId:
					classification === "GENERAL" &&
					type !== "TRANSFER" &&
					tripId
						? tripId
						: undefined,
				investmentId:
					isInvestment && investmentId ? investmentId : undefined,
				reason,
				transactionAt,
			});
			refreshData();
			navigation.goBack();
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		} finally {
			saving.current = false;
			setIsSaving(false);
		}
	};

	const handleDelete = (targetTransactionId: string): void => {
		dialog.confirm({
			title: MESSAGES.TRANSACTION_FORM.DELETE_TITLE,
			message: MESSAGES.COMMON.IRREVERSIBLE,
			confirmLabel: MESSAGES.COMMON.DELETE,
			variant: "danger",
			onConfirm: () => {
				const processDelete = async (): Promise<void> => {
					try {
						await deleteTransaction(database, targetTransactionId);
						refreshData();
						navigation.goBack();
					} catch (caughtError: unknown) {
						setError(getErrorMessage(caughtError));
					}
				};
				void processDelete();
			},
		});
	};

	return (
		<ScreenContainer
			isScrollable={false}
			header={
				<View
					style={styles.pinned}
					pointerEvents={isSaving ? "none" : "auto"}
				>
					<View style={styles.pinnedRow}>
						<View style={styles.pinnedCell}>
							<SelectField
								isCompact
								isSearchable={false}
								label={
									MESSAGES.TRANSACTION_FORM
										.CLASSIFICATION_LABEL
								}
								onChange={handleClassificationChange}
								options={TRANSACTION_CLASSIFICATION_OPTIONS}
								value={classification}
							/>
						</View>
						<View style={styles.pinnedCell}>
							<SelectField
								isCompact
								isSearchable={false}
								label={
									MESSAGES.TRANSACTION_FORM.PAYMENT_TYPE_LABEL
								}
								onChange={handleTypeChange}
								options={
									classification === "GENERAL"
										? GENERAL_TRANSACTION_TYPE_OPTIONS
										: INVESTMENT_TRANSACTION_TYPE_OPTIONS
								}
								value={type}
							/>
						</View>
					</View>
					<View style={styles.pinnedRow}>
						<View style={styles.pinnedCell}>
							<SelectField
								isCompact
								label={
									type === "CREDIT"
										? MESSAGES.TRANSACTION_FORM
												.DESTINATION_SOURCE
										: "Source"
								}
								onChange={setSourceId}
								options={sourceOptions}
								placeholder={
									MESSAGES.TRANSACTION_FORM.SELECT_SOURCE
								}
								value={sourceId}
							/>
						</View>
						<View style={styles.pinnedCell}>
							{isTransfer ? (
								<SelectField
									isCompact
									label={
										MESSAGES.TRANSACTION_FORM
											.DESTINATION_SOURCE
									}
									onChange={setDestinationSourceId}
									options={sourceOptions.filter(
										(option) => option.value !== sourceId,
									)}
									placeholder={
										MESSAGES.TRANSACTION_FORM
											.SELECT_DESTINATION
									}
									value={destinationSourceId}
								/>
							) : isInvestment ? (
								<SelectField
									isCompact
									label={MESSAGES.TRANSACTION_FORM.INVESTMENT}
									onChange={setInvestmentId}
									options={investmentOptions}
									placeholder={
										MESSAGES.TRANSACTION_FORM
											.SELECT_INVESTMENT
									}
									value={investmentId}
								/>
							) : (
								<DateField
									isCompact
									label={MESSAGES.TRANSACTION_FORM.DATE_LABEL}
									onChange={setTransactionAt}
									value={transactionAt}
								/>
							)}
						</View>
					</View>
					<View style={styles.pinnedRow}>
						<View style={styles.pinnedCell}>
							{isTransfer || isInvestment ? (
								<DateField
									isCompact
									label={MESSAGES.TRANSACTION_FORM.DATE_LABEL}
									onChange={setTransactionAt}
									value={transactionAt}
								/>
							) : (
								<SelectField
									isCompact
									isOptional
									label={MESSAGES.TRANSACTION_FORM.TRIP_LABEL}
									onChange={setTripId}
									options={tripOptions}
									placeholder={MESSAGES.COMPONENTS.NO_TRIP}
									value={tripId}
								/>
							)}
						</View>
						<View style={styles.pinnedCell}>
							<ModalTextField
								isCompact
								isDisabled={isSaving}
								label={MESSAGES.TRANSACTION_FORM.REASON_LABEL}
								onChange={setReason}
								placeholder={
									isTransfer
										? MESSAGES.TRANSACTION_FORM
												.DEFAULTS_TO_TRANSFER
										: isInvestment
											? MESSAGES.TRANSACTION_FORM
													.DEFAULTS_TO_INVESTMENT
											: isItemized && items.length > 1
												? MESSAGES.TRANSACTION_FORM
														.DEFAULTS_TO_ITEMS
												: MESSAGES.TRANSACTION_FORM
														.DEFAULTS_TO_CATEGORY
								}
								value={reason}
							/>
						</View>
					</View>
				</View>
			}
			footer={
				<View style={styles.footer}>
					{sources.length === 0 ? (
						<Notice
							message={MESSAGES.TRANSACTION_FORM.NO_SOURCES}
							tone="warning"
						/>
					) : null}
					{error ? <Notice message={error} tone="danger" /> : null}
					<View style={styles.totalRow}>
						<View style={styles.totalSummary}>
							<CustomText style={styles.totalLabel}>
								Total
							</CustomText>
							<CustomText style={styles.totalAmount}>
								{total === null
									? "--"
									: selectedSource
										? formatMoney(
												total,
												selectedSource.currencyCode,
											)
										: total}
							</CustomText>
						</View>
						<View style={styles.footerAction}>
							<AppButton
								isDisabled={sources.length === 0}
								isLoading={isSaving}
								label={MESSAGES.TRANSACTION_FORM.SAVE_ACTION}
								onPress={() => void handleSave()}
							/>
						</View>
					</View>
				</View>
			}
		>
			<GlassCard>
				<View
					style={styles.form}
					pointerEvents={isSaving ? "none" : "auto"}
				>
					{!isItemized ? (
						<ModalTextField
							isDisabled={isSaving}
							keyboardType="decimal-pad"
							label={
								isTransfer && selectedSource
									? `From (${selectedSource.currencyCode})`
									: `Amount${selectedSource ? ` (${selectedSource.currencyCode})` : ""}`
							}
							onChange={setAmount}
							placeholder="0.00"
							value={amount}
						/>
					) : null}
					{isItemized ? (
						<View
							onLayout={(event) =>
								setItemsWidth(event.nativeEvent.layout.width)
							}
						>
							<View style={styles.itemCarousel}>
								<View
									style={[
										styles.itemArrow,
										{ width: itemArrowWidth },
									]}
								>
									<HeaderIconButton
										icon="chevron-back"
										isDisabled={
											isSaving || shownItemIndex === 0
										}
										accessibilityLabel={
											MESSAGES.TRANSACTION_FORM
												.PREVIOUS_ITEM
										}
										onPress={() =>
											scrollToItem(shownItemIndex - 1)
										}
									/>
								</View>
								<ScrollView
									decelerationRate="fast"
									disableIntervalMomentum
									horizontal
									keyboardShouldPersistTaps="handled"
									onMomentumScrollEnd={(event) =>
										setActiveItemIndex(
											Math.max(
												0,
												Math.min(
													Math.round(
														event.nativeEvent
															.contentOffset.x /
															itemCardWidth,
													),
													items.length - 1,
												),
											),
										)
									}
									ref={itemsScroller}
									showsHorizontalScrollIndicator={false}
									snapToAlignment="start"
									snapToInterval={itemCardWidth}
									style={{ width: itemCardWidth }}
								>
									{items.map((item, position) => (
										<View
											key={item.key}
											style={{ width: itemCardWidth }}
										>
											<View style={styles.itemCard}>
												<TransactionItemRow
													categoryOptions={
														categoryOptions
													}
													count={items.length}
													currencyCode={
														selectedSource?.currencyCode
													}
													isDisabled={isSaving}
													item={item}
													position={position}
													onAmountChange={(value) =>
														updateItem(item.key, {
															amount: value,
														})
													}
													onCategoryChange={(
														value,
													) => {
														updateItem(item.key, {
															categoryId: value,
														});
														clearTripForAgnosticCategory(
															value,
														);
													}}
													onRemove={() =>
														setItems((current) =>
															current.filter(
																(candidate) =>
																	candidate.key !==
																	item.key,
															),
														)
													}
												/>
											</View>
										</View>
									))}
								</ScrollView>
								<View
									style={[
										styles.itemArrow,
										{ width: itemArrowWidth },
									]}
								>
									<HeaderIconButton
										icon="chevron-forward"
										isDisabled={
											isSaving ||
											shownItemIndex >= items.length - 1
										}
										accessibilityLabel={
											MESSAGES.TRANSACTION_FORM.NEXT_ITEM
										}
										onPress={() =>
											scrollToItem(shownItemIndex + 1)
										}
									/>
								</View>
							</View>
							{items.length > 1 ? (
								<View style={styles.itemDots}>
									{items.map((item, position) => (
										<View
											key={item.key}
											style={[
												styles.itemDot,
												position === shownItemIndex
													? styles.itemDotActive
													: null,
											]}
										/>
									))}
								</View>
							) : null}
						</View>
					) : null}
					{isTransfer ? (
						<ModalTextField
							isDisabled={isSameCurrencyTransfer}
							keyboardType="decimal-pad"
							label={`To amount${selectedDestination ? ` (${selectedDestination.currencyCode})` : ""}`}
							onChange={setToAmount}
							placeholder="0.00"
							value={effectiveToAmount}
						/>
					) : null}
					{transactionId ? (
						<AppButton
							label={MESSAGES.TRANSACTION_FORM.DELETE_ACTION}
							onPress={() => handleDelete(transactionId)}
							variant="danger"
						/>
					) : null}
				</View>
			</GlassCard>
		</ScreenContainer>
	);
};

const { ALIGN, BORDER, FLEX, FONT_SIZE, FONT_WEIGHT, RADIUS, SIZES, SPACING } =
	styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		headerActions: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S8,
		},
		pinned: {
			backgroundColor: COLORS.background,
			paddingHorizontal: SPACING.S16,
			paddingTop: SPACING.S8,
			paddingBottom: SPACING.S12,
			gap: SPACING.S8,
			borderBottomWidth: BORDER.THIN,
			borderBottomColor: COLORS.border,
		},
		pinnedRow: { flexDirection: FLEX.ROW, gap: SPACING.S8 },
		pinnedCell: { flex: FLEX.FILL, minWidth: 0 },
		footer: { gap: SPACING.S8 },
		totalSummary: { flexGrow: 1, flexBasis: 140, minWidth: 0 },
		totalLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.S12 },
		footerAction: { flex: 1, minWidth: 160 },
		itemArrow: { alignItems: ALIGN.CENTER },
		itemCard: {
			backgroundColor: COLORS.surfaceFaint,
			borderColor: COLORS.borderStrong,
			borderRadius: RADIUS.S16,
			borderWidth: BORDER.THIN,
			marginHorizontal: SPACING.S4,
			padding: SPACING.S12,
		},
		itemCarousel: { flexDirection: FLEX.ROW, alignItems: ALIGN.CENTER },
		itemDot: {
			width: SIZES.S8,
			height: SIZES.S8,
			borderRadius: RADIUS.PILL,
			backgroundColor: COLORS.textMuted,
		},
		itemDotActive: { backgroundColor: COLORS.primary },
		itemDots: {
			flexDirection: FLEX.ROW,
			justifyContent: ALIGN.CENTER,
			gap: SPACING.S8,
			marginTop: SPACING.S8,
		},
		totalRow: {
			flexDirection: FLEX.ROW,
			flexWrap: FLEX.WRAP,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
			gap: SPACING.S12,
		},
		totalAmount: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S18,
			fontWeight: FONT_WEIGHT.BOLD,
			flexShrink: FLEX.SHRINK,
		},
		form: {
			gap: SPACING.S16,
		},
	}),
);

export default TransactionFormScreen;
