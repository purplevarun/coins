import CustomText from "@/components/CustomText";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BottomNavBar from "@/components/BottomNavBar";
import GlassCard from "@/components/GlassCard";
import HeaderIconButton from "@/components/HeaderIconButton";
import ScreenContainer from "@/components/ScreenContainer";
import COLORS from "@/constants/colors";
import { DEFAULT_HOME_MODE, HOME_MODE_OPTIONS } from "@/constants/homeModes";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import type HomeMode from "@/types/HomeMode";
import type HomeScreenProps from "@/types/HomeScreenProps";
import type HomeTile from "@/types/HomeTile";
import type { ViewStyle } from "react-native";
const {
	ALIGN,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	LETTER_SPACING,
	LINE_HEIGHT,
	POSITION,
	RADIUS,
	SCALE,
	SIZES,
	SPACING,
} = styleConstants;

const getModeLabel = (mode: HomeMode): string =>
	HOME_MODE_OPTIONS.find((option) => option.mode === mode)?.label ??
	MESSAGES.HOME.DEFAULT_MODE_LABEL;

const getPressableScaleStyle = (
	pressed: boolean,
): readonly (ViewStyle | false)[] => [pressed && styles.pressed];

const getTileIconBackgroundColor = (color: string): string => `${color}20`;

const HomeScreen = ({ navigation }: HomeScreenProps): React.JSX.Element => {
	const [mode, setMode] = useState<HomeMode>(DEFAULT_HOME_MODE);

	const tilesByMode = useMemo(
		(): Readonly<Record<HomeMode, readonly HomeTile[]>> => ({
			TOOLS: [
				{
					label: MESSAGES.HOME.NOTES_LABEL,
					subtitle: MESSAGES.HOME.NOTES_SUBTITLE,
					icon: "document-text-outline",
					color: COLORS.skyBlue,
					handlePress: () => navigation.navigate("Notes"),
				},
				{
					label: MESSAGES.HOME.TODOS_LABEL,
					subtitle: MESSAGES.HOME.TODOS_SUBTITLE,
					icon: "checkbox-outline",
					color: COLORS.success,
					handlePress: () => navigation.navigate("Todos"),
				},
				{
					label: MESSAGES.HOME.DOCUMENTS_LABEL,
					subtitle: MESSAGES.HOME.DOCUMENTS_SUBTITLE,
					icon: "documents-outline",
					color: COLORS.primary,
					handlePress: () => navigation.navigate("Documents"),
				},
				{
					label: MESSAGES.HOME.PASSWORDS_LABEL,
					subtitle: MESSAGES.HOME.PASSWORDS_SUBTITLE,
					icon: "key-outline",
					color: COLORS.warning,
					handlePress: () =>
						navigation.navigate("Vault", { kind: "PASSWORD" }),
				},
				{
					label: MESSAGES.HOME.CARDS_LABEL,
					subtitle: MESSAGES.HOME.CARDS_SUBTITLE,
					icon: "card-outline",
					color: COLORS.pink,
					handlePress: () =>
						navigation.navigate("Vault", { kind: "CARD" }),
				},
				{
					label: MESSAGES.HOME.IDENTITY_LABEL,
					subtitle: MESSAGES.HOME.IDENTITY_SUBTITLE,
					icon: "person-circle-outline",
					color: COLORS.blue,
					handlePress: () =>
						navigation.navigate("Vault", { kind: "IDENTITY" }),
				},
			],
			FINANCE: [
				{
					label: MESSAGES.HOME.TRANSACTIONS_LABEL,
					subtitle: MESSAGES.HOME.TRANSACTIONS_SUBTITLE,
					icon: "swap-horizontal",
					color: COLORS.primary,
					handlePress: () => navigation.navigate("Transactions"),
				},
				{
					label: MESSAGES.HOME.SOURCES_LABEL,
					subtitle: MESSAGES.HOME.SOURCES_SUBTITLE,
					icon: "wallet-outline",
					color: COLORS.blue,
					handlePress: () => navigation.navigate("Sources"),
				},
				{
					label: MESSAGES.HOME.CATEGORIES_LABEL,
					subtitle: MESSAGES.HOME.CATEGORIES_SUBTITLE,
					icon: "pricetags-outline",
					color: COLORS.warning,
					handlePress: () => navigation.navigate("Categories"),
				},
				{
					label: MESSAGES.HOME.TRIPS_LABEL,
					subtitle: MESSAGES.HOME.TRIPS_SUBTITLE,
					icon: "airplane-outline",
					color: COLORS.cyan,
					handlePress: () => navigation.navigate("Trips"),
				},
				{
					label: MESSAGES.HOME.INVESTMENTS_LABEL,
					subtitle: MESSAGES.HOME.INVESTMENTS_SUBTITLE,
					icon: "trending-up",
					color: COLORS.success,
					handlePress: () => navigation.navigate("Investments"),
				},
				{
					label: MESSAGES.HOME.ANALYSIS_LABEL,
					subtitle: MESSAGES.HOME.ANALYSIS_SUBTITLE,
					icon: "pie-chart-outline",
					color: COLORS.lavender,
					handlePress: () => navigation.navigate("Analysis"),
				},
			],
		}),
		[navigation],
	);

	const renderTiles = (tiles: readonly HomeTile[]): React.JSX.Element => (
		<View style={styles.grid}>
			{tiles.map((tile) => (
				<Pressable
					key={tile.label}
					onPress={tile.handlePress}
					style={({ pressed }) => [
						styles.tileWrapper,
						...getPressableScaleStyle(pressed),
					]}
				>
					<GlassCard>
						<View style={styles.tile}>
							<View
								style={[
									styles.tileIcon,
									{
										backgroundColor:
											getTileIconBackgroundColor(
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
							<CustomText style={styles.tileTitle}>
								{tile.label}
							</CustomText>
							<CustomText style={styles.tileSubtitle}>
								{tile.subtitle}
							</CustomText>
						</View>
					</GlassCard>
				</Pressable>
			))}
		</View>
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
			<SafeAreaView style={styles.safeArea}>
				<ScreenContainer>
					<View style={styles.header}>
						<CustomText numberOfLines={1} style={styles.appName}>
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
					{renderTiles(tilesByMode[mode])}
				</ScreenContainer>
				<View style={styles.navDock}>
					<BottomNavBar
						activeMode={mode}
						onSelectMode={setMode}
						options={HOME_MODE_OPTIONS}
					/>
				</View>
			</SafeAreaView>
		</LinearGradient>
	);
};

const styles = StyleSheet.create({
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
		flexDirection: FLEX.ROW,
		justifyContent: ALIGN.SPACE_BETWEEN,
		flexWrap: FLEX.WRAP,
		rowGap: SPACING.S10,
	},
	navDock: {
		position: POSITION.ABSOLUTE,
		left: SPACING.S16,
		right: SPACING.S16,
		bottom: SPACING.S10,
	},
	tileWrapper: {
		width: SIZES.TILE,
	},
	tile: {
		minHeight: SIZES.S122,
		gap: SPACING.S7,
	},
	tileIcon: {
		width: SIZES.S42,
		height: SIZES.S42,
		borderRadius: RADIUS.S14,
		alignItems: ALIGN.CENTER,
		justifyContent: ALIGN.CENTER,
		marginBottom: SPACING.S3,
	},
	tileTitle: {
		color: COLORS.text,
		fontSize: FONT_SIZE.S15,
		fontWeight: FONT_WEIGHT.BLACK,
	},
	tileSubtitle: {
		color: COLORS.textMuted,
		fontSize: FONT_SIZE.S11,
		lineHeight: LINE_HEIGHT.S15,
	},
	pressed: {
		transform: [{ scale: SCALE.GENTLE }],
	},
});

export default HomeScreen;

export { getModeLabel, getPressableScaleStyle, getTileIconBackgroundColor };
