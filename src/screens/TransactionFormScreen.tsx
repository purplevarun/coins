import CustomText from "@/components/CustomText";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import AppButton from "@/components/AppButton";
import DateField from "@/components/DateField";
import GlassCard from "@/components/GlassCard";
import HeaderIconButton from "@/components/HeaderIconButton";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import SelectField from "@/components/SelectField";
import TextField from "@/components/TextField";
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
	const [focusedItemKey, setFocusedItemKey] = useState<string | null>(null);
	const [isApplicable, setIsApplicable] = useState(true);
	const saving = useRef(false);

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
								setFocusedItemKey(item.key);
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
								<SelectField
									isCompact
									label={
										MESSAGES.TRANSACTION_FORM.CATEGORY_LABEL
									}
									placeholder={
										MESSAGES.TRANSACTION_FORM
											.SELECT_CATEGORY
									}
									value={items[0]?.categoryId ?? ""}
									onChange={(value) => {
										if (items[0])
											updateItem(items[0].key, {
												categoryId: value,
											});
										clearTripForAgnosticCategory(value);
									}}
									options={categoryOptions}
								/>
							)}
						</View>
					</View>
					<View style={styles.pinnedRow}>
						<View style={styles.pinnedCell}>
							<DateField
								isCompact
								label={MESSAGES.TRANSACTION_FORM.DATE_LABEL}
								onChange={setTransactionAt}
								value={transactionAt}
							/>
						</View>
						<View style={styles.pinnedCell}>
							{classification === "GENERAL" && !isTransfer ? (
								<SelectField
									isCompact
									isOptional
									label={MESSAGES.TRANSACTION_FORM.TRIP_LABEL}
									onChange={setTripId}
									options={tripOptions}
									placeholder={MESSAGES.COMPONENTS.NO_TRIP}
									value={tripId}
								/>
							) : null}
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
						<TextField
							autoFocus={
								!transactionId && !cloneFromTransactionId
							}
							isEditable={!isSaving}
							keyboardType="decimal-pad"
							label={
								isTransfer && selectedSource
									? `From (${selectedSource.currencyCode})`
									: `Amount${selectedSource ? ` (${selectedSource.currencyCode})` : ""}`
							}
							onChangeText={setAmount}
							placeholder="0.00"
							value={amount}
						/>
					) : null}
					{isItemized ? (
						<View style={styles.items}>
							{items.map((item, position) => (
								<View key={item.key} style={styles.item}>
									{items.length > 1 ? (
										<View style={styles.itemHeading}>
											<CustomText
												style={styles.itemTitle}
											>{`Item ${position + 1}`}</CustomText>
											<HeaderIconButton
												icon="close-outline"
												isDisabled={isSaving}
												accessibilityLabel={`Remove item ${position + 1}`}
												onPress={() =>
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
									) : null}
									<View style={styles.itemFields}>
										<View style={styles.fieldColumn}>
											<TextField
												autoFocus={
													item.key ===
														focusedItemKey ||
													(!transactionId &&
														!cloneFromTransactionId &&
														position === 0)
												}
												isEditable={!isSaving}
												keyboardType="decimal-pad"
												label={`Amount${selectedSource ? ` (${selectedSource.currencyCode})` : ""}`}
												placeholder="0.00"
												value={item.amount}
												onChangeText={(value) =>
													updateItem(item.key, {
														amount: value,
													})
												}
											/>
										</View>
										<View style={styles.fieldColumn}>
											<SelectField
												label={
													MESSAGES.TRANSACTION_FORM
														.CATEGORY_LABEL
												}
												placeholder={
													MESSAGES.TRANSACTION_FORM
														.SELECT_CATEGORY
												}
												value={item.categoryId}
												onChange={(value) => {
													updateItem(item.key, {
														categoryId: value,
													});
													clearTripForAgnosticCategory(
														value,
													);
												}}
												options={
													item.categoryId &&
													!categoryOptions.some(
														(option) =>
															option.value ===
															item.categoryId,
													)
														? [
																{
																	value: item.categoryId,
																	label:
																		item.categoryName ??
																		"Category",
																},
																...categoryOptions,
															]
														: categoryOptions
												}
											/>
										</View>
									</View>
								</View>
							))}
						</View>
					) : null}
					{isTransfer ? (
						<TextField
							isEditable={!isSameCurrencyTransfer}
							keyboardType="decimal-pad"
							label={`To amount${selectedDestination ? ` (${selectedDestination.currencyCode})` : ""}`}
							onChangeText={setToAmount}
							placeholder="0.00"
							value={effectiveToAmount}
						/>
					) : null}
					<TextField
						isEditable={!isSaving}
						label={MESSAGES.TRANSACTION_FORM.REASON_LABEL}
						onChangeText={setReason}
						placeholder={
							isTransfer
								? MESSAGES.TRANSACTION_FORM.DEFAULTS_TO_TRANSFER
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

const { ALIGN, BORDER, FLEX, FONT_SIZE, FONT_WEIGHT, SIZES, SPACING } =
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
		itemFields: {
			flexDirection: FLEX.ROW,
			flexWrap: FLEX.WRAP,
			gap: SPACING.S12,
		},
		fieldColumn: { flexGrow: 1, flexBasis: SIZES.S120, minWidth: 0 },
		footer: { gap: SPACING.S8 },
		totalSummary: { flexGrow: 1, flexBasis: 140, minWidth: 0 },
		totalLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.S12 },
		footerAction: { flex: 1, minWidth: 160 },
		items: { gap: SPACING.S16 },
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
