const THEME_IDS = {
	MIDNIGHT_AMETHYST: "midnight-amethyst",
	GRAPHITE_MINT: "graphite-mint",
	PAPER_COBALT: "paper-cobalt",
	CARBON_ICE: "carbon-ice",
	OBSIDIAN_AMBER: "obsidian-amber",
} as const;

const themeConstants = {
	THEME_IDS,
	DEFAULT_THEME_ID: THEME_IDS.MIDNIGHT_AMETHYST,
	THEME_SETTING_KEY: "theme",
	THEME_OPTIONS: [
		{ label: "Midnight Amethyst", value: THEME_IDS.MIDNIGHT_AMETHYST },
		{ label: "Graphite & Mint", value: THEME_IDS.GRAPHITE_MINT },
		{ label: "Paper & Cobalt", value: THEME_IDS.PAPER_COBALT },
		{ label: "Carbon & Ice", value: THEME_IDS.CARBON_ICE },
		{ label: "Obsidian & Amber", value: THEME_IDS.OBSIDIAN_AMBER },
	],
} as const;

export default themeConstants;
