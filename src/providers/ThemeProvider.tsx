import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type PropsWithChildren } from "react";
import { Appearance } from "react-native";

import LoadingScreen from "@/components/LoadingScreen";
import themeConstants from "@/constants/themeConstants";
import THEME_PALETTES from "@/constants/themePaletteConstants";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import ThemeContext from "@/providers/ThemeContext";
import settingsService from "@/services/settingsService";
import type ThemeId from "@/types/ThemeId";
import getErrorMessage from "@/utils/error";

const ThemeProvider = ({ children }: PropsWithChildren): React.JSX.Element => {
	const { database, dataVersion } = useDatabaseContext();
	const [themeId, setThemeId] = useState<ThemeId | null>(null);
	const [error, setError] = useState<string | null>(null);
	const theme = THEME_PALETTES[themeId ?? themeConstants.DEFAULT_THEME_ID];

	useEffect(() => {
		let isCurrent = true;
		const loadTheme = async (): Promise<void> => {
			try {
				const savedThemeId = await settingsService.getThemeId(database);
				if (isCurrent) {
					Appearance.setColorScheme(
						THEME_PALETTES[savedThemeId].isDark ? "dark" : "light",
					);
					setThemeId(savedThemeId);
					setError(null);
				}
			} catch (caughtError: unknown) {
				if (isCurrent) setError(getErrorMessage(caughtError));
			}
		};
		void loadTheme();
		return () => {
			isCurrent = false;
		};
	}, [database, dataVersion]);

	useEffect(() => {
		if (themeId || error) void SplashScreen.hideAsync();
	}, [themeId, error]);

	return (
		<ThemeContext.Provider value={theme}>
			<StatusBar style={theme.isDark ? "light" : "dark"} />
			{themeId ? children : <LoadingScreen error={error} />}
		</ThemeContext.Provider>
	);
};

export default ThemeProvider;
