import type ThemeId from "@/types/ThemeId";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	database: {},
	dataVersion: 0,
	themeId: null as ThemeId | null,
	error: null as string | null,
	setThemeId: vi.fn(),
	setError: vi.fn(),
	useEffect: vi.fn(),
	getThemeId: vi.fn<() => Promise<ThemeId>>(),
	useContext: vi.fn(),
	setColorScheme: vi.fn(),
	hideSplash: vi.fn().mockResolvedValue(undefined),
}));

vi.unmock("@/hooks/useTheme");

vi.mock("react", async (importOriginal) => ({
	...(await importOriginal<typeof import("react")>()),
	useContext: mocks.useContext,
	useEffect: mocks.useEffect,
	useState: vi.fn(),
}));
vi.mock("@/components/LoadingScreen", () => ({ default: "LoadingScreen" }));
vi.mock("react-native", () => ({
	Appearance: { setColorScheme: mocks.setColorScheme },
}));
vi.mock("expo-status-bar", () => ({ StatusBar: "StatusBar" }));
vi.mock("expo-splash-screen", () => ({ hideAsync: mocks.hideSplash }));
vi.mock("@/hooks/useDatabaseContext", () => ({
	default: () => ({
		database: mocks.database,
		dataVersion: mocks.dataVersion,
	}),
}));
vi.mock("@/services/settingsService", () => ({
	default: { getThemeId: mocks.getThemeId },
}));

import themeConstants from "@/constants/themeConstants";
import THEME_PALETTES, {
	THEME_CHART_COLORS,
	THEME_SELECT_OPTIONS,
} from "@/constants/themePaletteConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import ThemeContext from "@/providers/ThemeContext";
import ThemeProvider from "@/providers/ThemeProvider";
import createThemedStyles from "@/utils/createThemedStyles";
import { useState } from "react";

const { THEME_IDS, DEFAULT_THEME_ID } = themeConstants;
const render = (): any => {
	vi.mocked(useState).mockReturnValueOnce([mocks.themeId, mocks.setThemeId]);
	vi.mocked(useState).mockReturnValueOnce([mocks.error, mocks.setError]);
	return ThemeProvider({ children: "screens" });
};

const startEffect = (): (() => void) => mocks.useEffect.mock.calls[0]?.[0]();
const flush = async (): Promise<void> => {
	await Promise.resolve();
	await Promise.resolve();
};

describe("theme context and provider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.themeId = null;
		mocks.error = null;
		mocks.dataVersion = 0;
		mocks.getThemeId.mockReset().mockResolvedValue(THEME_IDS.GITHUB);
	});

	it("offers the six standard dark themes and Original with matching settings swatches", () => {
		expect(
			THEME_SELECT_OPTIONS.map(({ label, value, swatches }) => {
				const { colors, isDark } = THEME_PALETTES[value];
				expect(isDark).toBe(true);
				expect(swatches).toEqual([
					colors.background,
					colors.backgroundElevated,
					colors.primary,
				]);
				return { label, background: colors.background };
			}),
		).toEqual([
			{ label: "Obsidian", background: "#1C1C1C" },
			{ label: "GitHub", background: "#0D1117" },
			{ label: "Monokai", background: "#272822" },
			{ label: "One Dark", background: "#282C34" },
			{ label: "VS Code", background: "#1E1E1E" },
			{ label: "Gruvbox", background: "#282828" },
			{ label: "Original", background: "#080B14" },
		]);
	});

	it("preserves the original purple palette and chart colors", () => {
		expect(THEME_PALETTES[THEME_IDS.ORIGINAL].colors).toMatchObject({
			background: "#080B14",
			backgroundDeep: "#090B14",
			backgroundElevated: "#101522",
			backgroundMid: "#0E1020",
			backgroundTint: "#171029",
			glass: "rgba(22, 28, 44, 0.78)",
			primary: "#A87CFF",
			primaryBright: "#C5A8FF",
			primaryMuted: "rgba(168, 124, 255, 0.16)",
			netWorth: "#C5A8FF",
			text: "#F4F1FF",
			textMuted: "#A9B0C3",
			success: "#52D6A3",
			danger: "#FF6B86",
			warning: "#F5B95B",
		});
		expect(THEME_CHART_COLORS[THEME_IDS.ORIGINAL]).toEqual([
			"#A87CFF",
			"#56D6A3",
			"#60A5FA",
			"#F5B95B",
			"#FF6B86",
			"#67E8F9",
			"#C4B5FD",
			"#FB923C",
		]);
	});

	it.each(themeConstants.THEME_OPTIONS)(
		"exposes the $label palette and themed styles",
		({ value }) => {
			const palette = THEME_PALETTES[value];
			mocks.useContext.mockReturnValue(palette);
			expect(useTheme()).toBe(palette);
			expect(mocks.useContext).toHaveBeenCalledWith(ThemeContext);
			const factory = vi.fn((colors) => ({ color: colors.primary }));
			const styles = createThemedStyles(factory);
			expect(factory).toHaveBeenCalledTimes(
				themeConstants.THEME_OPTIONS.length,
			);
			expect(useThemedStyles(styles)).toEqual({
				color: palette.colors.primary,
			});
			expect(useThemedStyles(styles)).toBe(useThemedStyles(styles));
			expect(factory).toHaveBeenCalledTimes(
				themeConstants.THEME_OPTIONS.length,
			);
			expect(Object.keys(palette.colors)).toEqual(
				Object.keys(THEME_PALETTES[DEFAULT_THEME_ID].colors),
			);
			expect(palette.isDark).toBe(true);
		},
	);

	it("keeps Obsidian surfaces and text neutral with purple accents", () => {
		const { colors } = THEME_PALETTES[THEME_IDS.OBSIDIAN];
		const neutralRoles = [
			"background",
			"backgroundDeep",
			"backgroundElevated",
			"backgroundMid",
			"backgroundTint",
			"glass",
			"glassStrong",
			"border",
			"borderStrong",
			"surfaceBright",
			"surfaceFaint",
			"surfaceHigh",
			"surfaceLight",
			"surfaceMid",
			"surfaceRaised",
			"surfaceSoft",
			"text",
			"textMuted",
			"textDim",
		] as const;
		for (const role of neutralRoles) {
			expect(colors[role]).toMatch(/^#([0-9a-f]{2})\1\1$/i);
		}
		expect(colors.backgroundTint).toBe(colors.background);
		expect(colors.overlayTint.slice(0, 7)).toBe(colors.background);
		expect(colors.primary).toBe("#A882FF");
		expect(colors.primaryMuted).toBe("#A882FF29");
	});

	it("uses Obsidian while loading, then reads the saved theme", async () => {
		const element = render();
		expect(element.props.value.id).toBe(DEFAULT_THEME_ID);
		expect(element.props.children[1].type).toBe("LoadingScreen");
		startEffect();
		await flush();
		expect(mocks.getThemeId).toHaveBeenCalledWith(mocks.database);
		expect(mocks.setThemeId).toHaveBeenCalledWith(THEME_IDS.GITHUB);
		expect(mocks.setError).toHaveBeenCalledWith(null);
	});

	it("preserves children and tracks database refreshes for restored themes", () => {
		mocks.themeId = THEME_IDS.GITHUB;
		mocks.dataVersion = 3;
		const element = render();
		expect(element.props.children[1]).toBe("screens");
		expect(element.props.value).toBe(THEME_PALETTES[THEME_IDS.GITHUB]);
		expect(mocks.useEffect.mock.calls[0]?.[1]).toEqual([mocks.database, 3]);
	});

	it.each([
		{ id: null, error: null, hides: false },
		{ id: THEME_IDS.GITHUB, error: null, hides: true },
		{ id: null, error: "Theme unavailable", hides: true },
	])(
		"holds the splash until a theme or error is ready: $hides",
		({ id, error, hides }) => {
			mocks.themeId = id;
			mocks.error = error;
			render();
			mocks.useEffect.mock.calls[1]?.[0]();
			expect(mocks.hideSplash).toHaveBeenCalledTimes(hides ? 1 : 0);
		},
	);

	it("reports failed reads and displays initialization errors", async () => {
		mocks.getThemeId.mockRejectedValueOnce(new Error("Theme read failed"));
		render();
		startEffect();
		await flush();
		expect(mocks.setError).toHaveBeenCalledWith("Theme read failed");
		mocks.error = "Theme read failed";
		expect(render().props.children[1].props.error).toBe(
			"Theme read failed",
		);
		mocks.themeId = THEME_IDS.GITHUB;
		expect(render().props.children[1]).toBe("screens");
	});

	it.each(themeConstants.THEME_OPTIONS)(
		"sets system appearance for $label",
		async ({ value }) => {
			mocks.themeId = value;
			mocks.getThemeId.mockResolvedValueOnce(value);
			const element = render();
			expect(element.props.children[0].props.style).toBe("light");
			startEffect();
			await flush();
			expect(mocks.setColorScheme).toHaveBeenCalledWith("dark");
		},
	);

	it.each([false, true])(
		"ignores superseded theme reads, rejection=%s",
		async (rejects) => {
			if (rejects)
				mocks.getThemeId.mockRejectedValueOnce(new Error("Stale read"));
			render();
			startEffect()();
			await flush();
			expect(mocks.setThemeId).not.toHaveBeenCalled();
			expect(mocks.setError).not.toHaveBeenCalled();
		},
	);
});
