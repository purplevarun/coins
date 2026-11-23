import type TestFunction from "@test/types/TestFunction";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useContext: vi.fn<TestFunction>().mockReturnValue(null),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useContext: mocks.useContext,
	};
});

import useModalSheet from "@/hooks/useModalSheet";

describe("useModalSheet", () => {
	it("throws when context is missing", () => {
		mocks.useContext.mockReturnValueOnce(null);
		expect(() => useModalSheet()).toThrow(
			"useModalSheet must be used inside ModalSheetProvider.",
		);
	});

	it("returns context value when present", () => {
		const value = { show: vi.fn(), hide: vi.fn() };
		mocks.useContext.mockReturnValueOnce(value);
		expect(useModalSheet()).toBe(value);
	});
});
