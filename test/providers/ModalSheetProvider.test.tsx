import { beforeEach, describe, expect, it, vi } from "vitest";

const setStack = vi.hoisted(() => vi.fn());
const refState = vi.hoisted(() => ({ current: 0 }));

const reactMocks = vi.hoisted(() => ({
	useState: vi.fn(),
	useCallback: vi.fn((fn: any) => fn),
	useMemo: vi.fn((factory: () => unknown) => factory()),
	useRef: vi.fn(() => refState),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useState: reactMocks.useState,
		useCallback: reactMocks.useCallback,
		useMemo: reactMocks.useMemo,
		useRef: reactMocks.useRef,
	};
});

vi.mock("react-native", () => ({
	StyleSheet: {
		create: (styles: any) => styles,
		absoluteFill: {},
	},
	View: (props: any) => ({ type: "View", props }),
}));

vi.mock("@/providers/ModalSheetContext", () => ({
	default: {
		Provider: ({ value, children }: any) => ({
			type: "Provider",
			props: { value, children },
		}),
	},
}));

import ModalSheetProvider from "@/providers/ModalSheetProvider";

const setupStack = (stack: any[]): void => {
	reactMocks.useState.mockReset();
	reactMocks.useState.mockImplementationOnce(() => [stack, setStack]);
};

describe("ModalSheetProvider", () => {
	beforeEach(() => {
		setStack.mockClear();
		refState.current = 0;
		reactMocks.useCallback.mockClear();
		reactMocks.useMemo.mockClear();
		reactMocks.useRef.mockClear();
	});

	it("pushes sheets with incrementing ids and returns the id", () => {
		setupStack([]);
		const element = ModalSheetProvider({ children: null }) as any;
		const { show } = element.props.value;

		const updater = (call: number): ((current: any[]) => any[]) =>
			setStack.mock.calls[call]?.[0] as (current: any[]) => any[];

		const firstId = show({ type: "A" });
		const secondId = show({ type: "B" });
		expect(firstId).toBe(1);
		expect(secondId).toBe(2);
		expect(updater(0)([])).toEqual([{ id: 1, node: { type: "A" } }]);
		expect(updater(1)([{ id: 1, node: { type: "A" } }])).toEqual([
			{ id: 1, node: { type: "A" } },
			{ id: 2, node: { type: "B" } },
		]);
	});

	it("removes only the matching sheet on hide", () => {
		setupStack([]);
		const element = ModalSheetProvider({ children: null }) as any;
		const { hide } = element.props.value;
		const stack = [
			{ id: 1, node: { type: "A" } },
			{ id: 2, node: { type: "B" } },
		];
		hide(1);
		const updater = setStack.mock.calls[0]?.[0] as (
			current: any[],
		) => any[];
		expect(updater(stack)).toEqual([{ id: 2, node: { type: "B" } }]);
	});

	it("renders only the top sheet in the host overlay", () => {
		setupStack([
			{ id: 1, node: { type: "A" } },
			{ id: 2, node: { type: "B" } },
		]);
		const element = ModalSheetProvider({ children: "kids" }) as any;
		const host = element.props.children[1];
		expect(host.props.children).toEqual({ type: "B" });
	});

	it("renders no host when the stack is empty", () => {
		setupStack([]);
		const element = ModalSheetProvider({ children: "kids" }) as any;
		expect(element.props.children[1]).toBeNull();
	});
});
