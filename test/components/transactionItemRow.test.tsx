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

	it("hides the heading and remove button for a single item", () => {
		const tree = render({ count: 1 });
		expect(
			findAllByType(tree, "CustomText").filter(
				(node) => node.props.children === "Item 1 of 1",
			),
		).toHaveLength(0);
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
});
