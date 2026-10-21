import type ThemeColors from "@/types/ThemeColors";
import type ThemeId from "@/types/ThemeId";

type AppTheme = {
	readonly id: ThemeId;
	readonly isDark: boolean;
	readonly colors: ThemeColors;
};

export default AppTheme;
