import CustomText from "@/components/CustomText";
import EmptyState from "@/components/EmptyState";
import FloatingAddButton from "@/components/FloatingAddButton";
import GlassCard from "@/components/GlassCard";
import HeaderIconButton from "@/components/HeaderIconButton";
import ListHeader from "@/components/ListHeader";
import Notice from "@/components/Notice";
import ScreenList from "@/components/ScreenList";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import investmentService from "@/services/investmentService";
import investmentTypeService from "@/services/investmentTypeService";
import platformService from "@/services/platformService";
import tripService from "@/services/tripService";
import tripTypeService from "@/services/tripTypeService";
import type Investment from "@/types/Investment";
import type RootStackParamList from "@/types/RootStackParamList";
import type Trip from "@/types/Trip";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

const RelationDetailsScreen = ({
	navigation,
	route,
}: NativeStackScreenProps<
	RootStackParamList,
	"RelationDetails"
>): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const { database, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const { kind, entityId, entityName } = route.params;
	const [entities, setEntities] = useState<readonly (Trip | Investment)[]>(
		[],
	);
	const [error, setError] = useState("");
	const isTripType = kind === "TRIP_TYPE";
	const label = isTripType
		? MESSAGES.RELATION_DETAILS.TRIP_TYPE
		: kind === "PLATFORM"
			? MESSAGES.RELATION_DETAILS.INVESTMENT_PLATFORM
			: MESSAGES.RELATION_DETAILS.INVESTMENT_TYPE;

	useFocusEffect(
		useCallback(() => {
			let active = true;
			const load = async (): Promise<void> => {
				try {
					setError("");
					const linked = isTripType
						? (await tripService.getTrips(database)).filter(
								(trip) => trip.tripTypeId === entityId,
							)
						: (
								await investmentService.getInvestments(database)
							).filter((investment) =>
								kind === "PLATFORM"
									? investment.platformId === entityId
									: investment.investmentTypeId === entityId,
							);
					if (active) setEntities(linked);
				} catch (caughtError: unknown) {
					if (active) setError(getErrorMessage(caughtError));
				}
			};
			void load();
			return () => {
				active = false;
			};
		}, [database, entityId, isTripType, kind]),
	);

	const handleDelete = useCallback(async (): Promise<void> => {
		try {
			if (isTripType)
				await tripTypeService.deleteTripType(database, entityId);
			else if (kind === "PLATFORM")
				await platformService.deletePlatform(database, entityId);
			else
				await investmentTypeService.deleteInvestmentType(
					database,
					entityId,
				);
			refreshData();
			navigation.goBack();
		} catch (caughtError: unknown) {
			dialog.showMessage({
				title: MESSAGES.COMMON.UNABLE_TO_DELETE,
				message: getErrorMessage(caughtError),
				variant: "danger",
			});
		}
	}, [database, dialog, entityId, isTripType, kind, navigation, refreshData]);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<View style={styles.headerActions}>
					<HeaderIconButton
						accessibilityLabel={MESSAGES.COMMON.EDIT}
						icon="create-outline"
						onPress={() =>
							navigation.navigate(
								isTripType
									? "TripTypes"
									: kind === "PLATFORM"
										? "Platforms"
										: "InvestmentTypes",
								{ entityId, entityName },
							)
						}
					/>
					<HeaderIconButton
						accessibilityLabel={MESSAGES.COMMON.DELETE}
						icon="trash-outline"
						onPress={() =>
							dialog.confirm({
								title: `Delete "${entityName}"?`,
								message: `This ${label.toLowerCase()} will be permanently deleted. Linked records must be reassigned first.`,
								confirmLabel: MESSAGES.COMMON.DELETE,
								variant: "danger",
								onConfirm: () => void handleDelete(),
							})
						}
					/>
				</View>
			),
		});
	}, [
		dialog,
		entityId,
		entityName,
		handleDelete,
		isTripType,
		kind,
		label,
		navigation,
		styles,
	]);

	return (
		<View style={styles.screen}>
			<ScreenList<Trip | Investment>
				data={entities}
				keyExtractor={(item) => item.id}
				ListHeaderComponent={
					<ListHeader>
						<CustomText style={styles.meta}>{label}</CustomText>
						<CustomText style={styles.heading}>
							{entityName}
						</CustomText>
						{error ? (
							<Notice message={error} tone="danger" />
						) : null}
					</ListHeader>
				}
				ListEmptyComponent={
					error ? null : (
						<EmptyState
							icon={
								isTripType ? "airplane-outline" : "trending-up"
							}
							title={
								isTripType
									? MESSAGES.RELATION_DETAILS.NO_TRIPS_TITLE
									: MESSAGES.RELATION_DETAILS
											.NO_INVESTMENTS_TITLE
							}
							message={
								isTripType
									? MESSAGES.RELATION_DETAILS.NO_TRIPS_LINKED
									: MESSAGES.RELATION_DETAILS
											.NO_INVESTMENTS_LINKED
							}
						/>
					)
				}
				renderItem={({ item }) => (
					<Pressable
						accessibilityRole="button"
						onPress={() =>
							navigation.navigate("LinkedTransactions", {
								kind: isTripType ? "TRIP" : "INVESTMENT",
								entityId: item.id,
								entityName: item.name,
							})
						}
					>
						<GlassCard>
							<View style={styles.row}>
								<Ionicons
									name={
										isTripType
											? "airplane-outline"
											: "trending-up"
									}
									size={22}
									color={
										isTripType
											? COLORS.blue
											: COLORS.success
									}
								/>
								<CustomText style={styles.title}>
									{item.name}
								</CustomText>
								<Ionicons
									name="chevron-forward"
									size={18}
									color={COLORS.textMuted}
								/>
							</View>
						</GlassCard>
					</Pressable>
				)}
			/>
			<FloatingAddButton
				onPress={() =>
					isTripType
						? navigation.navigate("TripForm", {
								tripTypeId: entityId,
							})
						: navigation.navigate(
								"InvestmentForm",
								kind === "PLATFORM"
									? { platformId: entityId }
									: { investmentTypeId: entityId },
							)
				}
			/>
		</View>
	);
};

const { ALIGN, FLEX, FONT_SIZE, FONT_WEIGHT, SPACING } = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		screen: { flex: FLEX.FILL, backgroundColor: COLORS.background },
		headerActions: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S8,
		},
		row: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S12,
		},
		title: {
			flex: FLEX.FILL,
			color: COLORS.text,
			fontSize: FONT_SIZE.S16,
			fontWeight: FONT_WEIGHT.BLACK,
		},
		heading: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S22,
			fontWeight: FONT_WEIGHT.BLACK,
		},
		meta: { color: COLORS.textMuted, fontSize: FONT_SIZE.S12 },
	}),
);

export default RelationDetailsScreen;
