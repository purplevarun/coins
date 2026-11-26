import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
	StyleSheet: { create: (styles: unknown) => styles },
	View: "View",
}));

vi.mock("@/components/CustomText", () => ({ default: "CustomText" }));
vi.mock("@/components/HeaderIconButton", () => ({
	default: "HeaderIconButton",
}));
vi.mock("@/components/ModalTextField", () => ({ default: "ModalTextField" }));
vi.mock("@/components/SelectField", () => ({ default: "SelectField" }));

import TransactionItemRow from "@/components/TransactionItemRow";

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

const OPTIONS = [
	{ label: "Food", value: "c1" },
	{ label: "Fuel", value: "c2" },
];

const render = (overrides: Record<string, unknown> = {}): any =>
	TransactionItemRow({
		item: { key: "k1", amount: "10", categoryId: "c1" },
		position: 0,
		count: 2,
		entityLabel: "Category",
		entityOptions: OPTIONS,
		entityPlaceholder: "Select",
		entityValue: "c1",
		onAmountChange: vi.fn(),
		onEntityChange: vi.fn(),
		onRemove: vi.fn(),
		...overrides,
	});

describe("TransactionItemRow", () => {
	it("shows the item position heading and remove button for multiple items", () => {
		const tree = render();
		expect(
			findAllByType(tree, "CustomText").some(
				(node) => node.props.children === "Item 1 of 2",
			),
		).toBe(true);
		expect(
			findAllByType(tree, "HeaderIconButton")[0].props.accessibilityLabel,
		).toBe("Remove item 1");
	});

	it("shows the heading but hides the remove button for a single item", () => {
		const tree = render({ count: 1 });
		expect(
			findAllByType(tree, "CustomText").some(
				(node) => node.props.children === "Item 1 of 1",
			),
		).toBe(true);
		expect(findAllByType(tree, "HeaderIconButton")).toHaveLength(0);
	});

	it("wires amount and entity changes to the callbacks", () => {
		const onAmountChange = vi.fn();
		const onEntityChange = vi.fn();
		const onRemove = vi.fn();
		const tree = render({
			currencyCode: "INR",
			isDisabled: true,
			onAmountChange,
			onEntityChange,
			onRemove,
		});
		const amount = findAllByType(tree, "ModalTextField")[0];
		expect(amount.props.label).toBe("Amount (INR)");
		expect(amount.props.isDisabled).toBe(true);
		amount.props.onChange("42");
		expect(onAmountChange).toHaveBeenCalledWith("42");
		const entity = findAllByType(tree, "SelectField")[0];
		expect(entity.props.value).toBe("c1");
		expect(entity.props.options).toEqual(OPTIONS);
		entity.props.onChange("c2");
		expect(onEntityChange).toHaveBeenCalledWith("c2");
		findAllByType(tree, "HeaderIconButton")[0].props.onPress();
		expect(onRemove).toHaveBeenCalledOnce();
	});

	it("renders an empty entity selection for a missing value", () => {
		const tree = render({ entityValue: null });
		const entity = findAllByType(tree, "SelectField")[0];
		expect(entity.props.value).toBe("");
		expect(entity.props.options).toEqual(OPTIONS);
	});

	it("keeps an unlisted item entity selectable with its label", () => {
		const tree = render({
			entityValue: "archived",
		});
		const entity = findAllByType(tree, "SelectField")[0];
		expect(entity.props.options[0]).toEqual({
			value: "archived",
			label: "Category",
		});
		expect(entity.props.options).toHaveLength(OPTIONS.length + 1);
	});

	it("uses the stored entity name for an unlisted item entity", () => {
		const tree = render({
			entityValue: "archived",
			entityName: "Old category",
		});
		expect(findAllByType(tree, "SelectField")[0].props.options[0]).toEqual({
			value: "archived",
			label: "Old category",
		});
	});

	it("keeps an unlisted item source selectable with its label", () => {
		const sourceChange = vi.fn();
		const tree = render({
			onSourceChange: sourceChange,
			sourceLabel: "Source",
			sourceOptions: OPTIONS,
			sourceValue: "ghost",
			sourceName: "Old bank",
		});
		const source = findAllByType(tree, "SelectField").find(
			(node) => node.props.label === "Source",
		);
		expect(source.props.options[0]).toEqual({
			value: "ghost",
			label: "Old bank",
		});
		source.props.onChange("c2");
		expect(sourceChange).toHaveBeenCalledWith("c2");
	});

	it("renders the to-amount field with currency and disables it", () => {
		const tree = render({
			onToAmountChange: vi.fn(),
			toCurrencyCode: "USD",
			isToAmountDisabled: true,
			item: {
				key: "k1",
				amount: "10",
				categoryId: "c1",
				toAmount: "8",
			},
		});
		const toAmount = findAllByType(tree, "ModalTextField").find(
			(node) => node.props.label === "To amount (USD)",
		);
		expect(toAmount.props.isDisabled).toBe(true);
		expect(toAmount.props.value).toBe("8");
	});

	it("renders to-amount fallbacks and forwards changes", () => {
		const onToAmountChange = vi.fn();
		const tree = render({ onToAmountChange, isDisabled: true });
		const toAmount = findAllByType(tree, "ModalTextField").find(
			(node) => node.props.label === "To amount",
		);
		expect(toAmount.props.isDisabled).toBe(true);
		expect(toAmount.props.value).toBe("");
		toAmount.props.onChange("9");
		expect(onToAmountChange).toHaveBeenCalledWith("9");
	});

	it("renders source field fallbacks for an unlisted source", () => {
		const tree = render({
			onSourceChange: vi.fn(),
			sourceOptions: OPTIONS,
			sourceValue: "ghost",
		});
		const source = findAllByType(tree, "SelectField").find(
			(node) => node.props.label === "Source",
		);
		expect(source.props.placeholder).toBe("Select source");
		expect(source.props.options[0]).toEqual({
			value: "ghost",
			label: "Source",
		});
		expect(source.props.options).toHaveLength(OPTIONS.length + 1);
	});

	it("uses the source label for an unlisted source without a name", () => {
		const tree = render({
			onSourceChange: vi.fn(),
			sourceLabel: "Paid from",
			sourceOptions: OPTIONS,
			sourceValue: "ghost",
		});
		const source = findAllByType(tree, "SelectField").find(
			(node) => node.props.label === "Paid from",
		);
		expect(source.props.options[0]).toEqual({
			value: "ghost",
			label: "Paid from",
		});
	});

	it("renders plain source options for listed or missing values", () => {
		const listed = render({
			onSourceChange: vi.fn(),
			sourceOptions: OPTIONS,
			sourceValue: "c1",
		});
		const listedSource = findAllByType(listed, "SelectField").find(
			(node) => node.props.label === "Source",
		);
		expect(listedSource.props.options).toEqual(OPTIONS);

		const missing = render({ onSourceChange: vi.fn() });
		const missingSource = findAllByType(missing, "SelectField").find(
			(node) => node.props.label === "Source",
		);
		expect(missingSource.props.options).toEqual([]);
		expect(missingSource.props.value).toBe("");

		const noOptions = render({
			onSourceChange: vi.fn(),
			sourceValue: "ghost",
		});
		const noOptionsSource = findAllByType(noOptions, "SelectField").find(
			(node) => node.props.label === "Source",
		);
		expect(noOptionsSource.props.options).toEqual([]);
	});
});
