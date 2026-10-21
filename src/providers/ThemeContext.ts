import { createContext } from "react";

import themeConstants from "@/constants/themeConstants";
import THEME_PALETTES from "@/constants/themePaletteConstants";
import type AppTheme from "@/types/AppTheme";

const ThemeContext = createContext<AppTheme>(
	THEME_PALETTES[themeConstants.DEFAULT_THEME_ID],
);

export default ThemeContext;
