import { useContext } from "react";

import ThemeContext from "@/providers/ThemeContext";
import type AppTheme from "@/types/AppTheme";

const useTheme = (): AppTheme => useContext(ThemeContext);

export default useTheme;
