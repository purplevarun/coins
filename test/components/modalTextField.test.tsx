import type ModalFieldSheetProps from "@/types/ModalFieldSheetProps";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useEffect: vi.fn(),
	useRef: vi.fn(),
	useState: vi.fn(),
}));

const sheetHost = vi.hoisted(() => ({
	show: vi.fn((_sheet: unknown) => 0),
	hide: vi.fn(),
}));

const backHandlerMocks = vi.hoisted(() => ({
	addEventListener: vi.fn((_event: string, _handler: () => boolean) => ({
		remove: vi.fn(),
	})),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useEffect: reactMocks.useEffect,
		useRef: reactMocks.useRef,
		useState: reactMocks.useState,
	};
});

vi.mock("react-native", () => ({
	BackHandler: backHandlerMocks,
	KeyboardAvoidingView: "KeyboardAvoidingView",
	Platform: { OS: "android" },
	Pressable: "Pressable",
	StyleSheet: { create: (styles: unknown) => styles },
	View: "View",
}));

vi.mock("@expo/vector-icons/Ionicons", () => ({
	default: "Ionicons",
}));

vi.mock("@/components/CustomText", () => ({ default: "CustomText" }));
vi.mock("@/components/CustomTextInput", () => ({
	default: "CustomTextInput",
}));
vi.mock("@/components/HeaderIconButton", () => ({
	default: "HeaderIconButton",
}));
vi.mock("@/hooks/useModalSheet", () => ({ default: () => sheetHost }));

import { Platform } from "react-native";

import ModalTextField from "@/components/ModalTextField";

const findAllByType = (node: any, type: string, acc: any[] = []): any[] => {
	if (!node) return acc;
	if (Array.isArray(node)) {
		node.forEach((child) => findAllByType(child, type, acc));
		return acc;
	}
	if (node.type === type) acc.push(node);
	if (node.props) {
		Object.values(node.props).forEach((value) =>
			findAllByType(value, type, acc),
		);
	}
	return acc;
};

const renderSheet = (draft = "", setDraft: () => void = vi.fn()): any => {
	const calls = sheetHost.show.mock.calls;
	const sheet = calls[calls.length - 1]?.[0] as ReactElement<
		ModalFieldSheetProps & { children?: never }
	>;
	reactMocks.useState.mockImplementationOnce(() => [draft, setDraft]);
	let cleanup: unknown;
	reactMocks.useEffect.mockImplementationOnce((effect: () => unknown) => {
		cleanup = effect();
	});
	const tree = (sheet.type as (props: ModalFieldSheetProps) => any)(
		sheet.props,
	);
	(cleanup as (() => void) | undefined)?.();
	return tree;
};

describe("ModalTextField", () => {
	beforeEach(() => {
		reactMocks.useEffect.mockReset();
		reactMocks.useEffect.mockImplementation((effect: () => void) =>
			effect(),
		);
		reactMocks.useRef.mockReset();
		reactMocks.useRef.mockReturnValue({ current: null });
		reactMocks.useState.mockReset();
		sheetHost.show.mockReset();
		sheetHost.show.mockReturnValue(7);
		sheetHost.hide.mockClear();
		backHandlerMocks.addEventListener.mockClear();
	});

	it("renders the value in the trigger", () => {
		const tree = ModalTextField({
			label: "Amount",
			value: "12.50",
			onChange: vi.fn(),
			placeholder: "0.00",
		});
		const trigger = findAllByType(tree, "Pressable")[0];
		expect(trigger.props.accessibilityLabel).toBe("Amount: 12.50");
	});

	it("shows the placeholder and compact styling when empty", () => {
		const tree = ModalTextField({
			label: "Amount",
			value: "",
			onChange: vi.fn(),
			placeholder: "0.00",
			isCompact: true,
		});
		expect(
			findAllByType(tree, "Pressable")[0].props.accessibilityLabel,
		).toBe("Amount: 0.00");
		expect(findAllByType(tree, "CustomText")).toHaveLength(1);
	});

	it("hosts the sheet, edits the draft, and commits on submit", () => {
		const onChange = vi.fn();
		const setDraft = vi.fn();
		const tree = ModalTextField({
			label: "Amount",
			value: "1.00",
			onChange,
			placeholder: "0.00",
			keyboardType: "decimal-pad",
		});
		findAllByType(tree, "Pressable")[0].props.onPress();
		expect(sheetHost.show).toHaveBeenCalledTimes(1);

		const sheet = renderSheet("9.99", setDraft);
		const input = findAllByType(sheet, "CustomTextInput")[0];
		expect(input.props.value).toBe("9.99");
		expect(input.props.autoFocus).toBe(true);
		expect(input.props.keyboardType).toBe("decimal-pad");
		input.props.onChangeText("42.00");
		expect(setDraft).toHaveBeenCalledWith("42.00");
		input.props.onSubmitEditing();
		expect(onChange).toHaveBeenCalledWith("9.99");
		expect(sheetHost.hide).toHaveBeenCalledTimes(1);
	});

	it("commits the draft when the overlay is pressed", () => {
		const onChange = vi.fn();
		const tree = ModalTextField({
			label: "Reason",
			value: "",
			onChange,
		});
		findAllByType(tree, "Pressable")[0].props.onPress();
		const sheet = renderSheet("5");
		findAllByType(sheet, "Pressable")[0].props.onPress();
		expect(onChange).toHaveBeenCalledWith("5");
		expect(sheetHost.hide).toHaveBeenCalledTimes(1);
	});

	it("commits the draft on hardware back", () => {
		const onChange = vi.fn();
		const tree = ModalTextField({
			label: "Reason",
			value: "",
			onChange,
		});
		findAllByType(tree, "Pressable")[0].props.onPress();
		renderSheet("back-value");
		const onBack = backHandlerMocks.addEventListener.mock.calls[0]?.[1];
		expect(onBack?.()).toBe(true);
		expect(onChange).toHaveBeenCalledWith("back-value");
		expect(sheetHost.hide).toHaveBeenCalledTimes(1);
	});

	it("clears the draft and commits via the sheet header actions", () => {
		const setDraft = vi.fn();
		const onChange = vi.fn();
		const tree = ModalTextField({
			label: "Reason",
			value: "abc",
			onChange,
		});
		findAllByType(tree, "Pressable")[0].props.onPress();
		const sheet = renderSheet("abc", setDraft);
		const buttons = findAllByType(sheet, "HeaderIconButton");
		expect(buttons).toHaveLength(2);
		buttons[0].props.onPress();
		expect(setDraft).toHaveBeenCalledWith("");
		expect(onChange).not.toHaveBeenCalled();
		buttons[1].props.onPress();
		expect(onChange).toHaveBeenCalledWith("abc");
		expect(sheetHost.hide).toHaveBeenCalledTimes(1);
	});

	it("pads the sheet above the keyboard on iOS", () => {
		const tree = ModalTextField({
			label: "Amount",
			value: "",
			onChange: vi.fn(),
		});
		findAllByType(tree, "Pressable")[0].props.onPress();
		(Platform as { OS: string }).OS = "ios";
		const sheet = renderSheet();
		expect(
			findAllByType(sheet, "KeyboardAvoidingView")[0].props.behavior,
		).toBe("padding");
		(Platform as { OS: string }).OS = "android";
	});

	it("ignores presses when disabled", () => {
		const tree = ModalTextField({
			label: "Amount",
			value: "7.50",
			onChange: vi.fn(),
			isDisabled: true,
		});
		const trigger = findAllByType(tree, "Pressable")[0];
		expect(trigger.props.disabled).toBe(true);
		expect(trigger.props.accessibilityState).toEqual({ disabled: true });
		expect(sheetHost.show).not.toHaveBeenCalled();
	});

	it("hides the sheet when the field unmounts", () => {
		reactMocks.useEffect.mockImplementation(() => undefined);
		const tree = ModalTextField({
			label: "Amount",
			value: "",
			onChange: vi.fn(),
		});
		const effect = reactMocks.useEffect.mock.calls[0]?.[0] as () => unknown;
		const cleanup = effect() as () => void;
		cleanup();
		expect(sheetHost.hide).toHaveBeenCalledTimes(1);
		expect(findAllByType(tree, "Pressable")).toHaveLength(1);
	});
});
