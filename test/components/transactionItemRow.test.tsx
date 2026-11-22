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
		categoryOptions: OPTIONS,
		onAmountChange: vi.fn(),
		onCategoryChange: vi.fn(),
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

	it("hides the heading and remove button for a single item", () => {
		const tree = render({ count: 1 });
		expect(
			findAllByType(tree, "CustomText").filter(
				(node) => node.props.children === "Item 1 of 1",
			),
		).toHaveLength(0);
		expect(findAllByType(tree, "HeaderIconButton")).toHaveLength(0);
	});

	it("wires amount and category changes to the callbacks", () => {
		const onAmountChange = vi.fn();
		const onCategoryChange = vi.fn();
		const onRemove = vi.fn();
		const tree = render({
			currencyCode: "INR",
			isDisabled: true,
			onAmountChange,
			onCategoryChange,
			onRemove,
		});
		const amount = findAllByType(tree, "ModalTextField")[0];
		expect(amount.props.label).toBe("Amount (INR)");
		expect(amount.props.isDisabled).toBe(true);
		amount.props.onChange("42");
		expect(onAmountChange).toHaveBeenCalledWith("42");
		const category = findAllByType(tree, "SelectField")[0];
		expect(category.props.value).toBe("c1");
		expect(category.props.options).toEqual(OPTIONS);
		category.props.onChange("c2");
		expect(onCategoryChange).toHaveBeenCalledWith("c2");
		findAllByType(tree, "HeaderIconButton")[0].props.onPress();
		expect(onRemove).toHaveBeenCalledOnce();
	});

	it("keeps an unlisted item category selectable with its name", () => {
		const tree = render({
			item: { key: "k1", amount: "10", categoryId: "archived" },
		});
		const category = findAllByType(tree, "SelectField")[0];
		expect(category.props.options[0]).toEqual({
			value: "archived",
			label: "Category",
		});
		expect(category.props.options).toHaveLength(OPTIONS.length + 1);
	});

	it("uses the stored category name for an unlisted item category", () => {
		const tree = render({
			item: {
				key: "k1",
				amount: "10",
				categoryId: "archived",
				categoryName: "Old category",
			},
		});
		expect(findAllByType(tree, "SelectField")[0].props.options[0]).toEqual({
			value: "archived",
			label: "Old category",
		});
	});
});
