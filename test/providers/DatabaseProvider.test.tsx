import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stateSetters = vi.hoisted(() => ({
	setDataVersion: vi.fn(),
}));

const reactMocks = vi.hoisted(() => ({
	useState: vi.fn(() => [0, stateSetters.setDataVersion]),
	useEffect: vi.fn(),
}));

const lifecycleMocks = vi.hoisted(() => ({
	addEventListener:
		vi.fn<typeof import("react-native").AppState.addEventListener>(),
	remove: vi.fn(),
	vacuum: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
}));

vi.mock("react-native", () => ({
	AppState: { addEventListener: lifecycleMocks.addEventListener },
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
	};
});

vi.mock("@/providers/DatabaseContext", () => ({
	default: {
		Provider: ({ value, children }: any) => ({
			props: { value, children },
		}),
	},
}));

import DatabaseProvider from "@/providers/DatabaseProvider";

describe("DatabaseProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		lifecycleMocks.vacuum.mockReset().mockResolvedValue(undefined);
		lifecycleMocks.addEventListener.mockReturnValue({
			remove: lifecycleMocks.remove,
		});
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

	it("checks maintenance on foreground, handles failures, and removes its listener", async () => {
		const database = { name: "db" };
		const warn = vi
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);
		await DatabaseProvider({ children: null, database } as any);
		const effect = reactMocks.useEffect.mock
			.calls[0]?.[0] as () => () => void;
		const cleanup = effect();
		expect(lifecycleMocks.addEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function),
		);
		const listener = lifecycleMocks.addEventListener.mock.calls[0]?.[1];
		listener?.("background");
		listener?.("inactive");
		expect(lifecycleMocks.vacuum).not.toHaveBeenCalled();
		listener?.("active");
		await Promise.resolve();
		expect(lifecycleMocks.vacuum).toHaveBeenCalledWith(database);
		expect(warn).not.toHaveBeenCalled();
		const failure = new Error("database busy");
		lifecycleMocks.vacuum.mockRejectedValueOnce(failure);
		listener?.("active");
		await Promise.resolve();
		expect(warn).toHaveBeenCalledWith(
			"Daily database compaction failed.",
			failure,
		);
		listener?.("active");
		await Promise.resolve();
		expect(lifecycleMocks.vacuum).toHaveBeenCalledTimes(3);
		cleanup();
		expect(lifecycleMocks.remove).toHaveBeenCalledOnce();
	});
});
