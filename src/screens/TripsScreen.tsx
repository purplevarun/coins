import CustomText from "@/components/CustomText";
import type ListItemProps from "@/types/ListItemProps";

import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import Decimal from "decimal.js";
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
import PagedScreenList from "@/components/PagedScreenList";
import ScreenList from "@/components/ScreenList";
import SearchBar from "@/components/SearchBar";
import SegmentedControl from "@/components/SegmentedControl";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import exchangeRateService from "@/services/exchangeRateService";
import settingsService from "@/services/settingsService";
import tripService from "@/services/tripService";
import tripTotalService from "@/services/tripTotalService";
import tripTypeService from "@/services/tripTypeService";
import type ExchangeRate from "@/types/ExchangeRate";
import type Trip from "@/types/Trip";
import type TripsScreenProps from "@/types/TripsScreenProps";
import type TripTotal from "@/types/TripTotal";
import type TripType from "@/types/TripType";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
import moneyUtils from "@/utils/money";
const { getExchangeRates } = exchangeRateService;
const { getNativeCurrencyDisplay } = settingsService;
const { getTrips, setTripArchived } = tripService;
const { getTripTotals } = tripTotalService;
const { getTripTypes } = tripTypeService;
const { addMoney, compareMoney, formatMoney, ZERO_AMOUNT } = moneyUtils;

const TripsScreen = ({ navigation }: TripsScreenProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const { database, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const [trips, setTrips] = useState<readonly Trip[]>([]);
	const [tripTotals, setTripTotals] = useState<readonly TripTotal[]>([]);
	const [isNativeCurrency, setIsNativeCurrency] = useState(true);
	const [exchangeRates, setExchangeRates] = useState<readonly ExchangeRate[]>(
		[],
	);
	const [error, setError] = useState("");
	const [searchVisible, setSearchVisible] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchDebounced, setSearchDebounced] = useState("");
	const [tab, setTab] = useState<"TRIPS" | "TYPES">("TRIPS");
	const [tripTypes, setTripTypes] = useState<readonly TripType[]>([]);

	const getScreenData = useCallback(async (): Promise<void> => {
		try {
			setError("");
			const [
				nativeCurrency,
				loadedRates,
				loadedTrips,
				loadedTripTotals,
				loadedTripTypes,
			] = await Promise.all([
				getNativeCurrencyDisplay(database),
				getExchangeRates(database),
				getTrips(database),
				getTripTotals(database),
				getTripTypes(database),
			]);
			setIsNativeCurrency(nativeCurrency);
			setExchangeRates(loadedRates);
			setTrips(loadedTrips);
			setTripTotals(loadedTripTotals);
			setTripTypes(loadedTripTypes);
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

	const handleArchive = useCallback(
		async (id: string): Promise<void> => {
			try {
				await setTripArchived(database, id, true);
				refreshData();
				await getScreenData();
			} catch (caughtError: unknown) {
				dialog.showMessage({
					title: MESSAGES.COMMON.UNABLE_TO_ARCHIVE,
					message: getErrorMessage(caughtError),
					variant: "danger",
				});
			}
		},
		[database, dialog, getScreenData, refreshData],
	);

	const handleArchivePress = useCallback(
		(id: string, name: string): void => {
			dialog.confirm({
				title: `Archive "${name}"?`,
				message: MESSAGES.COMMON.ARCHIVE_CONFIRM,
				confirmLabel: MESSAGES.COMMON.ARCHIVE,
				variant: "danger",
				onConfirm: () => void handleArchive(id),
			});
		},
		[dialog, handleArchive],
	);

	const rateMap = useMemo((): Map<string, Decimal> => {
		const map = new Map<string, Decimal>();
		for (const rate of exchangeRates) {
			map.set(rate.currencyCode, new Decimal(rate.rateToInr));
		}
		map.set("INR", new Decimal(1));
		return map;
	}, [exchangeRates]);

	const toInr = useCallback(
		(amount: string, currencyCode: string): Decimal => {
			const rate = rateMap.get(currencyCode);
			if (!rate) return new Decimal(0);
			return new Decimal(amount).times(rate);
		},
		[rateMap],
	);

	const listData = useMemo(
		() =>
			[...trips].sort((a, b) => {
				const totalA = tripTotals
					.filter((row) => row.tripId === a.id)
					.reduce(
						(sum, row) =>
							sum.plus(toInr(row.total, row.currencyCode)),
						new Decimal(0),
					);
				const totalB = tripTotals
					.filter((row) => row.tripId === b.id)
					.reduce(
						(sum, row) =>
							sum.plus(toInr(row.total, row.currencyCode)),
						new Decimal(0),
					);
				// Trip totals are positive = spent; sort most spent first (descending)
				return totalB.comparedTo(totalA);
			}),
		[toInr, tripTotals, trips],
	);

	const filteredListData = useMemo(() => {
		if (!searchDebounced.trim()) return listData;
		const q = searchDebounced.trim().toLowerCase();
		return listData.filter((trip) => trip.name.toLowerCase().includes(q));
	}, [listData, searchDebounced]);

	const tripTypeTotals = useMemo((): ReadonlyMap<
		string,
		readonly Pick<TripTotal, "currencyCode" | "total">[]
	> => {
		const typeIds = new Map(
			trips.map((trip) => [trip.id, trip.tripTypeId] as const),
		);
		const totals = new Map<string, Map<string, string>>();
		for (const row of tripTotals) {
			const typeId = typeIds.get(row.tripId);
			if (!typeId) continue;
			const byCurrency = totals.get(typeId) ?? new Map<string, string>();
			byCurrency.set(
				row.currencyCode,
				addMoney(
					byCurrency.get(row.currencyCode) ?? ZERO_AMOUNT,
					row.total,
				),
			);
			totals.set(typeId, byCurrency);
		}
		return new Map(
			[...totals].map(([typeId, byCurrency]) => [
				typeId,
				[...byCurrency].map(([currencyCode, total]) => ({
					currencyCode,
					total,
				})),
			]),
		);
	}, [tripTotals, trips]);

	const renderTripTotals = useCallback(
		(
			totals: readonly Pick<TripTotal, "currencyCode" | "total">[],
		): React.JSX.Element => (
			<>
				{totals.length ? (
					totals.map((total) => (
						<CustomText
							key={total.currencyCode}
							style={[
								styles.amount,
								{
									color:
										compareMoney(
											total.total,
											ZERO_AMOUNT,
										) >= 0
											? COLORS.danger
											: COLORS.success,
								},
							]}
						>
							Total {formatMoney(total.total, total.currencyCode)}
						</CustomText>
					))
				) : (
					<CustomText style={styles.amount}>
						Total {formatMoney(ZERO_AMOUNT, "INR")}
					</CustomText>
				)}
				{!isNativeCurrency &&
				totals.some((total) => total.currencyCode !== "INR")
					? (() => {
							const inrTotal = totals.reduce(
								(sum, total) =>
									sum.plus(
										toInr(total.total, total.currencyCode),
									),
								new Decimal(0),
							);
							return (
								<CustomText
									style={[
										styles.convertedAmount,
										{
											color: inrTotal.gte(0)
												? COLORS.danger
												: COLORS.success,
										},
									]}
								>
									≈{" "}
									{formatMoney(
										inrTotal.abs().toFixed(),
										"INR",
									)}
								</CustomText>
							);
						})()
					: null}
			</>
		),
		[isNativeCurrency, toInr, styles, COLORS],
	);

	const renderTripItem = useCallback(
		({ item: trip }: ListItemProps<Trip>): React.JSX.Element => {
			const totals = tripTotals.filter((row) => row.tripId === trip.id);
			return (
				<Pressable
					onPress={() =>
						navigation.navigate("LinkedTransactions", {
							kind: "TRIP",
							entityId: trip.id,
							entityName: trip.name,
						})
					}
				>
					<GlassCard>
						<View style={styles.row}>
							<View style={styles.iconBox}>
								<Ionicons
									color={COLORS.blue}
									name="airplane-outline"
									size={22}
								/>
							</View>
							<View style={styles.details}>
								<CustomText style={styles.title}>
									{trip.name}
								</CustomText>
								{renderTripTotals(totals)}
							</View>
						</View>
						<View style={styles.actions}>
							<Pressable
								accessibilityLabel={MESSAGES.COMMON.ARCHIVE}
								accessibilityRole="button"
								hitSlop={8}
								onPress={() =>
									handleArchivePress(trip.id, trip.name)
								}
								style={({ pressed }) => [
									styles.actionIcon,
									pressed && styles.actionIconPressed,
								]}
							>
								<Ionicons
									color={COLORS.textMuted}
									name="archive-outline"
									size={17}
								/>
							</Pressable>
						</View>
					</GlassCard>
				</Pressable>
			);
		},
		[
			handleArchivePress,
			navigation,
			renderTripTotals,
			tripTotals,
			styles,
			COLORS,
		],
	);

	const renderTripTypeItem = useCallback(
		({ item }: ListItemProps<TripType>): React.JSX.Element => (
			<Pressable
				accessibilityRole="button"
				onPress={() =>
					navigation.navigate("RelationDetails", {
						kind: "TRIP_TYPE",
						entityId: item.id,
						entityName: item.name,
					})
				}
			>
				<GlassCard>
					<CustomText style={styles.title}>{item.name}</CustomText>
					{renderTripTotals(tripTypeTotals.get(item.id) ?? [])}
				</GlassCard>
			</Pressable>
		),
		[navigation, renderTripTotals, styles, tripTypeTotals],
	);

	const listHeader = useMemo(
		() => (
			<ListHeader>
				{searchVisible ? (
					<SearchBar
						onChangeText={setSearchQuery}
						placeholder={MESSAGES.TRIPS.SEARCH_PLACEHOLDER}
						value={searchQuery}
					/>
				) : null}
				<SegmentedControl
					onChange={(value) => setTab(value as "TRIPS" | "TYPES")}
					options={[
						{
							label: MESSAGES.TRIPS.TAB_TRIPS,
							value: "TRIPS",
						},
						{
							label: MESSAGES.TRIPS.TAB_TYPES,
							value: "TYPES",
						},
					]}
					value={tab}
				/>
				{error ? <Notice message={error} tone="danger" /> : null}
			</ListHeader>
		),
		[error, searchQuery, searchVisible, tab],
	);

	const listEmpty = useMemo(() => {
		const isFiltered = !!searchDebounced.trim();
		return (
			<EmptyState
				icon={isFiltered ? "search-outline" : "add-circle-outline"}
				message={
					isFiltered
						? MESSAGES.COMMON.NO_SEARCH_RESULTS
						: tab === "TYPES"
							? MESSAGES.TRIPS.TYPES_EMPTY_MESSAGE
							: MESSAGES.TRIPS.EMPTY_MESSAGE
				}
				title={
					isFiltered
						? tab === "TYPES"
							? MESSAGES.TRIPS.TYPES_NO_MATCHES_TITLE
							: MESSAGES.TRIPS.NO_MATCHES_TITLE
						: tab === "TYPES"
							? MESSAGES.TRIPS.TYPES_EMPTY_TITLE
							: MESSAGES.TRIPS.EMPTY_TITLE
				}
			/>
		);
	}, [searchDebounced, tab]);

	return (
		<View style={styles.screen}>
			{tab === "TYPES" ? (
				<ScreenList<TripType>
					key="TYPES"
					ListEmptyComponent={listEmpty}
					ListHeaderComponent={listHeader}
					data={tripTypes.filter((item) =>
						item.name
							.toLowerCase()
							.includes(searchDebounced.trim().toLowerCase()),
					)}
					extraData={[isNativeCurrency, tripTypeTotals]}
					keyExtractor={(item) => item.id}
					renderItem={renderTripTypeItem}
				/>
			) : (
				<PagedScreenList<Trip>
					key="TRIPS"
					ListEmptyComponent={listEmpty}
					ListHeaderComponent={listHeader}
					data={filteredListData}
					extraData={[isNativeCurrency, searchDebounced]}
					keyExtractor={(item) => item.id}
					renderItem={renderTripItem}
				/>
			)}
			<FloatingAddButton
				onPress={() =>
					navigation.navigate(
						tab === "TRIPS" ? "TripForm" : "TripTypes",
					)
				}
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
			alignItems: ALIGN.START,
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
		amount: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			fontWeight: FONT_WEIGHT.BLACK,
			marginTop: SPACING.S3,
		},
		convertedAmount: {
			fontSize: FONT_SIZE.S13,
			fontWeight: FONT_WEIGHT.BLACK,
			marginTop: SPACING.S1,
		},
		actions: {
			marginTop: SPACING.S12,
			flexDirection: FLEX.ROW,
			justifyContent: ALIGN.END,
			gap: SPACING.S8,
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

export default TripsScreen;
