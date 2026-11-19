import CustomText from "@/components/CustomText";
import type ListItemProps from "@/types/ListItemProps";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";

import EmptyState from "@/components/EmptyState";
import FloatingAddButton from "@/components/FloatingAddButton";
import GlassCard from "@/components/GlassCard";
import HeaderIconButton from "@/components/HeaderIconButton";
import ListHeader from "@/components/ListHeader";
import Notice from "@/components/Notice";
import ScreenList from "@/components/ScreenList";
import SearchBar from "@/components/SearchBar";
import appConstants from "@/constants/appConstants";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import analysisService from "@/services/analysisService";
import sectorService from "@/services/sectorService";
import type Sector from "@/types/Sector";
import type SectorsScreenProps from "@/types/SectorsScreenProps";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
import moneyUtils from "@/utils/money";

const { DEFAULT_CURRENCY_CODE } = appConstants;
const { deleteSector, getSectors } = sectorService;
const { getSectorSpend } = analysisService;
const { formatMoney, ZERO_AMOUNT } = moneyUtils;

const SectorsScreen = ({
	navigation,
}: SectorsScreenProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const { database, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const [sectors, setSectors] = useState<readonly Sector[]>([]);
	const [error, setError] = useState("");
	const [searchVisible, setSearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchDebounced, setSearchDebounced] = useState("");
	const [sectorSpend, setSectorSpend] = useState<ReadonlyMap<string, string>>(
		new Map(),
	);

	const getScreenData = useCallback(async (): Promise<void> => {
		try {
			setError("");
			const [sectorRows, spend] = await Promise.all([
				getSectors(database),
				getSectorSpend(database),
			]);
			setSectors(sectorRows);
			setSectorSpend(spend);
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		}
	}, [database]);

	useFocusEffect(
		useCallback(() => {
			void getScreenData();
		}, [getScreenData]),
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

	const handleDelete = useCallback(
		(id: string, name: string): void => {
			dialog.confirm({
				title: `Delete "${name}"?`,
				message:
					"The sector and its category grouping will be removed. Categories stay untouched.",
				confirmLabel: MESSAGES.COMMON.DELETE,
				variant: "danger",
				onConfirm: () => {
					void (async () => {
						try {
							await deleteSector(database, id);
							refreshData();
							await getScreenData();
						} catch (caughtError: unknown) {
							dialog.showMessage({
								title: MESSAGES.COMMON.UNABLE_TO_DELETE,
								message: getErrorMessage(caughtError),
								variant: "danger",
							});
						}
					})();
				},
			});
		},
		[database, dialog, getScreenData, refreshData],
	);

	const filteredSectors = useMemo(() => {
		if (!searchDebounced.trim()) return sectors;
		const query = searchDebounced.trim().toLowerCase();
		return sectors.filter((sector) =>
			sector.name.toLowerCase().includes(query),
		);
	}, [sectors, searchDebounced]);

	const renderSectorItem = useCallback(
		({ item: sector }: ListItemProps<Sector>): React.JSX.Element => (
			<Pressable
				onPress={() =>
					navigation.navigate("SectorForm", {
						entityId: sector.id,
					})
				}
			>
				<GlassCard>
					<View style={styles.row}>
						<View style={styles.iconBox}>
							<Ionicons
								color={COLORS.lavender}
								name="grid-outline"
								size={22}
							/>
						</View>
						<View style={styles.details}>
							<CustomText style={styles.title}>
								{sector.name}
							</CustomText>
							<CustomText style={styles.meta}>
								{sector.categoryCount}{" "}
								{sector.categoryCount === 1
									? "category"
									: "categories"}{" "}
								•{" "}
								{formatMoney(
									sectorSpend.get(sector.id) ?? ZERO_AMOUNT,
									DEFAULT_CURRENCY_CODE,
								)}
							</CustomText>
						</View>
						<Pressable
							accessibilityLabel={MESSAGES.COMMON.DELETE}
							accessibilityRole="button"
							hitSlop={8}
							onPress={() => handleDelete(sector.id, sector.name)}
							style={({ pressed }) => [
								styles.actionIcon,
								pressed && styles.actionIconPressed,
							]}
						>
							<Ionicons
								color={COLORS.textMuted}
								name="trash-outline"
								size={17}
							/>
						</Pressable>
					</View>
				</GlassCard>
			</Pressable>
		),
		[handleDelete, navigation, styles, COLORS, sectorSpend],
	);

	const listHeader = useMemo(
		() => (
			<ListHeader>
				{searchVisible ? (
					<SearchBar
						onChangeText={setSearchQuery}
						placeholder={MESSAGES.SECTORS.SEARCH_PLACEHOLDER}
						value={searchQuery}
					/>
				) : null}
				{error ? <Notice message={error} tone="danger" /> : null}
			</ListHeader>
		),
		[error, searchQuery, searchVisible],
	);

	const listEmpty = useMemo(() => {
		const isFiltered = !!searchDebounced.trim();
		return (
			<EmptyState
				icon={isFiltered ? "search-outline" : "grid-outline"}
				message={
					isFiltered
						? MESSAGES.COMMON.NO_SEARCH_RESULTS
						: MESSAGES.SECTORS.EMPTY_MESSAGE
				}
				title={
					isFiltered
						? MESSAGES.SECTORS.NO_MATCHES_TITLE
						: MESSAGES.SECTORS.EMPTY_TITLE
				}
			/>
		);
	}, [searchDebounced]);

	return (
		<View style={styles.screen}>
			<ScreenList
				ListEmptyComponent={listEmpty}
				ListHeaderComponent={listHeader}
				data={filteredSectors}
				keyExtractor={(sector) => sector.id}
				renderItem={renderSectorItem}
			/>
			<FloatingAddButton
				onPress={() => navigation.navigate("SectorForm")}
			/>
		</View>
	);
};

const {
	ALIGN,
	BORDER,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	RADIUS,
	SCALE,
	SIZES,
	SPACING,
} = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		screen: {
			flex: FLEX.FILL,
			backgroundColor: COLORS.background,
		},
		row: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S12,
		},
		iconBox: {
			width: SIZES.S44,
			height: SIZES.S44,
			borderRadius: RADIUS.S15,
			backgroundColor: COLORS.surfaceRaised,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
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
		meta: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
		},
		actionIcon: {
			width: SIZES.S34,
			height: SIZES.S34,
			borderRadius: RADIUS.S12,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			backgroundColor: COLORS.surfaceRaised,
		},
		actionIconPressed: {
			transform: [{ scale: SCALE.STRONG }],
		},
	}),
);

export default SectorsScreen;
