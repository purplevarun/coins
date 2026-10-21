import useTheme from "@/hooks/useTheme";
import type ThemeId from "@/types/ThemeId";

const useThemedStyles = <Styles>(
	themedStyles: Readonly<Record<ThemeId, Styles>>,
): Styles => themedStyles[useTheme().id];

export default useThemedStyles;
