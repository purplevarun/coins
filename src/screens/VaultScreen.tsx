import CustomText from "@/components/CustomText";
import type CopyRowProps from "@/types/CopyRowProps";
import type ListItemProps from "@/types/ListItemProps";
import type VaultFormParams from "@/types/VaultFormParams";

import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import EmptyState from "@/components/EmptyState";
import FloatingAddButton from "@/components/FloatingAddButton";
import GlassCard from "@/components/GlassCard";
import HeaderIconButton from "@/components/HeaderIconButton";
import ListHeader from "@/components/ListHeader";
import Notice from "@/components/Notice";
import ScreenList from "@/components/ScreenList";
import SearchBar from "@/components/SearchBar";
import SegmentedControl from "@/components/SegmentedControl";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import cardService from "@/services/cardService";
import passwordService from "@/services/passwordService";
import type CardEntry from "@/types/CardEntry";
import type PasswordEntry from "@/types/PasswordEntry";
import type VaultEntryLabel from "@/types/VaultEntryLabel";
import type VaultKind from "@/types/VaultKind";
import type VaultListItem from "@/types/VaultListItem";
import type VaultScreenProps from "@/types/VaultScreenProps";
import createThemedStyles from "@/utils/createThemedStyles";
import dateUtils from "@/utils/date";
import getErrorMessage from "@/utils/error";
import runAfterRender from "@/utils/runAfterRender";
const { deleteCard, getCards } = cardService;
const { deletePassword, getPasswords } = passwordService;
const { formatDate } = dateUtils;

const CARD_TYPE_LABEL: Record<string, string> = {
	DEBIT_CARD: MESSAGES.VAULT.DEBIT_CARD,
	CREDIT_CARD: MESSAGES.VAULT.CREDIT_CARD,
	IDENTITY_CARD: MESSAGES.VAULT.IDENTITY_CARD,
};

const VAULT_ENTRY_LABEL: Record<VaultKind, VaultEntryLabel> = {
	PASSWORD: { one: "password", many: "passwords" },
	CARD: { one: "card", many: "cards" },
};

const VAULT_TAB_OPTIONS = [
	{ label: MESSAGES.HOME.PASSWORDS_LABEL, value: "PASSWORD" },
	{ label: MESSAGES.HOME.CARDS_LABEL, value: "CARD" },
];

const getVaultFormParams = (
	kind: VaultKind,
	entryId?: string,
): VaultFormParams => (entryId ? { kind, entryId } : { kind });

const getPasswordSubtitle = (username: string): string =>
	username || MESSAGES.VAULT.NO_USERNAME;

const getCardSubtitle = (cardType: string, network: string): string =>
	`${CARD_TYPE_LABEL[cardType] ?? cardType}${network ? ` · ${network}` : ""}`;

const getVaultListData = (
	kind: VaultKind,
	passwords: readonly PasswordEntry[],
	cards: readonly CardEntry[],
	normalizedSearch: string,
): readonly VaultListItem[] => {
	if (kind === "PASSWORD") {
		return passwords
			.filter((entry) =>
				`${entry.title} ${entry.username}`
					.toLowerCase()
					.includes(normalizedSearch),
			)
			.map((entry) => ({ kind: "PASSWORD" as const, entry }));
	}
	const filtered = cards.filter((entry) =>
		`${entry.name} ${entry.network} ${entry.cardNumber} ${entry.cardType}`
			.toLowerCase()
			.includes(normalizedSearch),
	);
	const sections = new Map<string, CardEntry[]>();
	for (const entry of filtered) {
		const label = CARD_TYPE_LABEL[entry.cardType] ?? entry.cardType;
		const group = sections.get(label);
		if (group) {
			group.push(entry);
		} else {
			sections.set(label, [entry]);
		}
	}
	const knownLabels = Object.values(CARD_TYPE_LABEL);
	const getLabelOrder = (label: string): number => {
		const index = knownLabels.indexOf(label);
		return index === -1 ? knownLabels.length : index;
	};
	const orderedGroups = [...sections.entries()].sort(
		([a], [b]) => getLabelOrder(a) - getLabelOrder(b),
	);
	return orderedGroups.flatMap(([label, group]): VaultListItem[] => [
		{ kind: "CARD_HEADER" as const, label },
		...group.map((entry): VaultListItem => ({
			kind: "CARD" as const,
			entry,
		})),
	]);
};

const maskValue = (value: string): string => value.replace(/\S/g, "•");

const CopyRow = ({
	label,
	value,
	isMasked = false,
	onCopy,
}: CopyRowProps): React.JSX.Element | null => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	if (!value) return null;
	return (
		<View style={styles.copyRow}>
			<View style={styles.copyDetails}>
				<CustomText style={styles.copyLabel}>{label}</CustomText>
				<CustomText style={styles.copyValue}>
					{isMasked ? maskValue(value) : value}
				</CustomText>
			</View>
			{onCopy ? (
				<Pressable
					onPress={() => onCopy(value, label)}
					style={styles.copyBtn}
				>
					<Ionicons
						color={COLORS.primaryBright}
						name="copy-outline"
						size={16}
					/>
				</Pressable>
			) : null}
		</View>
	);
};

const VaultScreen = ({
	navigation,
	route,
}: VaultScreenProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const { database, dataVersion, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const { kind } = route.params;
	const [passwords, setPasswords] = useState<readonly PasswordEntry[]>([]);
	const [cards, setCards] = useState<readonly CardEntry[]>([]);
	const [searchVisible, setSearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchDebounced, setSearchDebounced] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [revealedIds, setRevealedIds] = useState<ReadonlySet<string>>(
		new Set(),
	);

	const getScreenData = useCallback(async (): Promise<void> => {
		try {
			if (kind === "PASSWORD") {
				setPasswords(await getPasswords(database));
			} else {
				setCards(await getCards(database));
			}
			setError("");
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		}
	}, [database, kind]);

	useEffect(
		() =>
			runAfterRender(() => {
				void getScreenData();
			}),
		[dataVersion, getScreenData],
	);

	useEffect(() => {
		const timer = setTimeout(() => setSearchDebounced(searchQuery), 250);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<HeaderIconButton
					accessibilityLabel={
						searchVisible
							? MESSAGES.COMMON.CLOSE_SEARCH
							: MESSAGES.COMMON.SEARCH
					}
					icon={searchVisible ? "close-outline" : "search-outline"}
					isActive={searchVisible}
					onPress={() => {
						setSearchVisible((visible) => !visible);
						setSearchQuery("");
						setSearchDebounced("");
					}}
				/>
			),
		});
	}, [navigation, searchVisible]);

	const handleCopy = useCallback(
		async (value: string, label: string): Promise<void> => {
			await Clipboard.setStringAsync(value);
			setMessage(`${label} copied.`);
		},
		[],
	);

	const toggleRevealed = useCallback((entryId: string): void => {
		setRevealedIds((current) => {
			const next = new Set(current);
			if (next.has(entryId)) {
				next.delete(entryId);
			} else {
				next.add(entryId);
			}
			return next;
		});
	}, []);

	const handleDelete = useCallback(
		(id: string, label: string, vaultKind: VaultKind): void => {
			dialog.confirm({
				title: `Delete ${label}?`,
				message: MESSAGES.COMMON.IRREVERSIBLE,
				confirmLabel: MESSAGES.COMMON.DELETE,
				variant: "danger",
				onConfirm: () => {
					const processDelete = async (): Promise<void> => {
						try {
							if (vaultKind === "PASSWORD") {
								await deletePassword(database, id);
							} else {
								await deleteCard(database, id);
							}
							refreshData();
						} catch (caughtError: unknown) {
							setError(getErrorMessage(caughtError));
						}
					};
					void processDelete();
				},
			});
		},
		[database, dialog, refreshData],
	);

	const normalizedSearch = searchDebounced.trim().toLowerCase();
	const entryCount = kind === "PASSWORD" ? passwords.length : cards.length;
	const listData = useMemo(
		(): readonly VaultListItem[] =>
			getVaultListData(kind, passwords, cards, normalizedSearch),
		[cards, kind, normalizedSearch, passwords],
	);

	const renderVaultItem = useCallback(
		({ item }: ListItemProps<VaultListItem>): React.JSX.Element => {
			if (item.kind === "CARD_HEADER") {
				return (
					<CustomText style={styles.sectionTitle}>
						{item.label}
					</CustomText>
				);
			}
			if (item.kind === "PASSWORD") {
				const entry = item.entry;
				const isRevealed = revealedIds.has(entry.id);
				return (
					<Pressable
						onPress={() =>
							navigation.navigate(
								"VaultForm",
								getVaultFormParams("PASSWORD", entry.id),
							)
						}
					>
						<GlassCard>
							<View style={styles.headingRow}>
								<Ionicons
									color={COLORS.warning}
									name="key-outline"
									size={22}
								/>
								<View style={styles.details}>
									<CustomText style={styles.title}>
										{entry.title}
									</CustomText>
									<CustomText style={styles.meta}>
										{getPasswordSubtitle(entry.username)}
									</CustomText>
									<CustomText style={styles.updatedAt}>
										Updated {formatDate(entry.updatedAt)}
									</CustomText>
								</View>
							</View>
							{entry.password ? (
								<View style={styles.cardFields}>
									<CopyRow
										isMasked={!isRevealed}
										label={MESSAGES.VAULT_FORM.PASSWORD}
										value={entry.password}
									/>
								</View>
							) : null}
							<View style={styles.actions}>
								<AppButton
									icon={
										isRevealed
											? "eye-off-outline"
											: "eye-outline"
									}
									isCompact
									label={isRevealed ? "Hide" : "View"}
									onPress={() => toggleRevealed(entry.id)}
									variant="secondary"
								/>
								<AppButton
									icon="copy-outline"
									isCompact
									label={MESSAGES.COMMON.COPY}
									onPress={() =>
										void handleCopy(
											entry.password,
											"Password",
										)
									}
									variant="secondary"
								/>
								<AppButton
									icon="trash-outline"
									isCompact
									label={MESSAGES.COMMON.DELETE}
									onPress={() =>
										handleDelete(
											entry.id,
											entry.title,
											"PASSWORD",
										)
									}
									variant="danger"
								/>
							</View>
						</GlassCard>
					</Pressable>
				);
			}
			const entry = item.entry;
			const isRevealed = revealedIds.has(entry.id);
			return (
				<Pressable
					onPress={() =>
						navigation.navigate(
							"VaultForm",
							getVaultFormParams("CARD", entry.id),
						)
					}
				>
					<GlassCard>
						<View style={styles.headingRow}>
							<Ionicons
								color={COLORS.danger}
								name="card-outline"
								size={23}
							/>
							<View style={styles.details}>
								<CustomText style={styles.title}>
									{entry.name}
								</CustomText>
								<CustomText style={styles.meta}>
									{getCardSubtitle(
										entry.cardType,
										entry.network,
									)}
								</CustomText>
							</View>

							<Pressable
								accessibilityLabel={
									isRevealed
										? MESSAGES.VAULT.HIDE_CARD_DETAILS
										: MESSAGES.VAULT.SHOW_CARD_DETAILS
								}
								onPress={() => toggleRevealed(entry.id)}
								style={styles.revealBtn}
							>
								<Ionicons
									color={COLORS.primaryBright}
									name={
										isRevealed
											? "eye-off-outline"
											: "eye-outline"
									}
									size={20}
								/>
							</Pressable>
						</View>
						<View style={styles.cardFields}>
							<CopyRow
								isMasked={!isRevealed}
								label={MESSAGES.VAULT.CARD_NUMBER}
								onCopy={(v, l) => void handleCopy(v, l)}
								value={entry.cardNumber}
							/>
							<CopyRow
								isMasked={!isRevealed}
								label={MESSAGES.VAULT.EXPIRY}
								value={entry.expiry}
							/>
							<CopyRow
								isMasked={!isRevealed}
								label={MESSAGES.COMPONENTS.CVV}
								onCopy={(v, l) => void handleCopy(v, l)}
								value={entry.cvv}
							/>
							<CopyRow
								isMasked={!isRevealed}
								label={MESSAGES.COMPONENTS.PIN}
								onCopy={(v, l) => void handleCopy(v, l)}
								value={entry.pin}
							/>
						</View>
						<View style={styles.actions}>
							<AppButton
								icon="trash-outline"
								isCompact
								label={MESSAGES.COMMON.DELETE}
								onPress={() =>
									handleDelete(entry.id, entry.name, "CARD")
								}
								variant="danger"
							/>
						</View>
					</GlassCard>
				</Pressable>
			);
		},
		[
			handleCopy,
			handleDelete,
			navigation,
			revealedIds,
			toggleRevealed,
			styles,
			COLORS,
		],
	);

	const listHeader = useMemo(
		() => (
			<ListHeader>
				<SegmentedControl
					onChange={(value) =>
						navigation.setParams({ kind: value as VaultKind })
					}
					options={VAULT_TAB_OPTIONS}
					value={kind}
				/>
				{searchVisible ? (
					<SearchBar
						onChangeText={setSearchQuery}
						placeholder={MESSAGES.VAULT.SEARCH_PLACEHOLDER}
						value={searchQuery}
					/>
				) : null}
				{message ? <Notice message={message} /> : null}
				{error ? <Notice message={error} tone="danger" /> : null}
				<CustomText style={styles.meta}>
					{entryCount}{" "}
					{entryCount === 1
						? VAULT_ENTRY_LABEL[kind].one
						: VAULT_ENTRY_LABEL[kind].many}
				</CustomText>
			</ListHeader>
		),
		[
			entryCount,
			error,
			kind,
			message,
			navigation,
			searchQuery,
			searchVisible,
			styles,
		],
	);

	const listEmpty = useMemo(() => {
		const isFiltered = !!searchDebounced.trim();
		return (
			<EmptyState
				icon={isFiltered ? "search-outline" : "lock-closed-outline"}
				message={
					isFiltered
						? MESSAGES.COMMON.NO_SEARCH_RESULTS
						: MESSAGES.VAULT.EMPTY_MESSAGE
				}
				title={
					isFiltered
						? MESSAGES.VAULT.NO_MATCHES_TITLE
						: MESSAGES.VAULT.EMPTY_TITLE
				}
			/>
		);
	}, [searchDebounced]);

	return (
		<View style={styles.screen}>
			<ScreenList
				ListEmptyComponent={listEmpty}
				ListHeaderComponent={listHeader}
				data={listData}
				keyExtractor={(item) =>
					item.kind === "CARD_HEADER"
						? `header:${item.label}`
						: item.entry.id
				}
				renderItem={renderVaultItem}
			/>
			<FloatingAddButton
				onPress={() =>
					navigation.navigate("VaultForm", getVaultFormParams(kind))
				}
			/>
		</View>
	);
};

const {
	ALIGN,
	FLEX,
	FONT_SIZE,
	FONT_VARIANT,
	FONT_WEIGHT,
	LETTER_SPACING,
	SPACING,
	TEXT_TRANSFORM,
} = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		screen: {
			flex: FLEX.FILL,
			backgroundColor: COLORS.background,
		},
		headingRow: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S11,
		},
		details: {
			flex: FLEX.FILL,
			gap: SPACING.S3,
		},
		title: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S16,
			fontWeight: FONT_WEIGHT.BLACK,
		},
		sectionTitle: {
			color: COLORS.textDim,
			fontSize: FONT_SIZE.S11,
			fontWeight: FONT_WEIGHT.BOLD,
			textTransform: TEXT_TRANSFORM.UPPERCASE,
			letterSpacing: LETTER_SPACING.WIDE,
			marginTop: SPACING.S8,
		},
		meta: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
		},
		updatedAt: {
			color: COLORS.textDim,
			fontSize: FONT_SIZE.S11,
			marginTop: SPACING.S2,
		},
		actions: {
			flexDirection: FLEX.ROW,
			justifyContent: ALIGN.END,
			gap: SPACING.S8,
			marginTop: SPACING.S13,
		},
		cardFields: {
			marginTop: SPACING.S12,
			gap: SPACING.S8,
		},
		copyRow: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S8,
		},
		copyDetails: {
			flex: FLEX.FILL,
			gap: SPACING.S2,
		},
		copyLabel: {
			color: COLORS.textDim,
			fontSize: FONT_SIZE.S10,
			fontWeight: FONT_WEIGHT.BOLD,
			textTransform: TEXT_TRANSFORM.UPPERCASE,
			letterSpacing: LETTER_SPACING.WIDE,
		},
		copyValue: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S14,
			fontWeight: FONT_WEIGHT.BOLD,
			fontVariant: [FONT_VARIANT.TABULAR_NUMS],
		},
		copyBtn: {
			padding: SPACING.S8,
		},
		revealBtn: {
			padding: SPACING.S8,
		},
	}),
);

export default VaultScreen;

export {
	CARD_TYPE_LABEL,
	CopyRow,
	getCardSubtitle,
	getPasswordSubtitle,
	getVaultFormParams,
	getVaultListData,
	maskValue,
};
