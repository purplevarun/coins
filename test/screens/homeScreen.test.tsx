import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useMemo: vi.fn((factory: () => unknown) => factory()),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useMemo: reactMocks.useMemo,
	};
});

vi.mock("@expo/vector-icons", () => ({
	Ionicons: (props: any) => ({ type: "Ionicons", props }),
}));

vi.mock("expo-linear-gradient", () => ({
	LinearGradient: (props: any) => ({ type: "LinearGradient", props }),
}));

vi.mock("react-native", () => ({
	Pressable: (props: any) => ({ type: "Pressable", props }),
	StyleSheet: { create: (styles: any) => styles },
	View: (props: any) => ({ type: "View", props }),
}));

vi.mock("react-native-safe-area-context", () => ({
	SafeAreaView: (props: any) => ({ type: "SafeAreaView", props }),
}));

vi.mock("@/components/CustomText", () => ({
	default: (props: any) => ({ type: "CustomText", props }),
}));
vi.mock("@/components/GlassCard", () => ({
	default: (props: any) => ({ type: "GlassCard", props }),
}));
vi.mock("@/components/HeaderIconButton", () => ({
	default: (props: any) => ({ type: "HeaderIconButton", props }),
}));
vi.mock("@/components/ScreenContainer", () => ({
	default: (props: any) => ({ type: "ScreenContainer", props }),
}));

import HomeScreen, {
	getPressableScaleStyle,
	getTileIconBackgroundColor,
} from "@/screens/HomeScreen";

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

describe("HomeScreen", () => {
	beforeEach(() => {
		reactMocks.useMemo.mockClear();
	});

	it("renders all tiles and triggers key navigation actions", () => {
		const navigation = { navigate: vi.fn() };
		const tree = HomeScreen({ navigation } as any);

		const tilePressable = findByPredicate(
			tree,
			(node) =>
				typeof node?.props?.style === "function" &&
				typeof node?.props?.onPress === "function",
		)[0];
		expect(tilePressable).toBeTruthy();
		expect(tilePressable.props.style({ pressed: true })).toEqual(
			expect.arrayContaining([expect.anything()]),
		);

		const headerButtons = findByPredicate(
			tree,
			(node) =>
				typeof node?.props?.onPress === "function" &&
				typeof node?.props?.accessibilityLabel === "string" &&
				(Boolean(node.props.accessibilityLabel.includes("Search")) ||
					node.props.accessibilityLabel === "Settings"),
		);
		headerButtons.forEach((button) => button.props.onPress());

		findByPredicate(
			tree,
			(node) => typeof node?.props?.onPress === "function",
		).forEach((pressable) => pressable.props.onPress());

		expect(navigation.navigate).toHaveBeenCalledWith("GlobalSearch");
		expect(navigation.navigate).toHaveBeenCalledWith("Settings");
		expect(navigation.navigate).toHaveBeenCalledWith("Transactions");
		expect(navigation.navigate).toHaveBeenCalledWith("Sources");
		expect(navigation.navigate).toHaveBeenCalledWith("Categories");
		expect(navigation.navigate).toHaveBeenCalledWith("Trips");
		expect(navigation.navigate).toHaveBeenCalledWith("Investments");
		expect(navigation.navigate).toHaveBeenCalledWith("Analysis");
		expect(navigation.navigate).toHaveBeenCalledWith("Sectors");
		expect(navigation.navigate).toHaveBeenCalledWith("Vault", {
			kind: "PASSWORD",
		});
		expect(navigation.navigate).not.toHaveBeenCalledWith("Vault", {
			kind: "CARD",
		});
		expect(navigation.navigate).not.toHaveBeenCalledWith("Notes");
		expect(navigation.navigate).not.toHaveBeenCalledWith("Todos");
		expect(JSON.stringify(tree)).not.toContain("Notes");
		expect(JSON.stringify(tree)).not.toContain("Todos");
		expect(JSON.stringify(tree)).not.toContain("Identity");
	});

	it("executes tile style callbacks", () => {
		const navigation = { navigate: vi.fn() };
		const tree = HomeScreen({ navigation } as any);

		const styledPressables = findByPredicate(
			tree,
			(node) => typeof node?.props?.style === "function",
		);
		expect(styledPressables.length).toBeGreaterThan(0);
		styledPressables.forEach((node) => {
			expect(Array.isArray(node.props.style({ pressed: true }))).toBe(
				true,
			);
			expect(Array.isArray(node.props.style({ pressed: false }))).toBe(
				true,
			);
		});
	});

	it("covers HomeScreen helper metadata directly", () => {
		expect(getPressableScaleStyle(true)).toEqual([
			{ transform: [{ scale: 0.98 }] },
		]);
		expect(getPressableScaleStyle(false)).toEqual([false]);
		expect(getTileIconBackgroundColor("#123456")).toBe("#12345620");
	});
});
