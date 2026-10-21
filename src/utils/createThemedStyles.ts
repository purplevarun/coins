import THEME_PALETTES from "@/constants/themePaletteConstants";
import type ThemeColors from "@/types/ThemeColors";
import type ThemeId from "@/types/ThemeId";

const createThemedStyles = <Styles>(
	createStyles: (colors: ThemeColors) => Styles,
): Readonly<Record<ThemeId, Styles>> =>
	Object.fromEntries(
		Object.values(THEME_PALETTES).map((theme) => [
			theme.id,
			createStyles(theme.colors),
		]),
	) as Record<ThemeId, Styles>;

export default createThemedStyles;
