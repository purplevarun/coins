import { vi } from "vitest";

vi.mock("@/hooks/useTheme", async () => {
	const { default: themeConstants } =
		await import("@/constants/themeConstants");
	const { default: palettes } =
		await import("@/constants/themePaletteConstants");
	return {
		default: vi.fn(() => palettes[themeConstants.DEFAULT_THEME_ID]),
	};
});
