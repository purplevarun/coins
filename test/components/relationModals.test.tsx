import type AppButtonProps from "@/types/AppButtonProps";
import type FormModalProps from "@/types/FormModalProps";
import type PlatformPickerProps from "@/types/PlatformPickerProps";
import type SegmentedControlProps from "@/types/SegmentedControlProps";
import type SelectFieldProps from "@/types/SelectFieldProps";
import type TextFieldProps from "@/types/TextFieldProps";
import { isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useEffect: vi.fn((effect: () => void) => effect()),
	useState: vi.fn(),
}));
const mocks = vi.hoisted(() => ({
	convertCategoryToInvestment: vi.fn(),
	convertInvestmentToCategory: vi.fn(),
	getCategories: vi.fn(),
	getInvestments: vi.fn(),
	getInvestmentTypes: vi.fn(),
	getPlatforms: vi.fn(),
	mergeCategories: vi.fn(),
	showMessage: vi.fn(),
}));
const database = vi.hoisted(() => ({ id: "db" }));
const sheetHost = vi.hoisted(() => ({
	show: vi.fn((_sheet: unknown) => 11),
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
		useState: reactMocks.useState,
	};
});
vi.mock("react-native", () => ({
	BackHandler: backHandlerMocks,
	Pressable: "Pressable",
	ScrollView: "ScrollView",
	StyleSheet: { absoluteFill: {}, create: (styles: unknown) => styles },
	View: "View",
}));
vi.mock("@/components/AppButton", () => ({ default: () => null }));
vi.mock("@/components/CustomText", () => ({ default: () => null }));
vi.mock("@/components/GlassCard", () => ({ default: () => null }));
vi.mock("@/components/Notice", () => ({ default: () => null }));
vi.mock("@/components/PlatformPicker", () => ({ default: () => null }));
vi.mock("@/components/SegmentedControl", () => ({ default: () => null }));
vi.mock("@/components/SelectField", () => ({ default: () => null }));
vi.mock("@/components/TextField", () => ({ default: () => null }));
vi.mock("@/hooks/useDatabaseContext", () => ({
	default: () => ({ database }),
}));
vi.mock("@/hooks/useAppDialog", () => ({
	default: () => ({ showMessage: mocks.showMessage }),
}));
vi.mock("@/hooks/useModalSheet", () => ({
	default: () => sheetHost,
}));
vi.mock("@/services/categoryService", () => ({
	default: {
		getCategories: mocks.getCategories,
		mergeCategories: mocks.mergeCategories,
	},
}));
vi.mock("@/services/investmentService", () => ({
	default: { getInvestments: mocks.getInvestments },
}));
vi.mock("@/services/investmentTypeService", () => ({
	default: { getInvestmentTypes: mocks.getInvestmentTypes },
}));
vi.mock("@/services/platformService", () => ({
	default: { getPlatforms: mocks.getPlatforms },
}));
vi.mock("@/services/relationConversionService", () => ({
	default: {
		convertCategoryToInvestment: mocks.convertCategoryToInvestment,
		convertInvestmentToCategory: mocks.convertInvestmentToCategory,
	},
}));

import CategoryConversionModal from "@/components/CategoryConversionModal";
import CategoryMergeModal from "@/components/CategoryMergeModal";
import FormModal from "@/components/FormModal";
import InvestmentConversionModal from "@/components/InvestmentConversionModal";

const NEW = "__NEW__";

const flush = (): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, 0));

const findAll = <Props,>(
	tree: unknown,
	predicate: (props: Props) => boolean,
	acc: ReactElement<Props>[] = [],
): ReactElement<Props>[] => {
	if (Array.isArray(tree)) {
		tree.forEach((child) => findAll(child, predicate, acc));
	} else if (isValidElement<Props>(tree)) {
		if (predicate(tree.props)) acc.push(tree);
		findAll(Object.values(tree.props as object), predicate, acc);
	}
	return acc;
};

const find = <Props,>(
	tree: unknown,
	predicate: (props: Props) => boolean,
): Props => {
	const [element] = findAll(tree, predicate);
	if (!element) throw new Error("Expected element");
	return element.props;
};

const button = (tree: unknown, label: string): AppButtonProps =>
	find<AppButtonProps>(tree, (props) => props.label === label);
const modal = (tree: unknown): FormModalProps =>
	find<FormModalProps>(tree, (props) => "isVisible" in props);
const select = (tree: unknown, label: string): SelectFieldProps =>
	find<SelectFieldProps>(tree, (props) => props.label === label);
const nameField = (tree: unknown): TextFieldProps[] =>
	findAll<TextFieldProps>(tree, (props) => props.label === "Name").map(
		(element) => element.props,
	);

type Rendered = { tree: ReactElement; setters: Map<number, Mock> };

const render = (
	element: () => ReactElement,
	values: Record<number, unknown> = {},
): Rendered => {
	const setters = new Map<number, Mock>();
	let call = 0;
	reactMocks.useState.mockImplementation((initial: unknown) => {
		call += 1;
		const setter = vi.fn();
		setters.set(call, setter);
		return [call in values ? values[call] : initial, setter];
	});
	return { tree: element(), setters };
};

const callbacks = (): { onClose: Mock; onCompleted: Mock } => ({
	onClose: vi.fn(),
	onCompleted: vi.fn(),
});

describe("relation popups", () => {
	beforeEach(() => {
		Object.values(mocks).forEach((mock) => mock.mockReset());
		reactMocks.useEffect.mockClear();
		sheetHost.show.mockClear();
		sheetHost.hide.mockClear();
		backHandlerMocks.addEventListener.mockClear();
		mocks.getInvestments.mockResolvedValue([{ id: "epf", name: "EPF" }]);
		mocks.getPlatforms.mockResolvedValue([{ id: "p", name: "EPFO" }]);
		mocks.getInvestmentTypes.mockResolvedValue([
			{ id: "t", name: "Retirement" },
		]);
		mocks.getCategories.mockResolvedValue([
			{ id: "pf", name: "PF", kind: "EXPENSE" },
			{ id: "food", name: "Food", kind: "EXPENSE" },
		]);
	});

	it("hosts the shared popup and closes via buttons and hardware back", () => {
		const onClose = vi.fn();
		const onConfirm = vi.fn();
		const popup = FormModal({
			children: "fields",
			confirmLabel: "Go",
			error: "Failed",
			isVisible: true,
			message: "Details",
			onClose,
			onConfirm,
			title: "Popup",
			variant: "danger",
		});
		expect(popup).toBeNull();
		expect(sheetHost.show).toHaveBeenCalledTimes(1);
		const content = sheetHost.show.mock.calls[0]?.[0];
		expect(
			find<{ accent?: string }>(content, (props) => "accent" in props),
		).toMatchObject({ accent: "danger" });
		expect(
			findAll<{ message?: string }>(
				content,
				(props) => props.message === "Failed",
			),
		).toHaveLength(1);
		button(content, "Cancel").onPress();
		button(content, "Go").onPress();
		expect(onClose).toHaveBeenCalledOnce();
		expect(onConfirm).toHaveBeenCalledOnce();
		const onBack = backHandlerMocks.addEventListener.mock.calls[0]?.[1];
		expect(onBack?.()).toBe(true);
		expect(onClose).toHaveBeenCalledTimes(2);

		sheetHost.show.mockClear();
		const hidden = FormModal({
			confirmLabel: "Go",
			isVisible: false,
			message: "Details",
			onClose,
			onConfirm,
			title: "Popup",
		});
		expect(hidden).toBeNull();
		expect(sheetHost.show).not.toHaveBeenCalled();

		FormModal({
			confirmLabel: "Go",
			isVisible: true,
			message: "Details",
			onClose,
			onConfirm,
			title: "Popup",
		});
		const plain = sheetHost.show.mock.calls[0]?.[0];
		expect(
			find<{ accent?: string }>(plain, (props) => "accent" in props),
		).toMatchObject({ accent: "warning" });
		expect(button(plain, "Go")).toMatchObject({
			isLoading: false,
			variant: "primary",
		});
		expect(
			findAll<{ tone?: string }>(
				plain,
				(props) => props.tone === "danger",
			),
		).toHaveLength(0);

		const effect = reactMocks.useEffect.mock.calls[0]?.[0] as () =>
			(() => void) | undefined;
		const cleanup = effect();
		cleanup?.();
		expect(sheetHost.hide).toHaveBeenCalledWith(11);
	});

	describe("category to investment", () => {
		const renderConversion = (
			values?: Record<number, unknown>,
			isVisible = true,
		): Rendered & ReturnType<typeof callbacks> => {
			const handlers = callbacks();
			return {
				...handlers,
				...render(
					() =>
						CategoryConversionModal({
							category: { id: "pf", name: "Employee PF" },
							isVisible,
							...handlers,
						}),
					values,
				),
			};
		};

		it("loads options and resets fields only when opened", async () => {
			renderConversion(undefined, false);
			expect(mocks.getInvestments).not.toHaveBeenCalled();
			const { setters, tree, onClose } = renderConversion();
			await flush();
			expect(setters.get(4)).toHaveBeenCalledWith(NEW);
			expect(setters.get(5)).toHaveBeenCalledWith("Employee PF");
			expect(setters.get(1)).toHaveBeenCalledWith([
				{ id: "epf", name: "EPF" },
			]);
			expect(setters.get(2)).toHaveBeenCalledWith([
				{ id: "p", name: "EPFO" },
			]);
			expect(setters.get(3)).toHaveBeenCalledWith([
				{ id: "t", name: "Retirement" },
			]);
			modal(tree).onClose();
			expect(onClose).toHaveBeenCalledOnce();
			mocks.getPlatforms.mockRejectedValueOnce(new Error("offline"));
			const failed = renderConversion();
			await flush();
			expect(failed.setters.get(9)).toHaveBeenLastCalledWith("offline");
		});

		it("creates a new investment target", async () => {
			mocks.convertCategoryToInvestment.mockResolvedValue("new");
			const { tree, setters, onCompleted } = renderConversion({
				1: [{ id: "epf", name: "EPF" }],
				2: [{ id: "p", name: "EPFO" }],
				3: [{ id: "t", name: "Retirement" }],
				5: "EPF",
				6: "p",
			});
			expect(modal(tree)).toMatchObject({
				confirmLabel: "Convert",
				title: "Convert to investment",
			});
			expect(select(tree, "Target investment").options).toEqual([
				{ label: "New investment", value: NEW },
				{ label: "EPF", value: "epf" },
			]);
			expect(select(tree, "Investment type").options).toEqual([
				{ label: "Retirement", value: "t" },
			]);
			nameField(tree)[0]?.onChangeText("Renamed");
			expect(setters.get(5)).toHaveBeenCalledWith("Renamed");
			const platform = find<PlatformPickerProps>(
				tree,
				(props) => "platforms" in props,
			);
			platform.onValueChange("p2");
			platform.onValueChange(null);
			expect(setters.get(6)).toHaveBeenLastCalledWith("");
			modal(tree).onConfirm();
			await flush();
			expect(mocks.convertCategoryToInvestment).toHaveBeenCalledWith(
				database,
				"pf",
				{
					id: null,
					name: "EPF",
					investmentTypeId: null,
					platformId: "p",
				},
			);
			expect(mocks.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: "Conversion complete" }),
			);
			expect(onCompleted).toHaveBeenCalledOnce();
			expect(setters.get(8)).toHaveBeenLastCalledWith(false);
		});

		it("uses an existing investment and reports failures", async () => {
			mocks.convertCategoryToInvestment.mockRejectedValue(
				new Error("blocked"),
			);
			const { tree, setters, onCompleted } = renderConversion({
				4: "epf",
				7: "t",
			});
			expect(nameField(tree)).toHaveLength(0);
			modal(tree).onConfirm();
			await flush();
			expect(mocks.convertCategoryToInvestment).toHaveBeenCalledWith(
				database,
				"pf",
				{
					id: "epf",
					name: "",
					investmentTypeId: "t",
					platformId: null,
				},
			);
			expect(setters.get(9)).toHaveBeenLastCalledWith("blocked");
			expect(onCompleted).not.toHaveBeenCalled();
			const saving = renderConversion({ 8: true });
			modal(saving.tree).onConfirm();
			expect(mocks.convertCategoryToInvestment).toHaveBeenCalledOnce();
		});
	});

	describe("investment to category", () => {
		const renderConversion = (
			values?: Record<number, unknown>,
			isVisible = true,
		): Rendered & ReturnType<typeof callbacks> => {
			const handlers = callbacks();
			return {
				...handlers,
				...render(
					() =>
						InvestmentConversionModal({
							investment: { id: "nps", name: "NPS" },
							isVisible,
							...handlers,
						}),
					values,
				),
			};
		};

		it("loads category targets only when opened", async () => {
			renderConversion(undefined, false);
			expect(mocks.getCategories).not.toHaveBeenCalled();
			const { setters } = renderConversion();
			await flush();
			expect(setters.get(2)).toHaveBeenCalledWith(NEW);
			expect(setters.get(3)).toHaveBeenCalledWith("NPS");
			expect(setters.get(4)).toHaveBeenCalledWith("EXPENSE");
			expect(mocks.getCategories).toHaveBeenCalledWith(database);
			mocks.getCategories.mockRejectedValueOnce(new Error("locked"));
			const failed = renderConversion();
			await flush();
			expect(failed.setters.get(6)).toHaveBeenLastCalledWith("locked");
		});

		it("creates a new category target", async () => {
			mocks.convertInvestmentToCategory.mockResolvedValue("new");
			const { tree, setters, onCompleted, onClose } = renderConversion({
				1: [{ id: "food", name: "Food", kind: "EXPENSE" }],
				3: "Retirement",
				4: "INCOME",
			});
			expect(select(tree, "Target category").options).toEqual([
				{ label: "New category", value: NEW },
				{
					label: "Food",
					value: "food",
					description: "Expense category",
				},
			]);
			nameField(tree)[0]?.onChangeText("PF");
			find<SegmentedControlProps>(
				tree,
				(props) => props.value === "INCOME",
			).onChange("REFUND");
			expect(setters.get(3)).toHaveBeenCalledWith("PF");
			expect(setters.get(4)).toHaveBeenCalledWith("REFUND");
			modal(tree).onClose();
			expect(onClose).toHaveBeenCalledOnce();
			modal(tree).onConfirm();
			await flush();
			expect(mocks.convertInvestmentToCategory).toHaveBeenCalledWith(
				database,
				"nps",
				{ id: null, name: "Retirement", kind: "INCOME" },
			);
			expect(mocks.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: "Conversion complete" }),
			);
			expect(onCompleted).toHaveBeenCalledOnce();
		});

		it("uses an existing category and reports failures", async () => {
			mocks.convertInvestmentToCategory.mockRejectedValue(
				new Error("missing"),
			);
			const { tree, setters, onCompleted } = renderConversion({
				2: "food",
			});
			expect(nameField(tree)).toHaveLength(0);
			modal(tree).onConfirm();
			await flush();
			expect(mocks.convertInvestmentToCategory).toHaveBeenCalledWith(
				database,
				"nps",
				{ id: "food", name: "", kind: "EXPENSE" },
			);
			expect(setters.get(6)).toHaveBeenLastCalledWith("missing");
			expect(onCompleted).not.toHaveBeenCalled();
			const saving = renderConversion({ 5: true });
			modal(saving.tree).onConfirm();
			expect(mocks.convertInvestmentToCategory).toHaveBeenCalledOnce();
		});
	});

	describe("merge categories", () => {
		const categories = [
			{ id: "pf", name: "PF", kind: "EXPENSE" },
			{ id: "food", name: "Food", kind: "EXPENSE" },
		];
		const renderMerge = (
			values?: Record<number, unknown>,
			isVisible = true,
		): Rendered & ReturnType<typeof callbacks> => {
			const handlers = callbacks();
			return {
				...handlers,
				...render(
					() =>
						CategoryMergeModal({
							isVisible,
							kind: "EXPENSE",
							...handlers,
						}),
					values,
				),
			};
		};

		it("loads same-kind categories only when opened", async () => {
			renderMerge(undefined, false);
			expect(mocks.getCategories).not.toHaveBeenCalled();
			const { setters, tree, onClose } = renderMerge();
			await flush();
			expect(mocks.getCategories).toHaveBeenCalledWith(
				database,
				"EXPENSE",
			);
			expect(setters.get(1)).toHaveBeenCalledWith(categories);
			expect(setters.get(2)).toHaveBeenCalledWith("");
			expect(setters.get(3)).toHaveBeenCalledWith("");
			modal(tree).onClose();
			expect(onClose).toHaveBeenCalledOnce();
			mocks.getCategories.mockRejectedValueOnce(new Error("offline"));
			const failed = renderMerge();
			await flush();
			expect(failed.setters.get(5)).toHaveBeenLastCalledWith("offline");
		});

		it("excludes the merged category from targets and clears a clashing target", () => {
			const { tree, setters } = renderMerge({
				1: categories,
				2: "pf",
				3: "food",
			});
			expect(select(tree, "Merge category").options).toEqual([
				{ label: "PF", value: "pf" },
				{ label: "Food", value: "food" },
			]);
			const target = select(tree, "Into category");
			expect(target.options).toEqual([{ label: "Food", value: "food" }]);
			expect(target.placeholder).toBe("Select category");
			target.onChange("food");
			expect(setters.get(3)).toHaveBeenCalledWith("food");
			const source = select(tree, "Merge category");
			source.onChange("food");
			expect(setters.get(2)).toHaveBeenCalledWith("food");
			expect(setters.get(3)).toHaveBeenLastCalledWith("");
			source.onChange("pf");
			expect(setters.get(3)).toHaveBeenCalledTimes(3);
			const single = renderMerge({ 1: [categories[0]], 2: "pf" });
			expect(select(single.tree, "Into category").placeholder).toBe(
				"No other category of this kind",
			);
		});

		it("merges and reports failures", async () => {
			mocks.mergeCategories.mockResolvedValueOnce(undefined);
			const merged = renderMerge({ 2: "pf", 3: "food" });
			expect(modal(merged.tree)).toMatchObject({
				confirmLabel: "Merge",
				title: "Merge categories",
			});
			modal(merged.tree).onConfirm();
			await flush();
			expect(mocks.mergeCategories).toHaveBeenCalledWith(
				database,
				"pf",
				"food",
			);
			expect(mocks.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ title: "Categories merged" }),
			);
			expect(merged.onCompleted).toHaveBeenCalledOnce();
			mocks.mergeCategories.mockRejectedValueOnce(
				new Error("Select a category."),
			);
			const failed = renderMerge();
			modal(failed.tree).onConfirm();
			await flush();
			expect(failed.setters.get(5)).toHaveBeenLastCalledWith(
				"Select a category.",
			);
			expect(failed.onCompleted).not.toHaveBeenCalled();
			const saving = renderMerge({ 4: true });
			modal(saving.tree).onConfirm();
			expect(mocks.mergeCategories).toHaveBeenCalledTimes(2);
		});
	});
});
