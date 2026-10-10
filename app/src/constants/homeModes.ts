import type HomeModeOption from "@/types/HomeModeOption";

const TOOLS = "TOOLS";
const FINANCE = "FINANCE";

const HOME_MODES = [FINANCE, TOOLS] as const;

const HOME_MODE_OPTIONS: readonly HomeModeOption[] = [
	{ mode: FINANCE, label: "Finance", icon: "wallet-outline" },
	{ mode: TOOLS, label: "Tools", icon: "construct-outline" },
];

const DEFAULT_HOME_MODE = FINANCE;

export default HOME_MODES;

export { DEFAULT_HOME_MODE, FINANCE, HOME_MODE_OPTIONS, TOOLS };
