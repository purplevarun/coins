import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stateSetters = vi.hoisted(() => ({
	setDataVersion: vi.fn(),
	setVacuumNoticeVisible: vi.fn(),
}));

const reactMocks = vi.hoisted(() => ({
	useState: vi.fn((initial: unknown) => [
		initial,
		initial === 0
			? stateSetters.setDataVersion
			: stateSetters.setVacuumNoticeVisible,
	]),
	useEffect: vi.fn(),
	useRef: vi.fn((initial: unknown) => ({ current: initial })),
}));

const lifecycleMocks = vi.hoisted(() => ({
	addEventListener:
		vi.fn<typeof import("react-native").AppState.addEventListener>(),
	remove: vi.fn(),
	vacuum: vi.fn<TestAsyncFunction>().mockResolvedValue(false),
}));

vi.mock("react-native", () => ({
	AppState: { addEventListener: lifecycleMocks.addEventListener },
	StyleSheet: { create: (styles: unknown) => styles },
	View: "View",
}));

vi.mock("@/database/initializeDatabase", () => ({
	vacuumDatabaseIfNeeded: lifecycleMocks.vacuum,
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useState: reactMocks.useState,
		useEffect: reactMocks.useEffect,
		useRef: reactMocks.useRef,
	};
});

vi.mock("@/components/CustomText", () => ({
	default: (props: any) => ({ type: "CustomText", props }),
}));

vi.mock("@/providers/DatabaseContext", () => ({
	default: {
		Provider: ({ value, children }: any) => ({
			props: { value, children },
		}),
	},
}));

import DatabaseProvider from "@/providers/DatabaseProvider";

const containsText = (node: any, text: string): boolean => {
	if (node == null || typeof node === "boolean") return false;
	if (typeof node === "string") return node === text;
	if (Array.isArray(node))
		return node.some((child) => containsText(child, text));
	return containsText(node.props?.children, text);
};

describe("DatabaseProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		lifecycleMocks.vacuum.mockReset().mockResolvedValue(false);
		lifecycleMocks.addEventListener.mockReturnValue({
			remove: lifecycleMocks.remove,
		});
		reactMocks.useState.mockImplementation((initial: unknown) => [
			initial,
			initial === 0
				? stateSetters.setDataVersion
				: stateSetters.setVacuumNoticeVisible,
		]);
	});
	afterEach(() => vi.restoreAllMocks());

	it("provides the database and refreshData behavior", () => {
		const database = { name: "db" };

		const element = DatabaseProvider({
			children: null,
			database,
		} as any) as any;
		const value = element.props.value;

		value.refreshData();
		expect(stateSetters.setDataVersion).toHaveBeenCalledWith(
			expect.any(Function),
		);
		const incrementVersion = stateSetters.setDataVersion.mock
			.calls[0]?.[0] as (currentVersion: number) => number;
		expect(incrementVersion(2)).toBe(3);
		expect(value.database).toBe(database);
	});

	it("checks maintenance on mount and foreground, handles failures, and removes its listener", async () => {
		const database = { name: "db" };
		const warn = vi
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);
		await DatabaseProvider({ children: null, database } as any);
		const effect = reactMocks.useEffect.mock
			.calls[0]?.[0] as () => () => void;
		const cleanup = effect();
		expect(lifecycleMocks.vacuum).toHaveBeenCalledWith(database);
		expect(lifecycleMocks.addEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function),
		);
		const listener = lifecycleMocks.addEventListener.mock.calls[0]?.[1];
		listener?.("background");
		listener?.("inactive");
		expect(lifecycleMocks.vacuum).toHaveBeenCalledTimes(1);
		listener?.("active");
		await Promise.resolve();
		expect(lifecycleMocks.vacuum).toHaveBeenCalledTimes(2);
		expect(warn).not.toHaveBeenCalled();
		const failure = new Error("database busy");
		lifecycleMocks.vacuum.mockRejectedValueOnce(failure);
		listener?.("active");
		await Promise.resolve();
		await Promise.resolve();
		expect(warn).toHaveBeenCalledWith(
			"Daily database compaction failed.",
			failure,
		);
		listener?.("active");
		await Promise.resolve();
		expect(lifecycleMocks.vacuum).toHaveBeenCalledTimes(4);
		cleanup();
		expect(lifecycleMocks.remove).toHaveBeenCalledOnce();
	});

	it("shows and auto-hides the top notice after compaction", async () => {
		const database = { name: "db" };
		lifecycleMocks.vacuum.mockResolvedValue(true);
		const timeoutSpy = vi
			.spyOn(globalThis, "setTimeout")
			.mockImplementation(((callback: () => void) => {
				callback();
				return 1;
			}) as unknown as typeof setTimeout);
		const clearSpy = vi.spyOn(globalThis, "clearTimeout");

		await DatabaseProvider({ children: null, database } as any);
		const effect = reactMocks.useEffect.mock
			.calls[0]?.[0] as () => () => void;
		const cleanup = effect();
		await Promise.resolve();
		await Promise.resolve();
		expect(stateSetters.setVacuumNoticeVisible).toHaveBeenCalledWith(true);
		expect(stateSetters.setVacuumNoticeVisible).toHaveBeenCalledWith(false);

		const listener = lifecycleMocks.addEventListener.mock.calls[0]?.[1];
		listener?.("active");
		await Promise.resolve();
		await Promise.resolve();
		expect(clearSpy).toHaveBeenCalled();
		cleanup();
		timeoutSpy.mockRestore();
	});

	it("renders the top notice when it is visible", () => {
		reactMocks.useState.mockImplementation((initial: unknown) => [
			initial !== 0,
			vi.fn(),
		]);
		const element = DatabaseProvider({
			children: null,
			database: {},
		} as any) as any;
		expect(containsText(element.props.children, "Vacuum done!")).toBe(true);
	});
});
