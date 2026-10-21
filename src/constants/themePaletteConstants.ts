import COLORS from "@/constants/colors";
import themeConstants from "@/constants/themeConstants";
import type AppTheme from "@/types/AppTheme";
import type ThemeColors from "@/types/ThemeColors";
import type ThemeId from "@/types/ThemeId";
import type ThemePaletteSeed from "@/types/ThemePaletteSeed";

const { THEME_IDS } = themeConstants;
const ALPHA = { BORDER: "5C", MUTED: "29", OVERLAY: "94" } as const;
const GRAPHITE_BACKGROUND = "#161616";

const createColors = (seed: ThemePaletteSeed): ThemeColors => ({
	...COLORS,
	background: seed.background,
	backgroundDeep: seed.background,
	backgroundElevated: seed.surface,
	backgroundMid: seed.background,
	backgroundTint: seed.selected,
	glass: seed.surface,
	glassStrong: seed.surface,
	border: seed.line,
	borderStrong: seed.line,
	overlayTint: `${seed.background}${ALPHA.OVERLAY}`,
	primary: seed.primary,
	primaryBright: seed.primary,
	primaryMuted: seed.selected,
	onPrimary: seed.onPrimary,
	netWorth: seed.blue,
	text: seed.text,
	textMuted: seed.muted,
	textDim: seed.muted,
	success: seed.income,
	successBorder: `${seed.income}${ALPHA.BORDER}`,
	successMuted: `${seed.income}${ALPHA.MUTED}`,
	danger: seed.expense,
	dangerBorder: `${seed.expense}${ALPHA.BORDER}`,
	dangerMuted: `${seed.expense}${ALPHA.MUTED}`,
	warning: seed.gold,
	warningMuted: `${seed.gold}${ALPHA.MUTED}`,
	surfaceBright: seed.surface,
	surfaceFaint: seed.field,
	surfaceHigh: seed.surface,
	surfaceLight: seed.field,
	surfaceMid: seed.surface,
	surfaceRaised: seed.surface,
	surfaceSoft: seed.field,
	blue: seed.blue,
	aqua: seed.blue,
	cyan: seed.blue,
	lavender: seed.primary,
	mint: seed.income,
	orange: seed.gold,
	periwinkle: seed.blue,
	pink: seed.expense,
	skyBlue: seed.blue,
});

const THEME_PALETTES: Readonly<Record<ThemeId, AppTheme>> = {
	[THEME_IDS.MIDNIGHT_AMETHYST]: {
		id: THEME_IDS.MIDNIGHT_AMETHYST,
		isDark: true,
		colors: COLORS,
	},
	[THEME_IDS.GRAPHITE_MINT]: {
		id: THEME_IDS.GRAPHITE_MINT,
		isDark: true,
		colors: {
			...createColors({
				background: GRAPHITE_BACKGROUND,
				surface: "#242424",
				field: "#1C1C1C",
				line: "#444444",
				text: "#F4F4F4",
				muted: "#B2B2B2",
				primary: "#76E3B8",
				onPrimary: "#103628",
				selected: "#254C3D",
				income: "#76E3B8",
				expense: "#F2939B",
				blue: "#8EBBF5",
				gold: "#EFC477",
			}),
			backgroundTint: GRAPHITE_BACKGROUND,
		},
	},
	[THEME_IDS.PAPER_COBALT]: {
		id: THEME_IDS.PAPER_COBALT,
		isDark: false,
		colors: createColors({
			background: "#F3F6FB",
			surface: "#FFFFFF",
			field: "#F8FAFE",
			line: "#CFD9E8",
			text: "#182536",
			muted: "#596A80",
			primary: "#2558D9",
			onPrimary: "#FFFFFF",
			selected: "#DCE7FF",
			income: "#087C57",
			expense: "#BD3651",
			blue: "#2558D9",
			gold: "#946616",
		}),
	},
	[THEME_IDS.CARBON_ICE]: {
		id: THEME_IDS.CARBON_ICE,
		isDark: true,
		colors: createColors({
			background: "#14171B",
			surface: "#232830",
			field: "#191E25",
			line: "#4B5969",
			text: "#EDF3FA",
			muted: "#AFBECE",
			primary: "#91C7FF",
			onPrimary: "#102B48",
			selected: "#253D57",
			income: "#75D8AE",
			expense: "#F39AAA",
			blue: "#91C7FF",
			gold: "#E8C47C",
		}),
	},
	[THEME_IDS.OBSIDIAN_AMBER]: {
		id: THEME_IDS.OBSIDIAN_AMBER,
		isDark: true,
		colors: createColors({
			background: "#171719",
			surface: "#27272B",
			field: "#1E1E21",
			line: "#5A5650",
			text: "#F7F3EB",
			muted: "#C3BBAF",
			primary: "#F0C56B",
			onPrimary: "#352708",
			selected: "#4B3D24",
			income: "#7ED7B0",
			expense: "#F394A6",
			blue: "#94BDF0",
			gold: "#F0C56B",
		}),
	},
};

const THEME_CHART_COLORS: Readonly<Record<ThemeId, readonly string[]>> = {
	[THEME_IDS.MIDNIGHT_AMETHYST]: [
		COLORS.primary,
		COLORS.mint,
		COLORS.blue,
		COLORS.warning,
		COLORS.danger,
		COLORS.aqua,
		COLORS.periwinkle,
		COLORS.orange,
	],
	[THEME_IDS.GRAPHITE_MINT]: [
		"#76E3B8",
		"#AABB75",
		"#8EBBF5",
		"#EFC477",
		"#F2939B",
		"#65C8D0",
		"#BEACE8",
		"#F1AA78",
	],
	[THEME_IDS.PAPER_COBALT]: [
		"#2558D9",
		"#087C57",
		"#257B9E",
		"#946616",
		"#BD3651",
		"#50792D",
		"#7652A4",
		"#B15E26",
	],
	[THEME_IDS.CARBON_ICE]: [
		"#91C7FF",
		"#75D8AE",
		"#B8A2EB",
		"#E8C47C",
		"#F39AAA",
		"#69C5CC",
		"#A7BC74",
		"#ECA47B",
	],
	[THEME_IDS.OBSIDIAN_AMBER]: [
		"#F0C56B",
		"#7ED7B0",
		"#94BDF0",
		"#C0AFE8",
		"#F394A6",
		"#75C8CB",
		"#AFBE79",
		"#E5A575",
	],
};

const THEME_SELECT_OPTIONS = themeConstants.THEME_OPTIONS.map((option) => ({
	...option,
	swatches: [
		THEME_PALETTES[option.value].colors.background,
		THEME_PALETTES[option.value].colors.backgroundElevated,
		THEME_PALETTES[option.value].colors.primary,
	],
}));

export { THEME_CHART_COLORS, THEME_SELECT_OPTIONS };
export default THEME_PALETTES;
