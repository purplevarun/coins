import type HomeModeOption from "@/types/HomeModeOption";

const TOOLS = "TOOLS";
const FINANCE = "FINANCE";
const HEALTH = "HEALTH";

const HOME_MODES = [TOOLS, FINANCE, HEALTH] as const;

const HOME_MODE_OPTIONS: readonly HomeModeOption[] = [
	{ mode: TOOLS, label: "Tools", icon: "construct-outline" },
	{ mode: FINANCE, label: "Finance", icon: "wallet-outline" },
	{ mode: HEALTH, label: "Health", icon: "fitness-outline" },
];

const DEFAULT_HOME_MODE = FINANCE;

export default HOME_MODES;

export { DEFAULT_HOME_MODE, FINANCE, HEALTH, HOME_MODE_OPTIONS, TOOLS };
