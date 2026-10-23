const THEME_IDS = {
	OBSIDIAN: "obsidian",
	GITHUB: "github",
	MONOKAI: "monokai",
	ONE_DARK: "one-dark",
	VS_CODE: "vs-code",
	GRUVBOX: "gruvbox",
	ORIGINAL: "original",
} as const;

const themeConstants = {
	THEME_IDS,
	DEFAULT_THEME_ID: THEME_IDS.OBSIDIAN,
	THEME_SETTING_KEY: "theme",
	THEME_OPTIONS: [
		{ label: "Obsidian", value: THEME_IDS.OBSIDIAN },
		{ label: "GitHub", value: THEME_IDS.GITHUB },
		{ label: "Monokai", value: THEME_IDS.MONOKAI },
		{ label: "One Dark", value: THEME_IDS.ONE_DARK },
		{ label: "VS Code", value: THEME_IDS.VS_CODE },
		{ label: "Gruvbox", value: THEME_IDS.GRUVBOX },
		{ label: "Original", value: THEME_IDS.ORIGINAL },
	],
} as const;

export default themeConstants;
