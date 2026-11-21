import { isValidElement, type ComponentProps, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CustomText from "@/components/CustomText";
import GlassCard from "@/components/GlassCard";
import Notice from "@/components/Notice";
import SelectField from "@/components/SelectField";
import themeConstants from "@/constants/themeConstants";
import THEME_PALETTES, {
	THEME_SELECT_OPTIONS,
} from "@/constants/themePaletteConstants";
import useTheme from "@/hooks/useTheme";
import packageJson from "../../package.json";

const reactMocks = vi.hoisted(() => ({
	useEffect: vi.fn(),
	useState: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
	exportBackup: vi.fn(),
	restoreBackup: vi.fn(),
	getDefaultSourceId: vi.fn(),
	getDefaultTripId: vi.fn(),
	getFyStartMonth: vi.fn(),
	getNativeCurrencyDisplay: vi.fn(),
	updateDefaultSourceId: vi.fn(),
	updateDefaultTripId: vi.fn(),
	updateFyStartMonth: vi.fn(),
	updateNativeCurrencyDisplay: vi.fn(),
	updateThemeId: vi.fn(),
	getSources: vi.fn(),
	getTrips: vi.fn(),
	isAlertAccessGranted: vi.fn(() => false),
	openAlertAccessSettings: vi.fn(),
	appStateAddEventListener: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
	refreshData: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useEffect: reactMocks.useEffect,
		useState: reactMocks.useState,
	};
});

vi.mock("react-native", () => ({
	AppState: {
		addEventListener: serviceMocks.appStateAddEventListener,
	},
	StyleSheet: { create: (styles: any) => styles },
	Switch: (props: any) => ({ type: "Switch", props }),
	View: (props: any) => ({ type: "View", props }),
}));

vi.mock("@/components/AppButton", () => ({
	default: (props: any) => ({ type: "AppButton", props }),
}));
vi.mock("@/components/CustomText", () => ({
	default: (props: any) => ({ type: "CustomText", props }),
}));
vi.mock("@/components/GlassCard", () => ({
	default: (props: any) => ({ type: "GlassCard", props }),
}));
vi.mock("@/components/Notice", () => ({
	default: (props: any) => ({ type: "Notice", props }),
}));
vi.mock("@/components/ScreenContainer", () => ({
	default: (props: any) => ({ type: "ScreenContainer", props }),
}));
vi.mock("@/components/SelectField", () => ({
	default: (props: any) => ({ type: "SelectField", props }),
}));

vi.mock("@/hooks/useDatabaseContext", () => ({
	default: () => ({
		database: { id: "db" },
		refreshData: hookMocks.refreshData,
	}),
}));

vi.mock("@/services/backupService", () => ({
	default: {
		exportBackup: serviceMocks.exportBackup,
		restoreBackup: serviceMocks.restoreBackup,
	},
}));
vi.mock("@/services/settingsService", () => ({
	default: {
		getDefaultSourceId: serviceMocks.getDefaultSourceId,
		getDefaultTripId: serviceMocks.getDefaultTripId,
		getFyStartMonth: serviceMocks.getFyStartMonth,
		getNativeCurrencyDisplay: serviceMocks.getNativeCurrencyDisplay,
		updateDefaultSourceId: serviceMocks.updateDefaultSourceId,
		updateDefaultTripId: serviceMocks.updateDefaultTripId,
		updateFyStartMonth: serviceMocks.updateFyStartMonth,
		updateNativeCurrencyDisplay: serviceMocks.updateNativeCurrencyDisplay,
		updateThemeId: serviceMocks.updateThemeId,
	},
}));
vi.mock("@/services/sourceService", () => ({
	default: { getSources: serviceMocks.getSources },
}));
vi.mock("@/services/transactionAlertService", () => ({
	default: {
		isAlertAccessGranted: serviceMocks.isAlertAccessGranted,
		openAlertAccessSettings: serviceMocks.openAlertAccessSettings,
	},
}));
vi.mock("@/services/tripService", () => ({
	default: {
		getTrips: serviceMocks.getTrips,
	},
}));
vi.mock("@/utils/error", () => ({
	default: (caughtError: unknown) =>
		caughtError instanceof Error ? caughtError.message : "Unknown error",
}));

import SettingsScreen from "@/screens/SettingsScreen";

const defaultSourceId = "2e78d253-f5f0-4c4b-adfa-891a39a3f91a";
const sources = [
	{ id: defaultSourceId, name: "Cash", currencyCode: "INR", balance: "0" },
];

const flush = async (): Promise<void> => {
	await Promise.resolve();
	await Promise.resolve();
};

const findByPredicate = (
	node: any,
	predicate: (candidate: any) => boolean,
	acc: any[] = [],
): any[] => {
	if (!node) return acc;
	if (Array.isArray(node)) {
		node.forEach((child) => findByPredicate(child, predicate, acc));
		return acc;
	}
	if (predicate(node)) acc.push(node);
	if (node.props) {
		Object.values(node.props).forEach((value) =>
			findByPredicate(value, predicate, acc),
		);
	}
	return acc;
};

describe("SettingsScreen", () => {
	beforeEach(() => {
		reactMocks.useEffect.mockReset();
		reactMocks.useState.mockReset();
		reactMocks.useEffect.mockImplementation((effect: () => void) => {
			effect();
		});
		reactMocks.useState.mockImplementation((initial: any) => [
			typeof initial === "function" ? initial() : initial,
			vi.fn(),
		]);

		Object.values(serviceMocks).forEach((mockFn) => mockFn.mockReset());
		Object.values(hookMocks).forEach((mockFn) => mockFn.mockReset());

		serviceMocks.getNativeCurrencyDisplay.mockResolvedValue(true);
		serviceMocks.getFyStartMonth.mockResolvedValue(4);
		serviceMocks.getDefaultSourceId.mockResolvedValue(defaultSourceId);
		serviceMocks.getDefaultTripId.mockResolvedValue("trip1");
		serviceMocks.getSources.mockResolvedValue(sources);
		serviceMocks.getTrips.mockResolvedValue([{ id: "trip1", name: "Goa" }]);
		serviceMocks.updateNativeCurrencyDisplay.mockResolvedValue(undefined);
		serviceMocks.updateFyStartMonth.mockResolvedValue(undefined);
		serviceMocks.updateDefaultSourceId.mockResolvedValue(undefined);
		serviceMocks.updateDefaultTripId.mockResolvedValue(undefined);
		serviceMocks.updateThemeId.mockResolvedValue(undefined);
		vi.mocked(useTheme).mockReturnValue(
			THEME_PALETTES[themeConstants.DEFAULT_THEME_ID],
		);
		serviceMocks.exportBackup.mockResolvedValue(undefined);
		serviceMocks.restoreBackup.mockResolvedValue(true);
		serviceMocks.appStateAddEventListener.mockReturnValue({
			remove: vi.fn(),
		});
	});

	it.each(themeConstants.THEME_OPTIONS)(
		"saves the $label selection and refreshes the theme",
		async ({ value }) => {
			const currentId =
				value === themeConstants.DEFAULT_THEME_ID
					? themeConstants.THEME_IDS.GITHUB
					: themeConstants.DEFAULT_THEME_ID;
			vi.mocked(useTheme).mockReturnValue(THEME_PALETTES[currentId]);
			const tree = SettingsScreen({
				navigation: { navigate: vi.fn() },
			} as any);
			const field = findByPredicate(
				tree,
				(node) =>
					node.type === SelectField && node.props.label === "Theme",
			)[0];
			expect(field.props.options).toEqual(THEME_SELECT_OPTIONS);
			expect(field.props.isSearchable).toBe(false);
			expect(field.props.value).toBe(currentId);
			field.props.onChange(value);
			await flush();
			expect(serviceMocks.updateThemeId).toHaveBeenCalledExactlyOnceWith(
				{ id: "db" },
				value,
			);
			expect(hookMocks.refreshData).toHaveBeenCalledOnce();
		},
	);

	it("themes the currency-off state and disables theme selection while working", () => {
		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial) => {
			stateCall += 1;
			return [
				stateCall === 1 ? false : stateCall === 2 ? true : initial,
				vi.fn(),
			];
		});
		const tree = SettingsScreen({
			navigation: { navigate: vi.fn() },
		} as any);
		const control = findByPredicate(
			tree,
			(node) => typeof node.props?.onValueChange === "function",
		)[0];
		expect(control.props.thumbColor).toBe(
			THEME_PALETTES[themeConstants.DEFAULT_THEME_ID].colors.textMuted,
		);
		const field = findByPredicate(
			tree,
			(node) => node.type === SelectField && node.props.label === "Theme",
		)[0];
		expect(field.props.isDisabled).toBe(true);
	});

	it("does not rewrite an unchanged theme", async () => {
		const tree = SettingsScreen({
			navigation: { navigate: vi.fn() },
		} as any);
		const field = findByPredicate(
			tree,
			(node) => node.type === SelectField && node.props.label === "Theme",
		)[0];
		field.props.onChange(themeConstants.DEFAULT_THEME_ID);
		await flush();
		expect(serviceMocks.updateThemeId).not.toHaveBeenCalled();
		expect(hookMocks.refreshData).not.toHaveBeenCalled();
	});

	it("retains the active theme when saving fails and re-enables selection", async () => {
		const setWorking = vi.fn();
		const setError = vi.fn();
		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial) => {
			stateCall += 1;
			return [
				initial,
				stateCall === 2
					? setWorking
					: stateCall === 3
						? setError
						: vi.fn(),
			];
		});
		serviceMocks.updateThemeId.mockRejectedValueOnce(
			new Error("Theme write failed"),
		);
		const tree = SettingsScreen({
			navigation: { navigate: vi.fn() },
		} as any);
		const field = findByPredicate(
			tree,
			(node) => node.type === SelectField && node.props.label === "Theme",
		)[0];
		field.props.onChange(themeConstants.THEME_IDS.GITHUB);
		await flush();
		expect(setError).toHaveBeenCalledWith("Theme write failed");
		expect(setWorking.mock.calls).toEqual([[true], [false]]);
		expect(field.props.value).toBe(themeConstants.DEFAULT_THEME_ID);
		expect(hookMocks.refreshData).not.toHaveBeenCalled();
	});

	it.each([
		{
			action: "selects a source",
			initialSourceId: null,
			selectedSourceId: defaultSourceId,
			stored: defaultSourceId,
		},
		{
			action: "clears the default source",
			initialSourceId: defaultSourceId,
			selectedSourceId: "",
			stored: null,
		},
	])(
		"$action after loading source settings",
		async ({ initialSourceId, selectedSourceId, stored }) => {
			serviceMocks.getDefaultSourceId.mockResolvedValue(initialSourceId);
			const setDefaultSourceId = vi.fn();
			const setSources = vi.fn();
			let stateCall = 0;
			reactMocks.useState.mockImplementation((initial: unknown) => {
				stateCall += 1;
				if (stateCall === 8)
					return [initialSourceId ?? "", setDefaultSourceId];
				if (stateCall === 9) return [sources, setSources];
				return [
					typeof initial === "function"
						? (initial as () => unknown)()
						: initial,
					vi.fn(),
				];
			});
			const renderScreen = SettingsScreen as (
				props: unknown,
			) => ReactElement;
			const tree = renderScreen({ navigation: { navigate: vi.fn() } });
			await flush();

			expect(serviceMocks.getDefaultSourceId).toHaveBeenCalledWith({
				id: "db",
			});
			expect(serviceMocks.getSources).toHaveBeenCalledWith({ id: "db" });
			expect(setDefaultSourceId).toHaveBeenCalledWith(
				initialSourceId ?? "",
			);
			expect(setSources).toHaveBeenCalledWith(sources);
			const [field] = findByPredicate(
				tree,
				(node: unknown) =>
					isValidElement<ComponentProps<typeof SelectField>>(node) &&
					node.type === SelectField &&
					node.props.label === "Default source",
			) as ReactElement<ComponentProps<typeof SelectField>>[];
			expect(field?.props.value).toBe(initialSourceId ?? "");
			expect(field?.props.options).toEqual([
				{ label: "None", value: "" },
				{ label: "Cash", value: defaultSourceId, description: "INR" },
			]);
			field?.props.onChange(selectedSourceId);
			await flush();

			expect(
				serviceMocks.updateDefaultSourceId,
			).toHaveBeenCalledExactlyOnceWith({ id: "db" }, stored);
			expect(setDefaultSourceId).toHaveBeenLastCalledWith(
				selectedSourceId,
			);
			expect(hookMocks.refreshData).toHaveBeenCalledExactlyOnceWith();
		},
	);

	it("offers only None when no sources are available", async () => {
		serviceMocks.getSources.mockResolvedValue([]);
		serviceMocks.getDefaultSourceId.mockResolvedValue(null);
		const renderScreen = SettingsScreen as (props: unknown) => ReactElement;
		const tree = renderScreen({ navigation: { navigate: vi.fn() } });
		await flush();
		const [field] = findByPredicate(
			tree,
			(node: unknown) =>
				isValidElement<ComponentProps<typeof SelectField>>(node) &&
				node.type === SelectField &&
				node.props.label === "Default source",
		) as ReactElement<ComponentProps<typeof SelectField>>[];
		expect(field?.props.value).toBe("");
		expect(field?.props.options).toEqual([{ label: "None", value: "" }]);
	});

	it.each(["load", "save"] as const)(
		"reports default-source %s errors",
		async (operation) => {
			const setError = vi.fn();
			const setDefaultSourceId = vi.fn();
			let stateCall = 0;
			reactMocks.useState.mockImplementation((initial: unknown) => {
				stateCall += 1;
				if (stateCall === 3) return ["", setError];
				if (stateCall === 8)
					return [defaultSourceId, setDefaultSourceId];
				return [
					typeof initial === "function"
						? (initial as () => unknown)()
						: initial,
					vi.fn(),
				];
			});
			const failingService =
				operation === "load"
					? serviceMocks.getDefaultSourceId
					: serviceMocks.updateDefaultSourceId;
			failingService.mockRejectedValueOnce(
				new Error("Source setting failed"),
			);
			const renderScreen = SettingsScreen as (
				props: unknown,
			) => ReactElement;
			const tree = renderScreen({ navigation: { navigate: vi.fn() } });
			await flush();
			if (operation === "save") {
				setDefaultSourceId.mockClear();
				const [field] = findByPredicate(
					tree,
					(node: unknown) =>
						isValidElement<ComponentProps<typeof SelectField>>(
							node,
						) &&
						node.type === SelectField &&
						node.props.label === "Default source",
				) as ReactElement<ComponentProps<typeof SelectField>>[];
				field?.props.onChange("");
			}
			await flush();
			expect(setError).toHaveBeenCalledWith("Source setting failed");
			expect(setDefaultSourceId).not.toHaveBeenCalled();
			expect(hookMocks.refreshData).not.toHaveBeenCalled();
		},
	);

	it("loads settings and executes configuration and backup actions", async () => {
		const navigation = { navigate: vi.fn() };
		const tree = SettingsScreen({ navigation } as any);
		await flush();

		const [brand] = findByPredicate(
			tree,
			(node) => isValidElement(node) && node.type === GlassCard,
		);
		const brandTexts = findByPredicate(
			brand,
			(node) => isValidElement(node) && node.type === CustomText,
		);
		expect(brandTexts.map((node) => node.props.children)).toEqual([
			"Purplecoins",
			["Version ", packageJson.version],
		]);
		expect(
			findByPredicate(
				tree,
				(node) => typeof node?.props?.onPress === "function",
			).map((node) => node.props.label),
		).toEqual([
			"Archived relations",
			"Export .pczip",
			"Restore .pc/.pczip",
			"Enable alerts",
		]);

		findByPredicate(
			tree,
			(node) => typeof node?.props?.onValueChange === "function",
		)[0]?.props?.onValueChange(false);
		await flush();

		const selects = findByPredicate(
			tree,
			(node) => typeof node?.props?.onChange === "function",
		);
		selects
			.find((node) => node?.props?.label === "Financial year start month")
			?.props?.onChange("7");
		selects
			.find((node) => node?.props?.label === "Default trip")
			?.props?.onChange("trip1");
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Archived relations" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Export .pczip" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Restore .pc/.pczip" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.getNativeCurrencyDisplay).toHaveBeenCalledWith({
			id: "db",
		});
		expect(serviceMocks.getFyStartMonth).toHaveBeenCalledWith({ id: "db" });
		expect(serviceMocks.getDefaultTripId).toHaveBeenCalledWith({
			id: "db",
		});
		expect(serviceMocks.getTrips).toHaveBeenCalledWith({ id: "db" });

		expect(serviceMocks.updateNativeCurrencyDisplay).toHaveBeenCalledWith(
			{ id: "db" },
			false,
		);
		expect(serviceMocks.updateFyStartMonth).toHaveBeenCalledWith(
			{ id: "db" },
			7,
		);
		expect(serviceMocks.updateDefaultTripId).toHaveBeenCalledWith(
			{ id: "db" },
			"trip1",
		);
		expect(serviceMocks.exportBackup).toHaveBeenCalledWith({ id: "db" });
		expect(serviceMocks.restoreBackup).toHaveBeenCalledWith({ id: "db" });
		expect(hookMocks.refreshData).toHaveBeenCalled();
		expect(navigation.navigate).toHaveBeenCalledWith("ArchivedRelations");
	});

	it("handles restore no-op branch when no backup was restored", async () => {
		serviceMocks.restoreBackup.mockResolvedValue(false);
		const tree = SettingsScreen({
			navigation: { navigate: vi.fn() },
		} as any);
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Restore .pc/.pczip" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.restoreBackup).toHaveBeenCalledWith({ id: "db" });
	});

	it("covers export and restore error branches", async () => {
		serviceMocks.exportBackup.mockRejectedValueOnce(
			new Error("export failed"),
		);
		serviceMocks.restoreBackup.mockRejectedValueOnce(
			new Error("restore failed"),
		);
		const tree = SettingsScreen({
			navigation: { navigate: vi.fn() },
		} as any);
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Export .pczip" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Restore .pc/.pczip" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.exportBackup).toHaveBeenCalledWith({ id: "db" });
		expect(serviceMocks.restoreBackup).toHaveBeenCalledWith({ id: "db" });
	});

	it("covers null default trip load and empty default trip update", async () => {
		serviceMocks.getDefaultTripId.mockResolvedValue(null);
		const tree = SettingsScreen({
			navigation: { navigate: vi.fn() },
		} as any);
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Default trip" &&
				typeof node?.props?.onChange === "function",
		)[0]?.props?.onChange("");
		await flush();

		expect(serviceMocks.getDefaultTripId).toHaveBeenCalledWith({
			id: "db",
		});
		expect(serviceMocks.updateDefaultTripId).toHaveBeenCalledWith(
			{ id: "db" },
			null,
		);
	});

	it("covers FY-end label branches and mapped trip options", async () => {
		const navigation = { navigate: vi.fn() };
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 5) return [1, vi.fn()];
			if (call === 7) {
				return [
					[
						{ id: "trip1", name: "Goa" },
						{ id: "trip2", name: "Mysore" },
					],
					vi.fn(),
				];
			}
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = SettingsScreen({ navigation } as any);
		await flush();

		expect(String(JSON.stringify(tree))).toContain("Dec");
		const defaultTripSelect = findByPredicate(
			tree,
			(node) => node?.props?.label === "Default trip",
		)[0];
		expect(defaultTripSelect?.props?.options).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ value: "" }),
				expect.objectContaining({ value: "trip1" }),
				expect.objectContaining({ value: "trip2" }),
			]),
		);
	});

	it("covers FY-end fallback label", async () => {
		const navigation = { navigate: vi.fn() };
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 5) return [0, vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = SettingsScreen({ navigation } as any);
		await flush();

		expect(String(JSON.stringify(tree))).toContain("Mar");
	});

	it.each([
		{ scope: "top", heading: null },
		{ scope: "config", heading: "Configuration" },
		{ scope: "backup", heading: "Backup and restore" },
	])(
		"renders a $scope error notice at the top of its section",
		async ({ scope, heading }) => {
			const navigation = { navigate: vi.fn() };
			let call = 0;
			reactMocks.useState.mockImplementation((initial: any) => {
				call += 1;
				if (call === 3) return ["boom", vi.fn()];
				if (call === 10) return [scope, vi.fn()];
				return [
					typeof initial === "function" ? initial() : initial,
					vi.fn(),
				];
			});

			const tree = SettingsScreen({ navigation } as any);
			await flush();

			const notices = findByPredicate(
				tree,
				(node) => isValidElement(node) && node.type === Notice,
			);
			expect(notices).toHaveLength(1);
			expect(notices[0]?.props).toMatchObject({
				message: "boom",
				tone: "danger",
			});
			if (heading === null) {
				expect(tree.props.children[0]).toBe(notices[0]);
				return;
			}
			const [card] = findByPredicate(
				tree,
				(node) =>
					isValidElement(node) &&
					node.type === GlassCard &&
					findByPredicate(node, (c) => c?.props?.children === heading)
						.length === 1,
			);
			expect(
				findByPredicate(
					card,
					(n) => isValidElement(n) && n.type === Notice,
				),
			).toHaveLength(1);
		},
	);

	it("renders a success message notice inside the scoped section", async () => {
		const navigation = { navigate: vi.fn() };
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 4) return ["saved", vi.fn()];
			if (call === 10) return ["backup", vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = SettingsScreen({ navigation } as any);
		await flush();

		const notices = findByPredicate(
			tree,
			(node) => isValidElement(node) && node.type === Notice,
		);
		expect(notices).toHaveLength(1);
		expect(notices[0]?.props).toMatchObject({ message: "saved" });
		const [card] = findByPredicate(
			tree,
			(node) =>
				isValidElement(node) &&
				node.type === GlassCard &&
				findByPredicate(
					node,
					(c) => c?.props?.children === "Backup and restore",
				).length === 1,
		);
		expect(
			findByPredicate(
				card,
				(n) => isValidElement(n) && n.type === Notice,
			),
		).toHaveLength(1);
	});

	it("shows alert access as enabled when granted", async () => {
		serviceMocks.isAlertAccessGranted.mockReturnValue(true);
		let call = 0;
		reactMocks.useState.mockImplementation((initial: unknown) => {
			call += 1;
			if (call === 11) return [true, vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});
		const tree = SettingsScreen({
			navigation: { navigate: vi.fn() },
		} as any);
		await flush();
		expect(
			findByPredicate(
				tree,
				(node) =>
					node?.props?.label === "Enable alerts" ||
					node?.props?.children === "Enable alerts",
			),
		).toHaveLength(0);
	});

	it("wires transaction alert access controls", async () => {
		const cleanups: (() => void)[] = [];
		reactMocks.useEffect.mockImplementation(
			(effect: () => (() => void) | undefined) => {
				const result = effect();
				if (typeof result === "function") cleanups.push(result);
			},
		);
		const tree = SettingsScreen({
			navigation: { navigate: vi.fn() },
		} as any);
		await flush();

		expect(serviceMocks.isAlertAccessGranted).toHaveBeenCalled();
		expect(serviceMocks.appStateAddEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function),
		);
		const listener = serviceMocks.appStateAddEventListener.mock
			.calls[0]?.[1] as (state: string) => void;
		listener("background");
		listener("active");
		expect(
			serviceMocks.isAlertAccessGranted.mock.calls.length,
		).toBeGreaterThan(1);
		cleanups.forEach((cleanup) => cleanup());

		const enableButton = findByPredicate(
			tree,
			(node) => node?.props?.label === "Enable alerts",
		)[0];
		enableButton?.props?.onPress();
		expect(serviceMocks.openAlertAccessSettings).toHaveBeenCalled();
	});
});
