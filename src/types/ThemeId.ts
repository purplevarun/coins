import type themeConstants from "@/constants/themeConstants";

type ThemeId =
	(typeof themeConstants.THEME_IDS)[keyof typeof themeConstants.THEME_IDS];

export default ThemeId;
