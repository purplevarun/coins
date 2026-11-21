import CustomText from "@/components/CustomText";

import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GlassCard from "@/components/GlassCard";
import HeaderIconButton from "@/components/HeaderIconButton";
import ScreenContainer from "@/components/ScreenContainer";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type HomeScreenProps from "@/types/HomeScreenProps";
import type HomeTile from "@/types/HomeTile";
import createThemedStyles from "@/utils/createThemedStyles";
import type { ViewStyle } from "react-native";
const {
	ALIGN,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	LETTER_SPACING,
	RADIUS,
	SCALE,
	SIZES,
	SPACING,
} = styleConstants;

const getPressableScaleStyle = (
	pressed: boolean,
): readonly (ViewStyle | false)[] => [
	pressed && { transform: [{ scale: SCALE.GENTLE }] },
];

const getTileIconBackgroundColor = (color: string): string => `${color}20`;

const HomeScreen = ({ navigation }: HomeScreenProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);

	const tileRows = useMemo(
		(): readonly (readonly HomeTile[])[] => [
			[
				{
					label: MESSAGES.HOME.TRANSACTIONS_LABEL,
					icon: "swap-horizontal",
					color: COLORS.primary,
					handlePress: () => navigation.navigate("Transactions"),
				},
				{
					label: MESSAGES.HOME.SOURCES_LABEL,
					icon: "wallet-outline",
					color: COLORS.blue,
					handlePress: () => navigation.navigate("Sources"),
				},
			],
			[
				{
					label: MESSAGES.HOME.CATEGORIES_LABEL,
					icon: "pricetags-outline",
					color: COLORS.warning,
					handlePress: () => navigation.navigate("Categories"),
				},
				{
					label: MESSAGES.HOME.SECTORS_LABEL,
					icon: "grid-outline",
					color: COLORS.periwinkle,
					handlePress: () => navigation.navigate("Sectors"),
				},
			],
			[
				{
					label: MESSAGES.HOME.INVESTMENTS_LABEL,
					icon: "trending-up",
					color: COLORS.success,
					handlePress: () => navigation.navigate("Investments"),
				},
				{
					label: MESSAGES.HOME.TRIPS_LABEL,
					icon: "airplane-outline",
					color: COLORS.cyan,
					handlePress: () => navigation.navigate("Trips"),
				},
			],
			[
				{
					label: MESSAGES.HOME.ANALYSIS_LABEL,
					icon: "pie-chart-outline",
					color: COLORS.lavender,
					handlePress: () => navigation.navigate("Analysis"),
				},
				{
					label: MESSAGES.HOME.VAULT_LABEL,
					icon: "lock-closed-outline",
					color: COLORS.pink,
					handlePress: () =>
						navigation.navigate("Vault", { kind: "PASSWORD" }),
				},
			],
		],
		[navigation, COLORS],
	);

	const renderTile = (tile: HomeTile): React.JSX.Element => (
		<Pressable
			key={tile.label}
			onPress={tile.handlePress}
			style={({ pressed }) => [
				styles.tileWrapper,
				...getPressableScaleStyle(pressed),
			]}
		>
			<GlassCard style={styles.tileCard}>
				<View style={styles.tile}>
					<View
						style={[
							styles.tileIcon,
							{
								backgroundColor: getTileIconBackgroundColor(
									tile.color,
								),
							},
						]}
					>
						<Ionicons
							color={tile.color}
							name={tile.icon}
							size={24}
						/>
					</View>
					<CustomText
						adjustsFontSizeToFit
						numberOfLines={1}
						style={styles.tileTitle}
					>
						{tile.label}
					</CustomText>
				</View>
			</GlassCard>
		</Pressable>
	);

	return (
		<LinearGradient
			colors={[
				COLORS.background,
				COLORS.backgroundTint,
				COLORS.background,
			]}
			style={styles.background}
		>
			<SafeAreaView
				edges={["top", "left", "right"]}
				style={styles.safeArea}
			>
				<ScreenContainer isScrollable={false}>
					<View style={styles.header}>
						<CustomText style={styles.appName}>
							Purple
							<CustomText style={styles.appNameAccent}>
								coins
							</CustomText>
						</CustomText>
						<View style={styles.headerActions}>
							<HeaderIconButton
								accessibilityLabel={MESSAGES.COMMON.SEARCH}
								icon="search-outline"
								onPress={() =>
									navigation.navigate("GlobalSearch")
								}
							/>
							<HeaderIconButton
								accessibilityLabel={MESSAGES.HOME.SETTINGS}
								icon="settings-outline"
								onPress={() => navigation.navigate("Settings")}
							/>
						</View>
					</View>
					<View style={styles.grid}>
						{tileRows.map((row, rowIndex) => (
							<View key={rowIndex} style={styles.row}>
								{row.map((tile) => renderTile(tile))}
							</View>
						))}
					</View>
				</ScreenContainer>
			</SafeAreaView>
		</LinearGradient>
	);
};

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		background: {
			flex: FLEX.FILL,
		},
		safeArea: {
			flex: FLEX.FILL,
		},
		header: {
			marginTop: SPACING.N6,
			marginBottom: SPACING.S8,
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
			gap: SPACING.S12,
		},
		appName: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S36,
			fontWeight: FONT_WEIGHT.BLACK,
			letterSpacing: LETTER_SPACING.NONE,
		},
		appNameAccent: {
			color: COLORS.primary,
		},
		headerActions: {
			flexDirection: FLEX.ROW,
			flexShrink: FLEX.NONE,
			gap: SPACING.S8,
		},
		grid: {
			flex: FLEX.FILL,
			gap: SPACING.S10,
		},
		row: {
			flex: FLEX.FILL,
			flexDirection: FLEX.ROW,
			gap: SPACING.S10,
		},
		tileWrapper: {
			flex: FLEX.FILL,
		},
		tileCard: {
			flex: FLEX.FILL,
		},
		tile: {
			flex: FLEX.FILL,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
			gap: SPACING.S7,
		},
		tileIcon: {
			width: SIZES.S42,
			height: SIZES.S42,
			borderRadius: RADIUS.S14,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
		},
		tileTitle: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			fontWeight: FONT_WEIGHT.BLACK,
			textAlign: ALIGN.CENTER,
		},
	}),
);

export default HomeScreen;

export { getPressableScaleStyle, getTileIconBackgroundColor };
