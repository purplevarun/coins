import { describe, expect, it, vi } from "vitest";

const stateSetters = vi.hoisted(() => ({
	setDataVersion: vi.fn(),
}));

const reactMocks = vi.hoisted(() => ({
	useState: vi.fn(() => [0, stateSetters.setDataVersion]),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useState: reactMocks.useState,
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
});
