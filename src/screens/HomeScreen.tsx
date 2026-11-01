import CustomText from "@/components/CustomText";

import { Ionicons } from "@expo/vector-icons";
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
	LINE_HEIGHT,
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

	const tiles = useMemo(
		(): readonly HomeTile[] => [
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
		],
		[navigation, COLORS],
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
				<ScreenContainer>
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
			flexDirection: FLEX.ROW,
			justifyContent: ALIGN.SPACE_BETWEEN,
			flexWrap: FLEX.WRAP,
			rowGap: SPACING.S10,
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
	}),
);

export default HomeScreen;

export { getPressableScaleStyle, getTileIconBackgroundColor };
