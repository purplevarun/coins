import type AppButtonProps from "@/types/AppButtonProps";
import type NoticeProps from "@/types/NoticeProps";
import type SelectFieldProps from "@/types/SelectFieldProps";
import { isValidElement, type ReactElement } from "react";
import type { TextProps } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useEffect: vi.fn(),
	useMemo: vi.fn((factory: () => unknown) => factory()),
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
		useMemo: reactMocks.useMemo,
		useRef: reactMocks.useRef,
		useState: reactMocks.useState,
	};
});

vi.mock("react-native", () => ({
	ActivityIndicator: "ActivityIndicator",
	BackHandler: backHandlerMocks,
	Pressable: "Pressable",
	ScrollView: "ScrollView",
	StyleSheet: {
		create: (styles: unknown) => styles,
	},
	View: "View",
}));

vi.mock("@expo/vector-icons/Ionicons", () => ({
	default: "Ionicons",
}));

vi.mock("@/components/CustomText", () => ({
	default: "CustomText",
}));

vi.mock("@/components/CustomTextInput", () => ({
	default: "CustomTextInput",
}));

vi.mock("@/hooks/useModalSheet", () => ({ default: () => sheetHost }));

import AppButton from "@/components/AppButton";
import PlatformPicker from "@/components/PlatformPicker";
import SegmentedControl from "@/components/SegmentedControl";
import SelectField from "@/components/SelectField";
import SimpleEntityForm from "@/components/SimpleEntityForm";
import TextField from "@/components/TextField";
import COLORS from "@/constants/colors";

const findElement = <Props,>(
	tree: unknown,
	predicate: (props: Props) => boolean,
): ReactElement<Props> => {
	const visit = (node: unknown): ReactElement<Props> | undefined => {
		if (Array.isArray(node)) {
			for (const child of node) {
				const found = visit(child);
				if (found) return found;
			}
		} else if (isValidElement<Props>(node)) {
			if (predicate(node.props)) return node;
			return visit(Object.values(node.props as object));
		}
		return undefined;
	};
	const found = visit(tree);
	if (!found) throw new Error("Expected form element");
	return found;
};

const findAllByType = (node: any, type: string, acc: any[] = []): any[] => {
	if (!node) return acc;
	if (Array.isArray(node)) {
		node.forEach((child) => findAllByType(child, type, acc));
		return acc;
	}
	if (node.type === type) {
		acc.push(node);
	}
	if (node.props) {
		Object.values(node.props).forEach((value) =>
			findAllByType(value, type, acc),
		);
	}
	return acc;
};

const renderSelectSheet = (search = ""): any => {
	const calls = sheetHost.show.mock.calls;
	const sheet = calls[calls.length - 1]?.[0] as ReactElement<any>;
	reactMocks.useState.mockImplementationOnce(() => [search, vi.fn()]);
	let cleanup: unknown;
	reactMocks.useEffect.mockImplementationOnce((effect: () => unknown) => {
		cleanup = effect();
	});
	const tree = (sheet.type as (props: any) => any)(sheet.props);
	(cleanup as (() => void) | undefined)?.();
	return tree;
};

const findPressableByText = (node: any, text: string): any => {
	const pressables = findAllByType(node, "Pressable");
	const matches = pressables
		.filter((pressable) => typeof pressable?.props?.onPress === "function")
		.map((pressable) => {
			const labels = findAllByType(pressable, "CustomText").map(
				(textNode) => textNode?.props?.children,
			);
			return {
				pressable,
				labels,
				labelCount: labels.length,
			};
		})
		.filter((entry) => entry.labels.includes(text))
		.sort((a, b) => a.labelCount - b.labelCount);

	return matches[0]?.pressable;
};

describe("form components", () => {
	it.each([true, false])(
		"does not submit a relation twice while saving=%s",
		async (saving) => {
			reactMocks.useState
				.mockReturnValueOnce(["Name", vi.fn()])
				.mockReturnValueOnce([saving, vi.fn()])
				.mockReturnValueOnce(["", vi.fn()]);
			const onSave = vi.fn().mockResolvedValue(undefined);
			findElement<AppButtonProps>(
				SimpleEntityForm({ onSave }),
				(props) => props.label === "Save",
			).props.onPress();
			expect(onSave).toHaveBeenCalledTimes(saving ? 0 : 1);
		},
	);

	it("keeps the selected archived platform while hiding other archived platforms", () => {
		const platform = {
			id: "selected",
			name: "Broker",
			archived: 1,
			createdAt: 1,
			updatedAt: 1,
		};
		const tree = PlatformPicker({
			platforms: [platform, { ...platform, id: "hidden" }],
			value: "selected",
			placeholder: "Choose",
			onValueChange: vi.fn(),
		});
		expect(
			findElement<SelectFieldProps>(
				tree,
				(props) => props.label === "Platform",
			).props.options,
		).toEqual([{ label: "Broker", value: "selected" }]);
	});
	it("shows relation save failures without clearing the entered name", async () => {
		const setName = vi.fn();
		const setSaving = vi.fn();
		const setError = vi.fn();
		reactMocks.useState
			.mockReturnValueOnce(["Broker", setName])
			.mockReturnValueOnce([false, setSaving])
			.mockReturnValueOnce(["Save failed", setError]);
		const onSave = vi.fn().mockRejectedValue(new Error("Save failed"));
		const tree = SimpleEntityForm({ onSave, initialName: "Broker" });
		expect(reactMocks.useState).toHaveBeenCalledWith("Broker");
		expect(
			findElement<NoticeProps>(
				tree,
				(props) => props.message === "Save failed",
			).props.tone,
		).toBe("danger");
		findElement<AppButtonProps>(
			tree,
			(props) => props.label === "Save",
		).props.onPress();
		await Promise.resolve();
		await Promise.resolve();
		expect(onSave).toHaveBeenCalledWith("Broker");
		expect(setError).toHaveBeenLastCalledWith("Save failed");
		expect(setSaving).toHaveBeenLastCalledWith(false);
		expect(setName).not.toHaveBeenCalled();
	});

	it("connects the platform selector to the SelectField change callback", () => {
		const onValueChange = vi.fn();
		const tree = PlatformPicker({
			platforms: [
				{ id: "platform", name: "Broker", createdAt: 1, updatedAt: 1 },
			],
			onValueChange,
		});
		const field = findElement<SelectFieldProps>(
			tree,
			(props) => props.label === "Platform",
		).props;
		expect(field.value).toBe("");
		expect(field.options).toEqual([{ label: "Broker", value: "platform" }]);
		field.onChange("platform");
		expect(onValueChange).toHaveBeenLastCalledWith("platform");
		field.onChange("");
		expect(onValueChange).toHaveBeenLastCalledWith(null);
	});

	beforeEach(() => {
		reactMocks.useEffect.mockReset();
		reactMocks.useEffect.mockImplementation((effect: () => void) =>
			effect(),
		);
		reactMocks.useState.mockReset();
		reactMocks.useMemo.mockClear();
		reactMocks.useRef.mockReset();
		reactMocks.useRef.mockReturnValue({ current: null });
		sheetHost.show.mockReset();
		sheetHost.show.mockReturnValue(7);
		sheetHost.hide.mockClear();
		backHandlerMocks.addEventListener.mockClear();
	});

	it("covers AppButton variants and loading/disabled/pressed branches", () => {
		const onPress = vi.fn();
		const variants = ["primary", "secondary", "success", "danger"] as const;

		for (const variant of variants) {
			const button = AppButton({
				label: "Save",
				onPress,
				variant,
				icon: "checkmark",
			} as any);
			expect(button.type).toBe("Pressable");
			expect(button.props.style({ pressed: false })[1]).toBe(false);
			expect(button.props.style({ pressed: true })[1]).toBeTruthy();
		}

		const loadingButton = AppButton({
			label: "Save",
			onPress,
			isLoading: true,
			isCompact: true,
			isDisabled: true,
		});
		expect(loadingButton.props.disabled).toBe(true);
		expect(findAllByType(loadingButton, "ActivityIndicator").length).toBe(
			1,
		);
		expect(loadingButton.props.style({ pressed: true })[1]).toBe(false);

		const noIconButton = AppButton({
			label: "No Icon",
			onPress,
			variant: "primary",
		} as any);
		expect(findAllByType(noIconButton, "Ionicons")).toHaveLength(0);
		expect(
			findAllByType(noIconButton, "CustomText")[0]?.props.style,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					flexShrink: 1,
					minWidth: 0,
					textAlign: "center",
				}),
			]),
		);
	});

	it("renders palette swatches and disables theme selection while saving", () => {
		const colors = ["#131817", "#202825", "#76E3B8"];
		const field = SelectField({
			label: "Theme",
			value: "graphite-mint",
			onChange: vi.fn(),
			isSearchable: false,
			isDisabled: true,
			options: [
				{
					label: "Graphite & Mint",
					value: "graphite-mint",
					swatches: colors,
				},
			],
		});
		const trigger = findAllByType(field, "Pressable")[0];
		expect(trigger.props.disabled).toBe(true);
		expect(trigger.props.accessibilityState).toEqual({ disabled: true });
		const findSwatches = (tree: any): any[] =>
			findAllByType(tree, "View").filter(
				(node) =>
					Array.isArray(node.props.style) &&
					colors.includes(node.props.style[1]?.backgroundColor),
			);
		expect(findSwatches(field)).toHaveLength(3);
		trigger.props.onPress();
		expect(findSwatches(renderSelectSheet())).toHaveLength(3);
	});

	it("sizes segmented options to their content and allows complete labels", () => {
		const onChange = vi.fn();
		const segmented = SegmentedControl({
			value: "a",
			onChange,
			options: [
				{ label: "A", value: "a" },
				{ label: "B", value: "b" },
				{ label: "C", value: "c" },
				{ label: "D", value: "d" },
			],
		});

		const pressables = findAllByType(segmented, "Pressable");
		expect(pressables).toHaveLength(4);
		expect(pressables[0]?.props.style[0]).toMatchObject({
			flexBasis: "auto",
			maxWidth: "100%",
		});
		pressables[1]?.props.onPress();
		expect(onChange).toHaveBeenCalledWith("b");
		const labels = findAllByType(
			segmented,
			"CustomText",
		) as ReactElement<TextProps>[];
		for (const label of labels) {
			expect(label.props.numberOfLines).toBe(0);
		}
	});

	it("allows SegmentedControl labels to wrap when requested", () => {
		const segmented = SegmentedControl({
			value: "PENDING_VALIDATION",
			onChange: vi.fn(),
			labelNumberOfLines: 2,
			options: [
				{ label: "All", value: "ALL" },
				{ label: "Validated", value: "VALIDATED" },
				{ label: "Pending Validation", value: "PENDING_VALIDATION" },
			],
		});
		const labels = findAllByType(
			segmented,
			"CustomText",
		) as ReactElement<TextProps>[];
		expect(labels.map((label) => label.props.numberOfLines)).toEqual([
			2, 2, 2,
		]);
		expect(labels[2]?.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ textAlign: "center" }),
			]),
		);
	});

	it("covers TextField secure and non-secure branches", () => {
		const setShowSecret = vi.fn();
		reactMocks.useState.mockImplementationOnce(() => [
			false,
			setShowSecret,
		]);
		const onChangeText = vi.fn();

		const secureField = TextField({
			label: "Password",
			value: "topsecret",
			onChangeText,
			placeholder: "Enter",
			isSecure: true,
			isMultiline: true,
			isEditable: false,
		});

		const secureInput = findAllByType(secureField, "CustomTextInput")[0];
		expect(secureInput.props.secureTextEntry).toBe(true);
		expect(secureInput.props.multiline).toBe(true);
		expect(secureInput.props.editable).toBe(false);

		const eyeButton = findAllByType(secureField, "Pressable")[0];
		eyeButton.props.onPress();
		expect(setShowSecret).toHaveBeenCalledWith(expect.any(Function));
		const toggleSecret = setShowSecret.mock.calls[0]?.[0] as (
			current: boolean,
		) => boolean;
		expect(toggleSecret(false)).toBe(true);
		expect(toggleSecret(true)).toBe(false);
		expect(findAllByType(secureField, "Ionicons")[0]?.props.name).toBe(
			"eye-outline",
		);

		reactMocks.useState.mockImplementationOnce(() => [true, vi.fn()]);
		const revealedField = TextField({
			label: "Password",
			value: "topsecret",
			onChangeText,
			isSecure: true,
		});
		expect(findAllByType(revealedField, "Ionicons")[0]?.props.name).toBe(
			"eye-off-outline",
		);

		reactMocks.useState.mockImplementationOnce(() => [false, vi.fn()]);
		const plainField = TextField({
			label: "Name",
			value: "Alice",
			onChangeText,
			isSecure: false,
			autoFocus: true,
		});
		expect(
			findAllByType(plainField, "CustomTextInput")[0]?.props.autoFocus,
		).toBe(true);
		expect(findAllByType(plainField, "Pressable")).toHaveLength(0);
	});

	it("renders compact choices without a search input and keeps selection behavior", () => {
		const onChange = vi.fn();
		const tree = SelectField({
			label: "Classification",
			value: "GENERAL",
			options: [
				{ label: "General", value: "GENERAL" },
				{ label: "Investment", value: "INVESTMENT" },
			],
			onChange,
			isCompact: true,
			isSearchable: false,
		});
		const trigger = findAllByType(tree, "Pressable")[0];
		expect(tree.props.style[1]).toMatchObject({
			flexBasis: "auto",
			alignSelf: "flex-start",
		});
		for (const style of tree.props.style)
			expect(style).not.toHaveProperty("width");
		expect(trigger.props.accessibilityLabel).toBe(
			"Classification: General",
		);
		expect(trigger.props.style[0]).toMatchObject({
			borderWidth: 1,
			borderColor: COLORS.borderStrong,
		});
		expect(trigger.props.style[1]).not.toHaveProperty("borderWidth");
		expect(trigger.props.style[1]).not.toHaveProperty("backgroundColor");
		trigger.props.onPress();
		const sheet = renderSelectSheet();
		expect(findAllByType(sheet, "CustomTextInput")).toHaveLength(0);
		findPressableByText(sheet, "Investment").props.onPress();
		expect(onChange).toHaveBeenCalledWith("INVESTMENT");
		expect(sheetHost.hide).toHaveBeenCalledTimes(1);
	});

	it("covers SelectSheet select/search/no-result/close branches", () => {
		const onChange = vi.fn();
		const options = [
			{ label: "Cash Wallet", value: "cash", description: "Daily" },
			{ label: "Bank", value: "bank" },
		];
		const field = SelectField({
			label: "Source",
			value: "cash",
			options,
			onChange,
			isOptional: true,
		});
		findAllByType(field, "Pressable")[0].props.onPress();
		expect(sheetHost.show).toHaveBeenCalledTimes(1);

		const noResults = renderSelectSheet("zz");
		expect(
			findAllByType(noResults, "CustomText").map(
				(node) => node.props.children,
			),
		).toContain('No results for "zz"');

		const overlayPressable = findAllByType(noResults, "Pressable").find(
			(node) =>
				node?.props?.style?.backgroundColor === COLORS.overlayStrong,
		);
		expect(overlayPressable).toBeTruthy();
		overlayPressable.props.onPress();
		expect(sheetHost.hide).toHaveBeenCalledTimes(1);

		const onBack = backHandlerMocks.addEventListener.mock.calls[0]?.[1];
		expect(onBack?.()).toBe(true);
		expect(sheetHost.hide).toHaveBeenCalledTimes(2);

		const noneOption = findPressableByText(noResults, "None");
		expect(noneOption).toBeTruthy();
		noneOption.props.onPress();
		expect(onChange).toHaveBeenCalledWith("");
		expect(sheetHost.hide).toHaveBeenCalledTimes(3);

		const emptyOptionsField = SelectField({
			label: "Platform",
			value: "",
			options: [],
			onChange,
		});
		findAllByType(emptyOptionsField, "Pressable")[0].props.onPress();
		const openEmpty = renderSelectSheet();
		expect(
			findAllByType(openEmpty, "CustomText").map(
				(node) => node.props.children,
			),
		).toContain("Nothing to select yet.");

		findAllByType(field, "Pressable")[0].props.onPress();
		const openMatch = renderSelectSheet("cash");
		const cashOption = findPressableByText(openMatch, "Cash Wallet");
		expect(cashOption).toBeTruthy();
		cashOption.props.onPress();
		expect(onChange).toHaveBeenCalledWith("cash");
	});

	it("auto-focuses the search input only when searchable", () => {
		const searchable = SelectField({
			label: "Category",
			value: "",
			options: [{ label: "Food", value: "c1" }],
			onChange: vi.fn(),
		});
		findAllByType(searchable, "Pressable")[0].props.onPress();
		const searchableSheet = renderSelectSheet();
		const searchInput = findAllByType(
			searchableSheet,
			"CustomTextInput",
		)[0];
		expect(searchInput.props.autoFocus).toBe(true);

		sheetHost.show.mockClear();
		const plain = SelectField({
			label: "Type",
			value: "",
			options: [{ label: "One", value: "o1" }],
			onChange: vi.fn(),
			isSearchable: false,
		});
		findAllByType(plain, "Pressable")[0].props.onPress();
		const plainSheet = renderSelectSheet();
		expect(findAllByType(plainSheet, "CustomTextInput")).toHaveLength(0);
	});

	it("hides the hosted sheet when the field unmounts", () => {
		reactMocks.useEffect.mockImplementation(() => undefined);
		SelectField({
			label: "Source",
			value: "cash",
			options: [{ label: "Cash", value: "cash" }],
			onChange: vi.fn(),
		});
		const effect = reactMocks.useEffect.mock.calls[0]?.[0] as () => unknown;
		const cleanup = effect() as () => void;
		cleanup();
		expect(sheetHost.hide).toHaveBeenCalledTimes(1);
	});
});
