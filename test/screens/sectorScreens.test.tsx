import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useCallback: vi.fn((fn: unknown) => fn),
	useEffect: vi.fn(),
	useLayoutEffect: vi.fn(),
	useMemo: vi.fn((factory: () => unknown) => factory()),
	useState: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
	getSectors: vi.fn<TestAsyncFunction>(),
	deleteSector: vi.fn<TestAsyncFunction>(),
	getSector: vi.fn<TestAsyncFunction>(),
	saveSector: vi.fn<TestAsyncFunction>(),
	getCategories: vi.fn<TestAsyncFunction>(),
	getSectorSpend: vi.fn<TestAsyncFunction>().mockResolvedValue(new Map()),
}));

const hookMocks = vi.hoisted(() => ({
	refreshData: vi.fn(),
	confirm: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useCallback: reactMocks.useCallback,
		useEffect: reactMocks.useEffect,
		useLayoutEffect: reactMocks.useLayoutEffect,
		useMemo: reactMocks.useMemo,
		useState: reactMocks.useState,
	};
});

vi.mock("@react-navigation/native", () => ({
	useFocusEffect: (callback: () => void) => callback(),
}));

vi.mock("@expo/vector-icons", () => ({
	Ionicons: (props: any) => ({ type: "Ionicons", props }),
}));

vi.mock("react-native", () => ({
	Pressable: (props: any) => ({ type: "Pressable", props }),
	StyleSheet: { create: (styles: any) => styles },
	View: (props: any) => ({ type: "View", props }),
}));

vi.mock("@/components/AppButton", () => ({
	default: (props: any) => ({ type: "AppButton", props }),
}));
vi.mock("@/components/CustomText", () => ({
	default: (props: any) => ({ type: "CustomText", props }),
}));
vi.mock("@/components/EmptyState", () => ({
	default: (props: any) => ({ type: "EmptyState", props }),
}));
vi.mock("@/components/FloatingAddButton", () => ({
	default: (props: any) => ({ type: "FloatingAddButton", props }),
}));
vi.mock("@/components/GlassCard", () => ({
	default: (props: any) => ({ type: "GlassCard", props }),
}));
vi.mock("@/components/HeaderIconButton", () => ({
	default: (props: any) => ({ type: "HeaderIconButton", props }),
}));
vi.mock("@/components/ListHeader", () => ({
	default: (props: any) => ({ type: "ListHeader", props }),
}));
vi.mock("@/components/Notice", () => ({
	default: (props: any) => ({ type: "Notice", props }),
}));
vi.mock("@/components/ScreenContainer", () => ({
	default: (props: any) => ({ type: "ScreenContainer", props }),
}));
vi.mock("@/components/ScreenList", () => ({
	default: (props: any) => ({ type: "ScreenList", props }),
}));
vi.mock("@/components/SearchBar", () => ({
	default: (props: any) => ({ type: "SearchBar", props }),
}));
vi.mock("@/components/TextField", () => ({
	default: (props: any) => ({ type: "TextField", props }),
}));

vi.mock("@/hooks/useDatabaseContext", () => ({
	default: () => ({
		database: { id: "db" },
		refreshData: hookMocks.refreshData,
	}),
}));
vi.mock("@/hooks/useAppDialog", () => ({
	default: () => ({
		confirm: hookMocks.confirm,
		showMessage: hookMocks.showMessage,
	}),
}));

vi.mock("@/services/analysisService", () => ({
	default: { getSectorSpend: serviceMocks.getSectorSpend },
}));
vi.mock("@/services/sectorService", () => ({
	default: {
		getSectors: serviceMocks.getSectors,
		deleteSector: serviceMocks.deleteSector,
		getSector: serviceMocks.getSector,
		saveSector: serviceMocks.saveSector,
	},
}));
vi.mock("@/services/categoryService", () => ({
	default: { getCategories: serviceMocks.getCategories },
}));

vi.mock("@/utils/error", () => ({
	default: (caughtError: unknown) =>
		caughtError instanceof Error ? caughtError.message : "Unknown error",
}));

import FloatingAddButton from "@/components/FloatingAddButton";
import Notice from "@/components/Notice";
import ScreenList from "@/components/ScreenList";
import SearchBar from "@/components/SearchBar";
import SectorFormScreen from "@/screens/SectorFormScreen";
import SectorsScreen from "@/screens/SectorsScreen";

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

type StateHarness = Readonly<{
	setters: Map<number, ReturnType<typeof vi.fn>>;
}>;

type RenderResult = Readonly<{
	tree: ReactElement;
	harness: StateHarness;
}>;

const createStateHarness = (values: Map<number, unknown>): StateHarness => {
	const setters = new Map<number, ReturnType<typeof vi.fn>>();
	let index = 0;
	reactMocks.useState.mockImplementation((initial: any) => {
		index += 1;
		const setter = vi.fn();
		setters.set(index, setter);
		const current = values.get(index) ?? initial;
		return [
			typeof current === "function" && !(current instanceof Set)
				? current()
				: current,
			setter,
		];
	});
	return { setters };
};

const renderSectors = (
	navigation: { navigate: ReturnType<typeof vi.fn> },
	overrides: Map<number, unknown> = new Map(),
): RenderResult => {
	const harness = createStateHarness(overrides);
	const tree = (SectorsScreen as unknown as (props: unknown) => ReactElement)(
		{ navigation },
	);
	return { tree, harness };
};

describe("SectorsScreen", () => {
	beforeEach(() => {
		reactMocks.useCallback.mockClear();
		reactMocks.useEffect.mockReset();
		reactMocks.useLayoutEffect.mockReset();
		reactMocks.useState.mockReset();
		reactMocks.useEffect.mockImplementation((effect: () => void) => {
			effect();
		});
		reactMocks.useLayoutEffect.mockImplementation((effect: () => void) => {
			effect();
		});
		Object.values(serviceMocks).forEach((mockFn) => mockFn.mockReset());
		Object.values(hookMocks).forEach((mockFn) => mockFn.mockReset());
		serviceMocks.getSectors.mockResolvedValue([]);
		serviceMocks.deleteSector.mockResolvedValue(undefined);
	});

	it("loads sectors, renders items and navigates to the form", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		serviceMocks.getSectors.mockResolvedValue([
			{
				id: "sec1",
				name: "Home",
				categoryCount: 1,
				createdAt: 1,
				updatedAt: 2,
			},
			{
				id: "sec2",
				name: "Transport",
				categoryCount: 3,
				createdAt: 1,
				updatedAt: 2,
			},
		]);
		const overrides = new Map<number, unknown>([
			[
				1,
				[
					{
						id: "sec1",
						name: "Home",
						categoryCount: 1,
						createdAt: 1,
						updatedAt: 2,
					},
					{
						id: "sec2",
						name: "Transport",
						categoryCount: 3,
						createdAt: 1,
						updatedAt: 2,
					},
				],
			],
		]);
		const { tree } = renderSectors(navigation, overrides);
		await flush();
		expect(serviceMocks.getSectors).toHaveBeenCalledWith({ id: "db" });

		const screenList = findByPredicate(
			tree,
			(node) => node?.type === ScreenList,
		)[0];
		expect(screenList.props.data).toHaveLength(2);
		expect(
			screenList.props.keyExtractor({
				id: "sec1",
				name: "Home",
				categoryCount: 1,
				createdAt: 1,
				updatedAt: 2,
			}),
		).toBe("sec1");

		const rendered = screenList.props.renderItem({
			item: {
				id: "sec1",
				name: "Home",
				categoryCount: 1,
				createdAt: 1,
				updatedAt: 2,
			},
		});
		rendered.props.onPress();
		expect(navigation.navigate).toHaveBeenCalledWith("SectorForm", {
			entityId: "sec1",
		});
		expect(
			findByPredicate(
				rendered,
				(node) =>
					Array.isArray(node?.props?.children) &&
					node.props.children[0] === 1 &&
					node.props.children[2] === "category",
			),
		).toHaveLength(1);

		const renderedMany = screenList.props.renderItem({
			item: {
				id: "sec2",
				name: "Transport",
				categoryCount: 3,
				createdAt: 1,
				updatedAt: 2,
			},
		});
		expect(
			findByPredicate(
				renderedMany,
				(node) =>
					Array.isArray(node?.props?.children) &&
					node.props.children[2] === "categories",
			),
		).not.toHaveLength(0);

		const addButton = findByPredicate(
			tree,
			(node) => node?.type === FloatingAddButton,
		)[0];
		addButton.props.onPress();
		expect(navigation.navigate).toHaveBeenCalledWith("SectorForm");
	});

	it("deletes a sector and surfaces delete failures", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		const sectors = [
			{
				id: "sec1",
				name: "Home",
				categoryCount: 2,
				createdAt: 1,
				updatedAt: 2,
			},
		];
		const { tree } = renderSectors(
			navigation,
			new Map<number, unknown>([[1, sectors]]),
		);
		await flush();
		const screenList = findByPredicate(
			tree,
			(node) => node?.type === ScreenList,
		)[0];
		const rendered = screenList.props.renderItem({ item: sectors[0] });
		const deleteButton = findByPredicate(
			rendered,
			(node) => node?.props?.accessibilityLabel === "Delete",
		)[0];
		const deleteStyle = deleteButton.props.style;
		expect(
			(typeof deleteStyle === "function"
				? deleteStyle({ pressed: true })
				: deleteStyle)[1]?.transform,
		).toBeTruthy();

		hookMocks.confirm.mockImplementation(({ onConfirm }: any) =>
			onConfirm(),
		);
		deleteButton.props.onPress();
		await flush();
		expect(hookMocks.confirm).toHaveBeenCalledWith(
			expect.objectContaining({ variant: "danger" }),
		);
		expect(serviceMocks.deleteSector).toHaveBeenCalledWith(
			{ id: "db" },
			"sec1",
		);
		expect(hookMocks.refreshData).toHaveBeenCalledOnce();

		serviceMocks.deleteSector.mockRejectedValueOnce(new Error("boom"));
		deleteButton.props.onPress();
		await flush();
		expect(hookMocks.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ variant: "danger" }),
		);
	});

	it("filters by the debounced search and toggles the search header", async () => {
		vi.useFakeTimers();
		const cleanups: unknown[] = [];
		reactMocks.useEffect.mockImplementation((effect: () => unknown) => {
			cleanups.push(effect());
		});
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		const sectors = [
			{
				id: "sec1",
				name: "Home",
				categoryCount: 1,
				createdAt: 1,
				updatedAt: 2,
			},
			{
				id: "sec2",
				name: "Transport",
				categoryCount: 1,
				createdAt: 1,
				updatedAt: 2,
			},
		];
		const overrides = new Map<number, unknown>([
			[1, sectors],
			[3, true],
			[5, "home"],
		]);
		const { tree, harness } = renderSectors(navigation, overrides);
		await flush();
		const screenList = findByPredicate(
			tree,
			(node) => node?.type === ScreenList,
		)[0];
		expect(screenList.props.data).toEqual([sectors[0]]);

		const searchBar = findByPredicate(
			tree,
			(node) => node?.type === SearchBar,
		)[0];
		searchBar.props.onChangeText("tran");

		const headerButton =
			navigation.setOptions.mock.lastCall?.[0].headerRight();
		expect(headerButton.props.icon).toBe("close-outline");
		headerButton.props.onPress();
		expect(harness.setters.get(3)).toHaveBeenCalled();
		const toggleSearch = harness.setters.get(3)?.mock.calls[0]?.[0] as (
			visible: boolean,
		) => boolean;
		expect(toggleSearch(true)).toBe(false);
		expect(harness.setters.get(4)).toHaveBeenCalledWith("");

		const emptyFiltered = screenList.props.ListEmptyComponent;
		expect(emptyFiltered.props.title).toBe("No matching sectors");
		expect(emptyFiltered.props.icon).toBe("search-outline");

		await vi.advanceTimersByTimeAsync(300);
		expect(harness.setters.get(5)).toHaveBeenCalledWith("");
		(cleanups[0] as () => void)();
		vi.useRealTimers();
	});

	it("shows the empty state and load error notice", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		serviceMocks.getSectors.mockRejectedValueOnce(new Error("load fail"));
		const { tree } = renderSectors(
			navigation,
			new Map<number, unknown>([[2, "load fail"]]),
		);
		await flush();
		const screenList = findByPredicate(
			tree,
			(node) => node?.type === ScreenList,
		)[0];
		expect(screenList.props.ListEmptyComponent.props.title).toBe(
			"No sectors yet",
		);
		expect(
			findByPredicate(tree, (node) => node?.type === Notice),
		).toHaveLength(1);
		const headerButton =
			navigation.setOptions.mock.lastCall?.[0].headerRight();
		expect(headerButton.props.icon).toBe("search-outline");
	});
});

describe("SectorFormScreen", () => {
	beforeEach(() => {
		reactMocks.useCallback.mockClear();
		reactMocks.useEffect.mockReset();
		reactMocks.useState.mockReset();
		reactMocks.useEffect.mockImplementation((effect: () => void) => {
			effect();
		});
		Object.values(serviceMocks).forEach((mockFn) => mockFn.mockReset());
		Object.values(hookMocks).forEach((mockFn) => mockFn.mockReset());
		serviceMocks.getCategories.mockResolvedValue([]);
		serviceMocks.saveSector.mockResolvedValue(undefined);
	});

	const renderForm = (
		navigation: { goBack: ReturnType<typeof vi.fn> },
		routeParams: { entityId?: string } | undefined,
		overrides: Map<number, unknown> = new Map(),
	): RenderResult => {
		const harness = createStateHarness(overrides);
		const tree = (
			SectorFormScreen as unknown as (props: unknown) => ReactElement
		)({ navigation, route: { params: routeParams } });
		return { tree, harness };
	};

	it("loads a sector, toggles categories and saves", async () => {
		const navigation = { goBack: vi.fn() };
		serviceMocks.getSector.mockResolvedValue({
			sector: { id: "sec1", name: "Home" },
			categoryIds: ["c1"],
		});
		serviceMocks.getCategories.mockResolvedValue([
			{ id: "c2", name: "Salary", kind: "INCOME", isIncome: true },
			{ id: "c1", name: "Rent", kind: "EXPENSE", isIncome: false },
		]);
		const overrides = new Map<number, unknown>([
			[1, "Home"],
			[
				2,
				[
					{
						id: "c1",
						name: "Rent",
						kind: "EXPENSE",
						isIncome: false,
					},
					{
						id: "c2",
						name: "Salary",
						kind: "INCOME",
						isIncome: true,
					},
				],
			],
			[3, new Set(["c1"])],
		]);
		const { tree, harness } = renderForm(
			navigation,
			{ entityId: "sec1" },
			overrides,
		);
		await flush();
		expect(serviceMocks.getSector).toHaveBeenCalledWith(
			{ id: "db" },
			"sec1",
		);
		expect(
			findByPredicate(
				tree,
				(node) => node?.props?.children === "Edit sector",
			),
		).toHaveLength(1);
		expect(
			findByPredicate(
				tree,
				(node) => node?.props?.children === "Expense",
			),
		).toHaveLength(1);
		expect(
			findByPredicate(tree, (node) => node?.props?.children === "Income"),
		).toHaveLength(1);

		const rows = findByPredicate(
			tree,
			(node) => node?.props?.accessibilityRole === "button",
		);
		expect(rows).toHaveLength(2);
		rows[0].props.onPress();
		expect(harness.setters.get(3)).toHaveBeenCalled();
		const updater = harness.setters
			.get(3)
			?.mock.calls.map((call) => call[0])
			.find((arg) => typeof arg === "function") as (
			current: ReadonlySet<string>,
		) => Set<string>;
		expect([...updater(new Set(["c1"]))]).toEqual([]);
		expect([...updater(new Set())]).toEqual(["c1"]);

		const saveButton = findByPredicate(
			tree,
			(node) => node?.props?.label === "Save",
		)[0];
		await saveButton.props.onPress();
		await flush();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(serviceMocks.saveSector).toHaveBeenCalledWith(
			{ id: "db" },
			"sec1",
			"Home",
			["c1"],
		);
		expect(hookMocks.refreshData).toHaveBeenCalledOnce();
		expect(navigation.goBack).toHaveBeenCalledOnce();
		expect(harness.setters.get(4)).toHaveBeenLastCalledWith(false);
	});

	it("saves a new sector and reports load and save failures", async () => {
		const navigation = { goBack: vi.fn() };
		const { tree } = renderForm(navigation, undefined);
		await flush();
		expect(serviceMocks.getSector).not.toHaveBeenCalled();
		expect(
			findByPredicate(
				tree,
				(node) => node?.props?.children === "New sector",
			),
		).toHaveLength(1);

		serviceMocks.saveSector.mockRejectedValueOnce(new Error("save fail"));
		const saveButton = findByPredicate(
			tree,
			(node) => node?.props?.label === "Save",
		)[0];
		await saveButton.props.onPress();
		await flush();
		expect(navigation.goBack).not.toHaveBeenCalled();

		serviceMocks.getCategories.mockRejectedValueOnce(new Error("cat fail"));
		renderForm(navigation, { entityId: "sec1" });
		await flush();
	});

	it("renders the error notice and skips a missing sector", async () => {
		const navigation = { goBack: vi.fn() };
		serviceMocks.getSector.mockResolvedValue(null);
		const { tree, harness } = renderForm(
			navigation,
			{ entityId: "missing" },
			new Map<number, unknown>([[5, "visible error"]]),
		);
		await flush();
		expect(harness.setters.get(1)).not.toHaveBeenCalled();
		expect(
			findByPredicate(tree, (node) => node?.type === Notice),
		).toHaveLength(1);
	});
});
