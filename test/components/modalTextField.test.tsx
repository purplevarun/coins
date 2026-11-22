import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useState: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useState: reactMocks.useState,
	};
});

vi.mock("react-native", () => ({
	KeyboardAvoidingView: "KeyboardAvoidingView",
	Modal: "Modal",
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

const mockStates = (...states: [unknown, unknown][]): void => {
	states.forEach(([value, setter]) =>
		reactMocks.useState.mockImplementationOnce(() => [value, setter]),
	);
};

describe("ModalTextField", () => {
	beforeEach(() => {
		reactMocks.useState.mockReset();
	});

	it("renders the value in the trigger and hides the modal when closed", () => {
		mockStates([false, vi.fn()], ["", vi.fn()]);
		const tree = ModalTextField({
			label: "Amount",
			value: "12.50",
			onChange: vi.fn(),
			placeholder: "0.00",
		});
		const trigger = findAllByType(tree, "Pressable")[0];
		expect(trigger.props.accessibilityLabel).toBe("Amount: 12.50");
		expect(findAllByType(tree, "Modal")[0].props.visible).toBe(false);
	});

	it("shows the placeholder and compact styling when empty", () => {
		mockStates([false, vi.fn()], ["", vi.fn()]);
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
		expect(findAllByType(tree, "CustomText")).toHaveLength(2);
	});

	it("opens the modal, edits the draft, and commits on submit", () => {
		const setOpen = vi.fn();
		const setDraft = vi.fn();
		const onChange = vi.fn();
		mockStates([true, setOpen], ["9.99", setDraft]);
		const tree = ModalTextField({
			label: "Amount",
			value: "1.00",
			onChange,
			placeholder: "0.00",
			keyboardType: "decimal-pad",
		});
		const input = findAllByType(tree, "CustomTextInput")[0];
		expect(input.props.value).toBe("9.99");
		expect(input.props.autoFocus).toBe(true);
		expect(input.props.keyboardType).toBe("decimal-pad");
		input.props.onChangeText("42.00");
		expect(setDraft).toHaveBeenCalledWith("42.00");
		input.props.onSubmitEditing();
		expect(onChange).toHaveBeenCalledWith("9.99");
		expect(setOpen).toHaveBeenCalledWith(false);
	});

	it("commits when the overlay or request-close dismisses the modal", () => {
		const setOpen = vi.fn();
		const onChange = vi.fn();
		mockStates([true, setOpen], ["5", vi.fn()]);
		const tree = ModalTextField({
			label: "Reason",
			value: "",
			onChange,
		});
		const presses = findAllByType(tree, "Pressable");
		presses[1].props.onPress();
		expect(onChange).toHaveBeenCalledWith("5");
		expect(setOpen).toHaveBeenCalledWith(false);
		onChange.mockClear();
		findAllByType(tree, "Modal")[0].props.onRequestClose();
		expect(onChange).toHaveBeenCalledWith("5");
	});

	it("clears the draft and commits via the sheet header actions", () => {
		const setOpen = vi.fn();
		const setDraft = vi.fn();
		const onChange = vi.fn();
		mockStates([true, setOpen], ["abc", setDraft]);
		const tree = ModalTextField({
			label: "Reason",
			value: "abc",
			onChange,
		});
		const buttons = findAllByType(tree, "HeaderIconButton");
		expect(buttons).toHaveLength(2);
		buttons[0].props.onPress();
		expect(setDraft).toHaveBeenCalledWith("");
		expect(onChange).not.toHaveBeenCalled();
		buttons[1].props.onPress();
		expect(onChange).toHaveBeenCalledWith("abc");
		expect(setOpen).toHaveBeenCalledWith(false);
	});

	it("pads the sheet above the keyboard on iOS", () => {
		const setOpen = vi.fn();
		mockStates([true, setOpen], ["", vi.fn()]);
		(Platform as { OS: string }).OS = "ios";
		const tree = ModalTextField({
			label: "Amount",
			value: "",
			onChange: vi.fn(),
		});
		expect(
			findAllByType(tree, "KeyboardAvoidingView")[0].props.behavior,
		).toBe("padding");
		(Platform as { OS: string }).OS = "android";
	});

	it("seeds the draft on open and ignores presses when disabled", () => {
		const setOpen = vi.fn();
		const setDraft = vi.fn();
		mockStates([false, setOpen], ["", setDraft]);
		const tree = ModalTextField({
			label: "Amount",
			value: "7.50",
			onChange: vi.fn(),
			isDisabled: true,
		});
		const trigger = findAllByType(tree, "Pressable")[0];
		expect(trigger.props.disabled).toBe(true);
		trigger.props.onPress();
		expect(setDraft).toHaveBeenCalledWith("7.50");
		expect(setOpen).toHaveBeenCalledWith(true);
	});
});
