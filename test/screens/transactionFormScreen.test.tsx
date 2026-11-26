import AppButton from "@/components/AppButton";
import DateField from "@/components/DateField";
import HeaderIconButton from "@/components/HeaderIconButton";
import ModalTextField from "@/components/ModalTextField";
import ScreenContainer from "@/components/ScreenContainer";
import SelectField from "@/components/SelectField";
import TransactionItemRow from "@/components/TransactionItemRow";
import type TransactionItemDraft from "@/types/TransactionItemDraft";
import type TransactionFormHarness from "@test/types/TransactionFormHarness";
import { isValidElement, type ComponentProps, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useEffect: vi.fn(),
	useLayoutEffect: vi.fn(),
	useState: vi.fn(),
	useRef: vi.fn(() => ({ current: false })),
}));

const serviceMocks = vi.hoisted(() => ({
	getCategories: vi.fn(),
	getInvestments: vi.fn(),
	getDefaultSourceId: vi.fn(),
	getDefaultTripId: vi.fn(),
	getSources: vi.fn(),
	deleteTransaction: vi.fn(),
	getTransaction: vi.fn(),
	saveTransaction: vi.fn(),
	getTrips: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
	refreshData: vi.fn(),
	confirm: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useEffect: reactMocks.useEffect,
		useLayoutEffect: reactMocks.useLayoutEffect,
		useState: reactMocks.useState,
		useRef: reactMocks.useRef,
	};
});

vi.mock("react-native", () => ({
	ScrollView: (props: any) => ({ type: "ScrollView", props }),
	StyleSheet: { create: (styles: any) => styles },
	Switch: "Switch",
	View: (props: any) => ({ type: "View", props }),
}));

vi.mock("@/components/AppButton", () => ({
	default: (props: any) => ({ type: "AppButton", props }),
}));
vi.mock("@/components/CustomText", () => ({
	default: (props: any) => ({ type: "CustomText", props }),
}));
vi.mock("@/components/DateField", () => ({
	default: (props: any) => ({ type: "DateField", props }),
}));
vi.mock("@/components/GlassCard", () => ({
	default: (props: any) => ({ type: "GlassCard", props }),
}));

vi.mock("@/components/HeaderIconButton", () => ({
	default: (props: unknown) => ({ type: "HeaderIconButton", props }),
}));
vi.mock("@/utils/id", () => {
	let nextId = 0;
	return { default: () => `draft-${nextId++}` };
});
vi.mock("@/components/Notice", () => ({
	default: (props: any) => ({ type: "Notice", props }),
}));
vi.mock("@/components/ScreenContainer", () => ({
	default: (props: any) => ({ type: "ScreenContainer", props }),
}));
vi.mock("@/components/SelectField", () => ({
	default: (props: any) => ({ type: "SelectField", props }),
}));
vi.mock("@/components/ModalTextField", () => ({
	default: (props: any) => ({ type: "ModalTextField", props }),
}));
vi.mock("@/components/TransactionItemRow", () => ({
	default: (props: any) => ({ type: "TransactionItemRow", props }),
}));

vi.mock("@/hooks/useAppDialog", () => ({
	default: () => ({ confirm: hookMocks.confirm }),
}));
vi.mock("@/hooks/useDatabaseContext", () => ({
	default: () => ({
		database: { id: "db" },
		refreshData: hookMocks.refreshData,
	}),
}));

vi.mock("@/services/categoryService", () => ({
	default: { getCategories: serviceMocks.getCategories },
}));
vi.mock("@/services/investmentService", () => ({
	default: { getInvestments: serviceMocks.getInvestments },
}));
vi.mock("@/services/settingsService", () => ({
	default: {
		getDefaultSourceId: serviceMocks.getDefaultSourceId,
		getDefaultTripId: serviceMocks.getDefaultTripId,
	},
}));
vi.mock("@/services/sourceService", () => ({
	default: { getSources: serviceMocks.getSources },
}));
vi.mock("@/services/transactionService", () => ({
	default: {
		deleteTransaction: serviceMocks.deleteTransaction,
		getTransaction: serviceMocks.getTransaction,
		saveTransaction: serviceMocks.saveTransaction,
	},
}));
vi.mock("@/services/tripService", () => ({
	default: { getTrips: serviceMocks.getTrips },
}));

vi.mock("@/utils/error", () => ({
	default: (caughtError: unknown) =>
		caughtError instanceof Error ? caughtError.message : "Unknown error",
}));

import TransactionFormScreen from "@/screens/TransactionFormScreen";

const flush = async (): Promise<void> => {
	await Promise.resolve();
	await Promise.resolve();
};

const findByPredicate = (
	node: any,
	predicate: (candidate: any) => boolean,
	acc: any[] = [],
): any[] => {
	if (!node) return acc;
	if (Array.isArray(node)) {
		node.forEach((child) => findByPredicate(child, predicate, acc));
		return acc;
	}
	if (predicate(node)) acc.push(node);
	if (node.props) {
		Object.values(node.props).forEach((value) =>
			findByPredicate(value, predicate, acc),
		);
	}
	return acc;
};

const formElements = <Props,>(
	tree: ReactElement,
	component: unknown,
): ReactElement<Props>[] =>
	findByPredicate(
		tree,
		(node: unknown) =>
			isValidElement<Props>(node) && node.type === component,
	) as ReactElement<Props>[];

const createFormHarness = (
	overrides: ReadonlyMap<number, unknown> = new Map(),
	params: Record<string, string | undefined> = {},
): TransactionFormHarness => {
	const values = new Map<number, unknown>([
		[3, "s1"],
		[6, 100],
		[7, [{ id: "s1", name: "Bank", currencyCode: "INR", balance: "0" }]],
		[
			8,
			[
				{ id: "food", name: "Food", kind: "EXPENSE", isIncome: false },
				{
					id: "grocery",
					name: "Grocery",
					kind: "EXPENSE",
					isIncome: false,
				},
			],
		],
		...overrides,
	]);
	const navigation = { goBack: vi.fn(), setOptions: vi.fn() };
	const saving = { current: false };
	let stateIndex = 0;
	reactMocks.useRef.mockReturnValue(saving);
	reactMocks.useEffect.mockImplementation(() => undefined);
	reactMocks.useLayoutEffect.mockImplementation((effect: () => void) =>
		effect(),
	);
	reactMocks.useState.mockImplementation((initial: unknown) => {
		const index = ++stateIndex;
		if (!values.has(index))
			values.set(
				index,
				typeof initial === "function"
					? (initial as () => unknown)()
					: initial,
			);
		return [
			values.get(index),
			(value: unknown) =>
				values.set(
					index,
					typeof value === "function"
						? (value as (current: unknown) => unknown)(
								values.get(index),
							)
						: value,
				),
		];
	});
	return {
		values,
		navigation,
		renderHeader: () => {
			const content =
				navigation.setOptions.mock.lastCall?.[0].headerRight() as
					ReactElement | undefined;
			return content
				? (findByPredicate(
						content,
						(node) => node?.type === HeaderIconButton,
					)[0] ?? null)
				: null;
		},
		renderHeaderSwitch: () => {
			const content =
				navigation.setOptions.mock.lastCall?.[0].headerRight() as
					ReactElement | undefined;
			return content
				? findByPredicate(content, (node) => node?.type === "Switch")[0]
				: undefined;
		},
		render: () => {
			stateIndex = 0;
			const renderScreen = TransactionFormScreen as (
				props: unknown,
			) => ReactElement;
			return renderScreen({
				navigation,
				route: { key: "items", name: "TransactionForm", params },
			});
		},
	};
};

describe("TransactionFormScreen", () => {
	it.each([true, false])(
		"shows and saves applicability changes from %s",
		async (isApplicable) => {
			const harness = createFormHarness(
				new Map<number, unknown>([
					[
						13,
						[
							{
								key: "pending",
								amount: "12.50",
								categoryId: "food",
							},
						],
					],
					[14, isApplicable],
				]),
			);
			let tree = harness.render();
			const toggle = harness.renderHeaderSwitch();
			expect(toggle?.props.accessibilityLabel).toBe("Applicable");
			expect(toggle?.props.value).toBe(isApplicable);
			toggle?.props.onValueChange(!isApplicable);
			tree = harness.render();
			formElements<ComponentProps<typeof AppButton>>(tree, AppButton)
				.find((button) => button.props.label === "Save transaction")
				?.props.onPress();
			await flush();
			expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
				{ id: "db" },
				expect.objectContaining({
					isApplicable: !isApplicable,
					amount: "12.5",
				}),
			);
			harness.values.set(11, true);
			harness.render();
			expect(harness.renderHeaderSwitch()?.props.disabled).toBe(true);
		},
	);

	beforeEach(() => {
		reactMocks.useEffect.mockReset();
		reactMocks.useLayoutEffect.mockReset();
		reactMocks.useState.mockReset();
		reactMocks.useRef.mockImplementation(() => ({ current: false }));
		reactMocks.useEffect.mockImplementation((effect: () => void) => {
			effect();
		});
		reactMocks.useState.mockImplementation((initial: any) => [
			typeof initial === "function" ? initial() : initial,
			vi.fn(),
		]);

		Object.values(serviceMocks).forEach((mockFn) => mockFn.mockReset());
		Object.values(hookMocks).forEach((mockFn) => mockFn.mockReset());

		serviceMocks.getSources.mockResolvedValue([
			{ id: "s1", name: "Cash", currencyCode: "INR", balance: "0" },
			{ id: "s2", name: "Bank", currencyCode: "INR", balance: "0" },
		]);
		serviceMocks.getCategories.mockResolvedValue([
			{ id: "c1", name: "Food", kind: "EXPENSE", isIncome: false },
		]);
		serviceMocks.getTrips.mockResolvedValue([{ id: "tr1", name: "Goa" }]);
		serviceMocks.getInvestments.mockResolvedValue([
			{ id: "i1", name: "MF" },
		]);
		serviceMocks.getDefaultSourceId.mockResolvedValue(null);
		serviceMocks.getDefaultTripId.mockResolvedValue("tr1");
		serviceMocks.getTransaction.mockResolvedValue(null);
		serviceMocks.saveTransaction.mockResolvedValue("txSaved");
		serviceMocks.deleteTransaction.mockResolvedValue(undefined);
		hookMocks.confirm.mockImplementation(({ onConfirm }: any) =>
			onConfirm(),
		);
	});

	it.each(["", "c1"])(
		"forwards a credit item category selection of %s",
		async (categoryId) => {
			const harness = createFormHarness(
				new Map<number, unknown>([
					[2, "CREDIT"],
					[13, [{ key: "one", amount: "100", categoryId }]],
				]),
			);
			const tree = harness.render();
			formElements<ComponentProps<typeof AppButton>>(tree, AppButton)
				.find((button) => button.props.label === "Save transaction")
				?.props.onPress();
			await flush();
			expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
				{ id: "db" },
				expect.objectContaining({
					type: "CREDIT",
					categoryId: undefined,
					items: [{ amount: "100", categoryId }],
				}),
			);
		},
	);

	it("clears the trip when a trip-agnostic category is picked", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[2, "CREDIT"],
				[4, "tr1"],
				[
					8,
					[
						{
							id: "c1",
							name: "Fuel",
							kind: "EXPENSE",
							isIncome: false,
							tripAgnostic: true,
						},
						{
							id: "c2",
							name: "Salary",
							kind: "INCOME",
							isIncome: true,
						},
					],
				],
			]),
		);
		const tree = harness.render();
		const itemRow = formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0];
		itemRow?.props.onEntityChange("c1");
		expect(harness.values.get(4)).toBe("");
		harness.values.set(4, "tr1");
		itemRow?.props.onEntityChange("c2");
		expect(harness.values.get(4)).toBe("tr1");
	});

	it("clears the trip when a trip-agnostic item category is picked", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[4, "tr1"],
				[
					8,
					[
						{
							id: "c1",
							name: "Fuel",
							kind: "EXPENSE",
							isIncome: false,
							tripAgnostic: true,
						},
					],
				],
				[13, [{ key: "one", amount: "10", categoryId: "" }]],
			]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0]?.props.onEntityChange("c1");
		expect(harness.values.get(4)).toBe("");
	});

	it("assigns the picked investment on an investment item", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[1, "INVESTMENT"],
				[2, "DEBIT"],
				[10, [{ id: "i1", name: "MF" }]],
				[13, [{ key: "one", amount: "10", investmentId: "" }]],
			]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0]?.props.onEntityChange("i1");
		expect(harness.values.get(13)).toEqual([
			{ key: "one", amount: "10", investmentId: "i1" },
		]);
	});

	it("assigns the picked destination source on a transfer item", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[2, "TRANSFER"],
				[
					7,
					[
						{ id: "s1", name: "Cash", currencyCode: "INR" },
						{ id: "s2", name: "Bank", currencyCode: "INR" },
					],
				],
				[13, [{ key: "one", amount: "10", destinationSourceId: "" }]],
			]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0]?.props.onEntityChange("s2");
		expect(harness.values.get(13)).toEqual([
			{
				key: "one",
				amount: "10",
				destinationSourceId: "s2",
				destinationSourceName: "Bank",
			},
		]);
	});

	it("assigns the picked source on a split item", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[2, "DEBIT"],
				[
					7,
					[
						{ id: "s1", name: "Cash", currencyCode: "INR" },
						{ id: "s2", name: "Bank", currencyCode: "INR" },
					],
				],
				[
					13,
					[
						{
							key: "one",
							amount: "10",
							categoryId: "c1",
							sourceId: "s1",
						},
						{ key: "two", amount: "5", categoryId: "c1" },
					],
				],
			]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[1]?.props.onSourceChange?.("s2");
		expect(harness.values.get(13)).toEqual([
			{
				key: "one",
				amount: "10",
				categoryId: "c1",
				sourceId: "s1",
			},
			{
				key: "two",
				amount: "5",
				categoryId: "c1",
				sourceId: "s2",
				sourceName: "Bank",
			},
		]);
	});

	it("assigns the received amount on a transfer item", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[2, "TRANSFER"],
				[13, [{ key: "one", amount: "10", destinationSourceId: "s2" }]],
			]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0]?.props.onToAmountChange?.("8");
		expect(harness.values.get(13)).toEqual([
			{
				key: "one",
				amount: "10",
				destinationSourceId: "s2",
				toAmount: "8",
			},
		]);
	});

	it("saves a transfer with the item received amount", async () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[1, "GENERAL"],
				[2, "TRANSFER"],
				[3, "s1"],
				[5, "Move"],
				[6, 119],
				[
					7,
					[
						{ id: "s1", name: "Cash", currencyCode: "INR" },
						{ id: "s2", name: "Bank", currencyCode: "INR" },
					],
				],
				[
					13,
					[
						{
							key: "one",
							amount: "100",
							destinationSourceId: "s2",
							toAmount: "8",
						},
					],
				],
			]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof AppButton>>(tree, AppButton)
			.find((button) => button.props.label === "Save transaction")
			?.props.onPress();
		await flush();
		expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
			{ id: "db" },
			expect.objectContaining({
				type: "TRANSFER",
				toAmount: "8",
			}),
		);
	});

	it("clears item entities when switching between itemized classifications", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[1, "GENERAL"],
				[2, "DEBIT"],
				[
					13,
					[
						{
							key: "one",
							id: "stored",
							amount: "10",
							categoryId: "food",
						},
					],
				],
			]),
		);
		const tree = harness.render();
		findByPredicate(
			tree,
			(node) =>
				node?.props?.isSearchable === false &&
				typeof node?.props?.onChange === "function" &&
				Array.isArray(node?.props?.options),
		)[0]?.props?.onChange("INVESTMENT");
		expect(harness.values.get(13)).toEqual([
			{
				key: "one",
				id: "stored",
				amount: "10",
				categoryId: "",
				investmentId: "",
				destinationSourceId: "",
				toAmount: "",
			},
		]);
		expect(harness.values.get(1)).toBe("INVESTMENT");
	});

	it("ignores the pinned category change when no items exist", () => {
		const harness = createFormHarness(new Map<number, unknown>([[13, []]]));
		const tree = harness.render() as ReactElement<
			ComponentProps<typeof ScreenContainer>
		>;
		formElements<ComponentProps<typeof SelectField>>(
			tree.props.header as ReactElement,
			SelectField,
		)
			.find((field) => field.props.label === "Category")
			?.props.onChange("c1");
		expect(harness.values.get(13)).toEqual([]);
	});

	it.each([
		["GENERAL", "DEBIT", "Trip"],
		["GENERAL", "CREDIT", "Trip"],
		["INVESTMENT", "DEBIT", "Investment"],
		["INVESTMENT", "CREDIT", "Investment"],
		["GENERAL", "TRANSFER", "Destination source"],
	])(
		"puts amount first for %s %s with a fixed Save footer",
		(classification, type, detailLabel) => {
			const harness = createFormHarness(
				new Map<number, unknown>([
					[1, classification],
					[2, type],
				]),
			);
			const tree = harness.render() as ReactElement<
				ComponentProps<typeof ScreenContainer>
			>;
			const itemRows = formElements<
				ComponentProps<typeof TransactionItemRow>
			>(tree.props.children as ReactElement, TransactionItemRow);
			const textFields = findByPredicate(
				tree.props.children,
				(node) => node?.type === ModalTextField,
			);
			if (itemRows.length > 0) {
				expect(itemRows[0]?.props).toMatchObject({
					position: 0,
					count: 1,
				});
			} else {
				expect(textFields[0]?.props.keyboardType).toBe("decimal-pad");
			}
			const headerFields = formElements<
				ComponentProps<typeof SelectField>
			>(tree.props.header as ReactElement, SelectField);
			if (classification === "INVESTMENT") {
				expect(itemRows[0]?.props.entityLabel).toBe("Investment");
				expect(
					headerFields.every(
						(field) => field.props.label !== "Investment",
					),
				).toBe(true);
			} else if (type === "TRANSFER") {
				expect(itemRows[0]?.props.entityLabel).toBe(
					"Destination source",
				);
				expect(
					headerFields.every(
						(field) => field.props.label !== "Destination source",
					),
				).toBe(true);
			} else {
				expect(
					headerFields.some(
						(field) => field.props.label === detailLabel,
					),
				).toBe(true);
			}
			expect(
				formElements(
					tree.props.children as ReactElement,
					AppButton,
				).some(
					(button) =>
						(button.props as ComponentProps<typeof AppButton>)
							.label === "Save transaction",
				),
			).toBe(false);
			expect(
				formElements<ComponentProps<typeof AppButton>>(
					tree.props.footer as ReactElement,
					AppButton,
				).map((button) => button.props.label),
			).toEqual(["Save transaction"]);
			expect(
				formElements<ComponentProps<typeof SelectField>>(
					tree,
					SelectField,
				).filter(
					(field) =>
						field.props.isCompact &&
						field.props.isSearchable === false,
				),
			).toHaveLength(2);
			expect(harness.renderHeader()?.props.accessibilityLabel).toBe(
				"Add item",
			);
		},
	);

	it.each([
		{},
		{ transactionId: "payment" },
		{ cloneFromTransactionId: "payment" },
	])(
		"keeps the title out of the form and separates its mode pickers: %j",
		(params) => {
			const tree = createFormHarness(
				new Map(),
				params,
			).render() as ReactElement<ComponentProps<typeof ScreenContainer>>;
			const titles = [
				"New transaction",
				"Edit transaction",
				"Clone transaction",
			];
			expect(
				findByPredicate(tree, (node) =>
					titles.includes(node?.props?.children),
				),
			).toHaveLength(0);
			const modes = formElements<ComponentProps<typeof SelectField>>(
				tree,
				SelectField,
			).filter((field) => field.props.isSearchable === false);
			const defaults = [
				...formElements<ComponentProps<typeof SelectField>>(
					tree,
					SelectField,
				).filter((field) => field.props.isCompact),
				...formElements<ComponentProps<typeof DateField>>(
					tree,
					DateField,
				).filter((field) => field.props.isCompact),
			];
			const header = tree.props.header as ReactElement;
			const rows = findByPredicate(
				header,
				(node) =>
					node?.props?.style?.flexDirection === "row" &&
					node?.props?.style?.gap === 8 &&
					node?.props?.style?.borderWidth === undefined,
			);
			expect(modes).toHaveLength(2);
			expect(defaults).toHaveLength(4);
			expect(
				defaults.every(
					(field) =>
						findByPredicate(header, (node) => node === field)
							.length > 0,
				),
			).toBe(true);
			expect(rows).toHaveLength(3);
			expect(
				rows.every(
					(row) =>
						Array.isArray(row.props.children) &&
						row.props.children.length === 2,
				),
			).toBe(true);
		},
	);

	it("renders the item carousel and focuses newly added amounts", () => {
		const harness = createFormHarness();
		const initial = harness.render();
		expect(
			findByPredicate(
				initial,
				(node) => node?.props?.children === "Item 1",
			),
		).toHaveLength(0);
		harness.renderHeader()?.props.onPress();
		const expanded = harness.render();
		const rows = formElements<ComponentProps<typeof TransactionItemRow>>(
			expanded,
			TransactionItemRow,
		);
		expect(rows).toHaveLength(2);
		expect(rows[0]?.props).toMatchObject({ position: 0, count: 2 });
		const addAction = harness.renderHeader();
		expect(addAction?.type).toBe(HeaderIconButton);
		expect(addAction?.props).toMatchObject({
			icon: "add",
			accessibilityLabel: "Add item",
		});
		expect(
			formElements<ComponentProps<typeof HeaderIconButton>>(
				expanded,
				HeaderIconButton,
			).some((button) => button.props.accessibilityLabel === "Add item"),
		).toBe(false);
		harness.values.set(11, true);
		harness.render();
		expect(harness.renderHeader()?.props.isDisabled).toBe(true);
	});

	it("measures the items carousel width on layout", () => {
		const harness = createFormHarness();
		const tree = harness.render();
		findByPredicate(
			tree,
			(node) => node?.props?.onLayout,
		)[0].props.onLayout({ nativeEvent: { layout: { width: 320 } } });
		expect(harness.values.get(15)).toBe(320);
	});

	it("tracks the active carousel page on momentum scroll end", () => {
		const harness = createFormHarness();
		const tree = harness.render();
		findByPredicate(
			tree,
			(node) => node?.props?.onMomentumScrollEnd,
		)[0].props.onMomentumScrollEnd({
			nativeEvent: { contentOffset: { x: 640 } },
		});
		expect(harness.values.get(16)).toBe(0);
	});

	it("pages the carousel with the arrow buttons", () => {
		const scrollTo = vi.fn();
		const harness = createFormHarness(
			new Map<number, unknown>([
				[
					13,
					[
						{ key: "one", amount: "1", categoryId: "a" },
						{ key: "two", amount: "2", categoryId: "b" },
					],
				],
			]),
		);
		let refCalls = 0;
		reactMocks.useRef.mockImplementation(
			() =>
				(++refCalls % 2 === 0
					? { current: { scrollTo } }
					: { current: false }) as unknown as { current: boolean },
		);
		const tree = harness.render();
		const arrows = formElements<ComponentProps<typeof HeaderIconButton>>(
			tree,
			HeaderIconButton,
		);
		const previous = arrows.find(
			(button) => button.props.accessibilityLabel === "Previous item",
		);
		const next = arrows.find(
			(button) => button.props.accessibilityLabel === "Next item",
		);
		expect(previous?.props.isDisabled).toBe(true);
		expect(next?.props.isDisabled).toBe(false);
		next?.props.onPress();
		expect(scrollTo).toHaveBeenCalledWith({ x: 1, animated: true });
		expect(harness.values.get(16)).toBe(1);
		const paged = harness.render();
		const pagedArrows = formElements<
			ComponentProps<typeof HeaderIconButton>
		>(paged, HeaderIconButton);
		expect(
			pagedArrows.find(
				(button) => button.props.accessibilityLabel === "Next item",
			)?.props.isDisabled,
		).toBe(true);
		pagedArrows
			.find(
				(button) => button.props.accessibilityLabel === "Previous item",
			)
			?.props.onPress();
		expect(scrollTo).toHaveBeenCalledWith({ x: 0, animated: true });
		expect(harness.values.get(16)).toBe(0);
	});

	it("scrolls the carousel to the end after adding an item", async () => {
		const scrollToEnd = vi.fn();
		const harness = createFormHarness();
		reactMocks.useRef
			.mockReturnValueOnce({ current: false })
			.mockReturnValueOnce({ current: { scrollToEnd } } as unknown as {
				current: boolean;
			});
		harness.render();
		harness.renderHeader()?.props.onPress();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
	});

	it("starts with one item, adds independent fields, and never removes the last item", async () => {
		const harness = createFormHarness();
		let tree = harness.render();
		expect(
			formElements<ComponentProps<typeof HeaderIconButton>>(
				tree,
				HeaderIconButton,
			).filter((button) => button.props.icon === "close-outline"),
		).toHaveLength(0);
		formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0]?.props.onAmountChange("100");
		formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0]?.props.onEntityChange("food");
		harness.renderHeader()?.props.onPress();
		tree = harness.render();
		const itemRows = formElements<
			ComponentProps<typeof TransactionItemRow>
		>(tree, TransactionItemRow);
		expect(itemRows.map((row) => row.props.item.amount)).toEqual([
			"100",
			"",
		]);
		itemRows[1]?.props.onAmountChange("100");
		itemRows[1]?.props.onEntityChange("grocery");
		tree = harness.render();
		formElements<ComponentProps<typeof AppButton>>(tree, AppButton)
			.find((button) => button.props.label === "Save transaction")
			?.props.onPress();
		await flush();
		expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
			{ id: "db" },
			expect.objectContaining({
				amount: "200",
				categoryId: undefined,
				sourceId: "s1",
				transactionAt: 100,
				items: [
					{
						id: undefined,
						amount: "100",
						categoryId: "food",
						investmentId: "",
					},
					{
						id: undefined,
						amount: "100",
						categoryId: "grocery",
						investmentId: "",
					},
				],
			}),
		);
		formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0]?.props.onRemove();
		tree = harness.render();
		expect(
			formElements<ComponentProps<typeof TransactionItemRow>>(
				tree,
				TransactionItemRow,
			),
		).toHaveLength(1);
	});

	it("keeps split drafts when a mode change is canceled and carries the total on confirmation", () => {
		const harness = createFormHarness(
			new Map([
				[
					13,
					[
						{ key: "one", amount: "0.1", categoryId: "food" },
						{ key: "two", amount: "0.2", categoryId: "grocery" },
					],
				],
			]),
		);
		hookMocks.confirm.mockImplementation(() => undefined);
		const tree = harness.render();
		formElements<ComponentProps<typeof SelectField>>(
			tree,
			SelectField,
		)[1]?.props.onChange("TRANSFER");
		expect(hookMocks.confirm).not.toHaveBeenCalled();
		expect(harness.values.get(2)).toBe("TRANSFER");
		expect(harness.values.get(13)).toMatchObject([
			{ amount: "0.1", categoryId: "", destinationSourceId: "" },
			{ amount: "0.2", categoryId: "", destinationSourceId: "" },
		]);
		const incomeTree = harness.render();
		expect(harness.renderHeader()?.props.accessibilityLabel).toBe(
			"Add item",
		);
		formElements<ComponentProps<typeof SelectField>>(
			incomeTree,
			SelectField,
		)[1]?.props.onChange("DEBIT");
		expect(harness.values.get(13)).toMatchObject([
			{ amount: "0.1", categoryId: "" },
			{ amount: "0.2", categoryId: "" },
		]);
	});

	it("clears invalid item totals and missing categories when leaving itemized mode", () => {
		const harness = createFormHarness(
			new Map([[13, [{ key: "one", amount: "abc" }]]]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof SelectField>>(
			tree,
			SelectField,
		)[1]?.props.onChange("TRANSFER");
		expect(harness.values.get(2)).toBe("TRANSFER");
		expect(harness.values.get(13)).toMatchObject([
			{ amount: "abc", categoryId: "", destinationSourceId: "" },
		]);
	});

	it("keeps split items when switching between debit and credit", () => {
		const harness = createFormHarness(
			new Map([
				[
					13,
					[
						{ key: "one", amount: "0.1", categoryId: "food" },
						{ key: "two", amount: "0.2", categoryId: "grocery" },
					],
				],
			]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof SelectField>>(
			tree,
			SelectField,
		)[1]?.props.onChange("CREDIT");
		expect(hookMocks.confirm).not.toHaveBeenCalled();
		expect(harness.values.get(2)).toBe("CREDIT");
		expect(harness.values.get(13)).toHaveLength(2);
	});

	it.each([false, true])(
		"loads all expense items and preserves IDs only when editing (clone=%s)",
		async (clone) => {
			const params = clone
				? { cloneFromTransactionId: "payment" }
				: { transactionId: "payment" };
			const harness = createFormHarness(new Map(), params);
			serviceMocks.getTransaction.mockResolvedValue({
				classification: "GENERAL",
				type: "DEBIT",
				isApplicable: false,
				sourceId: "s1",
				amount: "200",
				reason: "Supermart",
				transactionAt: 42,
				items: [
					{
						id: "one",
						categoryId: "food",
						categoryName: "Food",
						amount: "100",
					},
					{
						id: "two",
						categoryId: "archived",
						categoryName: "Old category",
						amount: "100",
					},
				],
			});
			reactMocks.useEffect.mockImplementation((effect: () => void) =>
				effect(),
			);
			harness.render();
			await flush();
			reactMocks.useEffect.mockImplementation(() => undefined);
			const tree = harness.render();
			expect(harness.values.get(13)).toMatchObject([
				{ id: clone ? undefined : "one", amount: "100" },
				{ id: clone ? undefined : "two", amount: "100" },
			]);
			expect(harness.values.get(6)).toBe(clone ? 100 : 42);
			expect(harness.values.get(14)).toBe(false);
			const itemRows = formElements<
				ComponentProps<typeof TransactionItemRow>
			>(tree, TransactionItemRow);
			expect(itemRows[1]?.props.item).toMatchObject({
				categoryId: "archived",
				categoryName: "Old category",
			});
			formElements<ComponentProps<typeof AppButton>>(tree, AppButton)
				.find((button) => button.props.label === "Save transaction")
				?.props.onPress();
			await flush();
			expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
				{ id: "db" },
				expect.objectContaining({
					id: clone ? undefined : "payment",
					amount: "200",
					isApplicable: false,
				}),
			);
		},
	);

	it("loads an investment edit hydrating item investments", async () => {
		const harness = createFormHarness(new Map(), {
			transactionId: "buy",
		});
		serviceMocks.getTransaction.mockResolvedValue({
			classification: "INVESTMENT",
			type: "DEBIT",
			sourceId: "s1",
			amount: "150",
			reason: "Buy",
			transactionAt: 42,
			items: [
				{
					id: "one",
					categoryId: null,
					investmentId: "i1",
					investmentName: "MF",
					amount: "100",
				},
				{
					id: "two",
					categoryId: null,
					investmentId: "i2",
					investmentName: "Gold",
					amount: "50",
				},
			],
		});
		reactMocks.useEffect.mockImplementation((effect: () => void) =>
			effect(),
		);
		harness.render();
		await flush();
		reactMocks.useEffect.mockImplementation(() => undefined);
		const tree = harness.render();
		expect(harness.values.get(13)).toMatchObject([
			{
				id: "one",
				categoryId: "",
				investmentId: "i1",
				investmentName: "MF",
				amount: "100",
			},
			{
				id: "two",
				categoryId: "",
				investmentId: "i2",
				investmentName: "Gold",
				amount: "50",
			},
		]);
		const itemRows = formElements<
			ComponentProps<typeof TransactionItemRow>
		>(tree, TransactionItemRow);
		expect(itemRows[0]?.props.entityName).toBe("MF");
		expect(
			findByPredicate(
				tree,
				(node) => node?.props?.label === "Reason (optional)",
			)[0]?.props?.placeholder,
		).toBe("Defaults to the item investments");
	});

	it("labels the transfer amount without a currency when no source is picked", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[1, "GENERAL"],
				[2, "TRANSFER"],
				[3, ""],
			]),
		);
		const tree = harness.render();
		const itemRow = formElements<ComponentProps<typeof TransactionItemRow>>(
			tree,
			TransactionItemRow,
		)[0];
		expect(itemRow?.props.currencyCode).toBeUndefined();
		expect(itemRow?.props.entityLabel).toBe("Destination source");
	});

	it("loads non-debit edits: transfer skips items, empty-item credit seeds a draft", async () => {
		let harness = createFormHarness(new Map(), {
			transactionId: "payment",
		});
		reactMocks.useEffect.mockImplementation((effect: () => void) =>
			effect(),
		);
		serviceMocks.getTransaction.mockResolvedValue({
			classification: "GENERAL",
			type: "TRANSFER",
			sourceId: "s1",
			destinationSourceId: "s2",
			amount: "50",
			toAmount: "60",
			reason: "Move",
			transactionAt: 42,
			items: [],
		});
		harness.render();
		await flush();

		harness = createFormHarness(new Map(), { transactionId: "payment" });
		reactMocks.useEffect.mockImplementation((effect: () => void) =>
			effect(),
		);
		serviceMocks.getTransaction.mockResolvedValue({
			classification: "GENERAL",
			type: "CREDIT",
			sourceId: "s1",
			amount: "75",
			reason: "Refund",
			transactionAt: 42,
			categoryId: "refund-cat",
			items: [],
		});
		harness.render();
		await flush();
		reactMocks.useEffect.mockImplementation(() => undefined);
		harness.render();
		expect(harness.values.get(13)).toMatchObject([
			{ amount: "75", categoryId: "refund-cat" },
		]);

		harness = createFormHarness(new Map(), { transactionId: "payment" });
		reactMocks.useEffect.mockImplementation((effect: () => void) =>
			effect(),
		);
		serviceMocks.getTransaction.mockResolvedValue({
			classification: "GENERAL",
			type: "CREDIT",
			sourceId: "s1",
			amount: "20",
			reason: "Other",
			transactionAt: 42,
			items: [],
		});
		harness.render();
		await flush();
		expect(harness.values.get(13)).toMatchObject([
			{ amount: "20", categoryId: "" },
		]);
		reactMocks.useEffect.mockImplementation(() => undefined);
	});

	it("prevents duplicate saves until the payment commits", async () => {
		const harness = createFormHarness();
		let completeSave: (value: string) => void = () => undefined;
		serviceMocks.saveTransaction.mockReturnValue(
			new Promise<string>((resolve) => {
				completeSave = resolve;
			}),
		);
		const tree = harness.render();
		const button = formElements<ComponentProps<typeof AppButton>>(
			tree,
			AppButton,
		).find((candidate) => candidate.props.label === "Save transaction");
		button?.props.onPress();
		button?.props.onPress();
		expect(serviceMocks.saveTransaction).toHaveBeenCalledOnce();
		expect(harness.navigation.goBack).not.toHaveBeenCalled();
		const savingTree = harness.render();
		expect(
			findByPredicate(
				savingTree,
				(node: unknown) =>
					isValidElement<
						ComponentProps<typeof import("react-native").View>
					>(node) && node.props.pointerEvents === "none",
			),
		).toHaveLength(2);
		completeSave("payment");
		await flush();
		expect(harness.navigation.goBack).toHaveBeenCalledOnce();
		expect(harness.values.get(11)).toBe(false);
	});

	it("keeps incomplete item totals unavailable and can change mode without inventing an amount", () => {
		const harness = createFormHarness(
			new Map([
				[
					13,
					[
						{ key: "one", amount: "", categoryId: "" },
						{ key: "two", amount: "1", categoryId: "food" },
					],
				],
			]),
		);
		const tree = harness.render();
		formElements<ComponentProps<typeof SelectField>>(
			tree,
			SelectField,
		)[1]?.props.onChange("CREDIT");
		expect(harness.values.get(13)).toMatchObject([
			{ amount: "", categoryId: "" },
			{ amount: "1", categoryId: "food" },
		]);
		harness.values.set(1, "GENERAL");
		harness.values.set(2, "DEBIT");
		harness.values.set(13, []);
		formElements<ComponentProps<typeof SelectField>>(
			harness.render(),
			SelectField,
		)[1]?.props.onChange("CREDIT");
		expect(harness.values.get(13)).toEqual([]);
	});

	it("shows a decimal total before selecting a source", () => {
		const harness = createFormHarness(
			new Map<number, unknown>([
				[3, ""],
				[
					13,
					[
						{ key: "one", amount: "0.1", categoryId: "food" },
						{ key: "two", amount: "0.2", categoryId: "grocery" },
					],
				],
			]),
		);
		const tree = harness.render();
		expect(
			findByPredicate(
				tree,
				(node: unknown) =>
					isValidElement<
						ComponentProps<
							typeof import("@/components/CustomText").default
						>
					>(node) && node.props.children === "0.3",
			),
		).toHaveLength(1);
	});

	it.each([
		{
			context: "source",
			params: { initialSourceId: "s2" },
			defaultSource: "s1",
			sourceId: "s2",
			categoryId: "",
		},
		{
			context: "category",
			params: { initialCategoryId: "c1" },
			defaultSource: "s1",
			sourceId: "s1",
			categoryId: "c1",
		},
		{
			context: "saved default source",
			params: undefined,
			defaultSource: "s1",
			sourceId: "s1",
			categoryId: "",
		},
		{
			context: "unavailable default source",
			params: undefined,
			defaultSource: "missing-source",
			sourceId: "",
			categoryId: "",
		},
		{
			context: "no linked entity",
			params: undefined,
			defaultSource: null,
			sourceId: "",
			categoryId: "",
		},
	])(
		"prefills a new transaction from $context and retains the default trip",
		async ({ params, defaultSource, sourceId, categoryId }) => {
			serviceMocks.getDefaultSourceId.mockResolvedValue(defaultSource);
			const setSourceId = vi.fn();
			const setTripId = vi.fn();
			let initialItems: readonly TransactionItemDraft[] | undefined;
			let stateCall = 0;
			reactMocks.useState.mockImplementation((initial: unknown) => {
				stateCall += 1;
				if (stateCall === 3) return ["", setSourceId];
				if (stateCall === 4) return ["", setTripId];
				if (stateCall === 13) {
					initialItems = (
						typeof initial === "function"
							? (initial as () => unknown)()
							: initial
					) as readonly TransactionItemDraft[];
					return [initialItems, vi.fn()];
				}
				return [
					typeof initial === "function"
						? (initial as () => unknown)()
						: initial,
					vi.fn(),
				];
			});
			const renderScreen = TransactionFormScreen as (
				props: unknown,
			) => ReactElement;
			renderScreen({
				navigation: { goBack: vi.fn() },
				route: { key: "new", name: "TransactionForm", params },
			});
			await flush();

			expect(setSourceId).toHaveBeenCalledExactlyOnceWith(sourceId);
			expect(initialItems?.[0]?.categoryId).toBe(categoryId);
			expect(setTripId).toHaveBeenCalledExactlyOnceWith("tr1");
			expect(
				serviceMocks.getDefaultSourceId,
			).toHaveBeenCalledExactlyOnceWith({ id: "db" });
			expect(serviceMocks.getTransaction).not.toHaveBeenCalled();
		},
	);

	it("saves the prefilled source, linked category, and default trip", async () => {
		serviceMocks.getDefaultSourceId.mockResolvedValue("s1");
		const stateValues = new Map<number, unknown>([
			[13, [{ key: "first", amount: "15", categoryId: "c1" }]],
		]);
		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: unknown) => {
			stateCall += 1;
			const stateIndex = stateCall;
			if (!stateValues.has(stateIndex)) {
				stateValues.set(
					stateIndex,
					typeof initial === "function"
						? (initial as () => unknown)()
						: initial,
				);
			}
			return [
				stateValues.get(stateIndex),
				vi.fn((value: unknown) => {
					stateValues.set(stateIndex, value);
				}),
			];
		});
		const navigation = { goBack: vi.fn() };
		const props = {
			navigation,
			route: {
				key: "prefilled",
				name: "TransactionForm",
				params: { initialCategoryId: "c1" },
			},
		};
		const renderScreen = TransactionFormScreen as (
			props: unknown,
		) => ReactElement;
		renderScreen(props);
		await flush();
		reactMocks.useEffect.mockImplementation(() => undefined);
		stateCall = 0;
		const tree = renderScreen(props);
		const [saveButton] = findByPredicate(
			tree,
			(node: unknown) =>
				isValidElement<ComponentProps<typeof AppButton>>(node) &&
				node.type === AppButton &&
				node.props.label === "Save transaction",
		) as ReactElement<ComponentProps<typeof AppButton>>[];
		expect(saveButton?.props.isDisabled).toBe(false);
		saveButton?.props.onPress();
		await flush();

		expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
			{ id: "db" },
			expect.objectContaining({
				sourceId: "s1",
				categoryId: undefined,
				items: [{ id: undefined, amount: "15", categoryId: "c1" }],
				tripId: "tr1",
				amount: "15",
			}),
		);
		expect(navigation.goBack).toHaveBeenCalled();
	});

	it.each([
		{
			day: "August 24",
			initialTransactionAt: new Date(2026, 7, 24, 14, 30).getTime(),
		},
		{ day: "today", initialTransactionAt: new Date().getTime() },
		{ day: "the Unix epoch", initialTransactionAt: 0 },
	])(
		"prefills and saves $day supplied by the transaction list",
		async ({ initialTransactionAt }) => {
			const navigation = { goBack: vi.fn() };
			const setTransactionAt = vi.fn();
			let stateCall = 0;
			reactMocks.useState.mockImplementation((initial: unknown) => {
				stateCall += 1;
				if (stateCall === 3) return ["s1", vi.fn()];
				if (stateCall === 5) return ["Lunch", vi.fn()];
				if (stateCall === 13)
					return [
						[{ key: "k", amount: "15", categoryId: "c1" }],
						vi.fn(),
					];
				return [
					typeof initial === "function"
						? (initial as () => unknown)()
						: initial,
					stateCall === 6 ? setTransactionAt : vi.fn(),
				];
			});
			const renderScreen = TransactionFormScreen as (
				props: unknown,
			) => ReactElement;
			const tree = renderScreen({
				navigation,
				route: {
					key: "new-transaction",
					name: "TransactionForm",
					params: { initialTransactionAt },
				},
			});
			await flush();
			const [dateField] = findByPredicate(
				tree,
				(node: unknown) =>
					isValidElement(node) && node.type === DateField,
			) as ReactElement<ComponentProps<typeof DateField>>[];
			expect(dateField?.props.value).toBe(initialTransactionAt);
			expect(setTransactionAt).not.toHaveBeenCalled();

			const [saveButton] = findByPredicate(
				tree,
				(node: unknown) =>
					isValidElement<ComponentProps<typeof AppButton>>(node) &&
					node.type === AppButton &&
					node.props.label === "Save transaction",
			) as ReactElement<ComponentProps<typeof AppButton>>[];
			saveButton?.props.onPress();
			await flush();
			expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
				{ id: "db" },
				expect.objectContaining({
					transactionAt: initialTransactionAt,
				}),
			);
			expect(navigation.goBack).toHaveBeenCalled();
		},
	);

	it("saves GENERAL transfer with derived toAmount and deletes existing transaction", async () => {
		const navigation = { goBack: vi.fn() };

		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 1) return ["GENERAL", vi.fn()];
			if (stateCall === 2) return ["TRANSFER", vi.fn()];
			if (stateCall === 3) return ["s1", vi.fn()];
			if (stateCall === 5) return ["Move", vi.fn()];
			if (stateCall === 6) return [119, vi.fn()];
			if (stateCall === 7)
				return [
					[
						{
							id: "s1",
							name: "Cash",
							currencyCode: "INR",
							balance: "0",
						},
						{
							id: "s2",
							name: "Bank",
							currencyCode: "INR",
							balance: "0",
						},
					],
					vi.fn(),
				];
			if (stateCall === 8)
				return [
					[
						{
							id: "c1",
							name: "Food",
							kind: "EXPENSE",
							isIncome: false,
						},
					],
					vi.fn(),
				];
			if (stateCall === 9) return [[{ id: "tr1", name: "Goa" }], vi.fn()];
			if (stateCall === 10) return [[{ id: "i1", name: "MF" }], vi.fn()];
			if (stateCall === 13)
				return [
					[{ key: "k", amount: "100", destinationSourceId: "s2" }],
					vi.fn(),
				];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = TransactionFormScreen({
			navigation,
			route: {
				key: "k",
				name: "TransactionForm",
				params: { transactionId: "tx1" },
			},
		} as any);
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Save transaction" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Delete transaction" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
			{ id: "db" },
			{
				id: "tx1",
				classification: "GENERAL",
				type: "TRANSFER",
				isApplicable: true,
				sourceId: "s1",
				destinationSourceId: "s2",
				amount: "100",
				toAmount: undefined,
				categoryId: undefined,
				tripId: undefined,
				investmentId: undefined,
				reason: "Move",
				transactionAt: 119,
				items: [
					{
						id: undefined,
						amount: "100",
						categoryId: undefined,
						investmentId: undefined,
						sourceId: undefined,
						destinationSourceId: "s2",
						toAmount: undefined,
					},
				],
			},
		);
		expect(serviceMocks.deleteTransaction).toHaveBeenCalledWith(
			{ id: "db" },
			"tx1",
		);
		expect(hookMocks.refreshData).toHaveBeenCalled();
		expect(navigation.goBack).toHaveBeenCalled();
	});

	it("saves INVESTMENT transaction with investmentId branch", async () => {
		const navigation = { goBack: vi.fn() };

		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 1) return ["INVESTMENT", vi.fn()];
			if (stateCall === 2) return ["CREDIT", vi.fn()];
			if (stateCall === 3) return ["s1", vi.fn()];
			if (stateCall === 5) return ["Invest", vi.fn()];
			if (stateCall === 6) return [456, vi.fn()];
			if (stateCall === 7)
				return [
					[
						{
							id: "s1",
							name: "Cash",
							currencyCode: "INR",
							balance: "0",
						},
					],
					vi.fn(),
				];
			if (stateCall === 8)
				return [
					[
						{
							id: "c1",
							name: "Food",
							kind: "EXPENSE",
							isIncome: false,
						},
					],
					vi.fn(),
				];
			if (stateCall === 9) return [[{ id: "tr1", name: "Goa" }], vi.fn()];
			if (stateCall === 10) return [[{ id: "i1", name: "MF" }], vi.fn()];
			if (stateCall === 13)
				return [
					[{ key: "k", amount: "250", investmentId: "i1" }],
					vi.fn(),
				];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = TransactionFormScreen({
			navigation,
			route: { key: "k2", name: "TransactionForm", params: {} },
		} as any);
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Save transaction" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
			{ id: "db" },
			{
				id: undefined,
				classification: "INVESTMENT",
				type: "CREDIT",
				isApplicable: true,
				sourceId: "s1",
				destinationSourceId: undefined,
				amount: "250",
				toAmount: undefined,
				categoryId: undefined,
				tripId: undefined,
				investmentId: undefined,
				reason: "Invest",
				transactionAt: 456,
				items: [
					{
						id: undefined,
						amount: "250",
						categoryId: undefined,
						investmentId: "i1",
						sourceId: undefined,
						destinationSourceId: undefined,
						toAmount: undefined,
					},
				],
			},
		);
		expect(navigation.goBack).toHaveBeenCalled();
	});

	it("shows source warning and disables save when no sources exist", async () => {
		serviceMocks.getSources.mockResolvedValue([]);
		const navigation = { goBack: vi.fn() };
		const tree = TransactionFormScreen({
			navigation,
			route: { key: "k3", name: "TransactionForm", params: {} },
		} as any);
		await flush();

		const saveButton = findByPredicate(
			tree,
			(node) => node?.props?.label === "Save transaction",
		)[0];
		expect(saveButton?.props?.isDisabled).toBe(true);
		expect(
			findByPredicate(
				tree,
				(node) =>
					node?.props?.message ===
					"Create a source before adding transactions.",
			),
		).not.toHaveLength(0);
	});

	it("covers save and delete error branches", async () => {
		const navigation = { goBack: vi.fn() };
		serviceMocks.saveTransaction.mockRejectedValueOnce(
			new Error("save failed"),
		);
		serviceMocks.deleteTransaction.mockRejectedValueOnce(
			new Error("delete failed"),
		);

		const tree = TransactionFormScreen({
			navigation,
			route: {
				key: "k5",
				name: "TransactionForm",
				params: { transactionId: "tx1" },
			},
		} as any);
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Save transaction" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Delete transaction" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.saveTransaction).toHaveBeenCalled();
		expect(serviceMocks.deleteTransaction).toHaveBeenCalledWith(
			{ id: "db" },
			"tx1",
		);
		expect(navigation.goBack).not.toHaveBeenCalled();
	});

	it("preloads existing transaction fields and keeps date in edit mode", async () => {
		const navigation = { goBack: vi.fn() };
		serviceMocks.getTransaction.mockResolvedValueOnce({
			id: "tx1",
			classification: "GENERAL",
			type: "DEBIT",
			sourceId: "s1",
			destinationSourceId: null,
			amount: "77",
			toAmount: null,
			categoryId: "c1",
			tripId: "tr1",
			investmentId: null,
			reason: "Lunch",
			transactionAt: 12345,
			items: [
				{
					id: "item",
					amount: "77",
					categoryId: "c1",
					categoryName: "Food",
				},
			],
		});

		const setTransactionAt = vi.fn();
		const setSourceId = vi.fn();
		const setItems = vi.fn();
		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 3) return ["", setSourceId];
			if (stateCall === 13) return [[], setItems];
			if (stateCall === 6) return [107, setTransactionAt];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		TransactionFormScreen({
			navigation,
			route: {
				key: "k6",
				name: "TransactionForm",
				params: {
					transactionId: "tx1",
					initialSourceId: "s2",
					initialCategoryId: "other-category",
				},
			},
		} as any);
		await flush();
		await flush();

		expect(setTransactionAt).toHaveBeenCalledWith(12345);
		expect(setSourceId).toHaveBeenCalledExactlyOnceWith("s1");
		expect(setItems).toHaveBeenCalledWith([
			expect.objectContaining({
				id: "item",
				amount: "77",
				categoryId: "c1",
				categoryName: "Food",
			}),
		]);
		expect(serviceMocks.getDefaultSourceId).not.toHaveBeenCalled();
		expect(serviceMocks.getDefaultTripId).not.toHaveBeenCalled();
	});

	it("does not copy original date when cloning a transaction", async () => {
		const navigation = { goBack: vi.fn() };
		serviceMocks.getTransaction.mockResolvedValueOnce({
			id: "tx1",
			classification: "GENERAL",
			type: "DEBIT",
			sourceId: "s1",
			destinationSourceId: null,
			amount: "77",
			toAmount: null,
			categoryId: "c1",
			tripId: "tr1",
			investmentId: null,
			reason: "Lunch",
			transactionAt: 12345,
			items: [
				{
					id: "item",
					amount: "77",
					categoryId: "c1",
					categoryName: "Food",
				},
			],
		});

		const setTransactionAt = vi.fn();
		const setSourceId = vi.fn();
		const setItems = vi.fn();
		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 3) return ["", setSourceId];
			if (stateCall === 13) return [[], setItems];
			if (stateCall === 6) return [107, setTransactionAt];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		TransactionFormScreen({
			navigation,
			route: {
				key: "k7",
				name: "TransactionForm",
				params: {
					cloneFromTransactionId: "tx1",
					initialSourceId: "s2",
					initialCategoryId: "other-category",
				},
			},
		} as any);
		await flush();
		await flush();

		expect(setTransactionAt).not.toHaveBeenCalled();
		expect(setSourceId).toHaveBeenCalledExactlyOnceWith("s1");
		expect(setItems).toHaveBeenCalledWith([
			expect.objectContaining({
				id: undefined,
				amount: "77",
				categoryId: "c1",
			}),
		]);
		expect(serviceMocks.getDefaultSourceId).not.toHaveBeenCalled();
		expect(serviceMocks.getDefaultTripId).not.toHaveBeenCalled();
	});

	it("covers classification and type compact-picker handlers", async () => {
		const navigation = { goBack: vi.fn() };
		const setClassification = vi.fn();
		const setType = vi.fn();

		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 1) return ["GENERAL", setClassification];
			if (stateCall === 2) return ["TRANSFER", setType];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = TransactionFormScreen({
			navigation,
			route: { key: "k8", name: "TransactionForm", params: {} },
		} as any);
		await flush();

		const modeControls = findByPredicate(
			tree,
			(node) =>
				node?.props?.isSearchable === false &&
				typeof node?.props?.onChange === "function" &&
				Array.isArray(node?.props?.options),
		);
		expect(modeControls).toHaveLength(2);
		modeControls[0]?.props?.onChange("INVESTMENT");
		modeControls[0]?.props?.onChange("GENERAL");
		modeControls[1]?.props?.onChange("CREDIT");
		modeControls[1]?.props?.onChange("SOMETHING_ELSE");

		expect(setClassification).toHaveBeenCalledWith("INVESTMENT");
		expect(setClassification).toHaveBeenCalledWith("GENERAL");
		expect(setType).toHaveBeenCalledWith("CREDIT");
		expect(setType).toHaveBeenCalledWith("DEBIT");
	});

	it("covers initial form load error branch", async () => {
		const navigation = { goBack: vi.fn() };
		serviceMocks.getSources.mockRejectedValueOnce(new Error("load failed"));
		const setError = vi.fn();

		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 12) return ["", setError];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = TransactionFormScreen({
			navigation,
			route: { key: "k10", name: "TransactionForm", params: {} },
		} as any);
		await flush();
		await flush();

		expect(setError).toHaveBeenCalledWith("load failed");
		expect(tree).toBeTruthy();
	});

	it("saves GENERAL non-transfer with category and trip payload fields", async () => {
		const navigation = { goBack: vi.fn() };

		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 1) return ["GENERAL", vi.fn()];
			if (stateCall === 2) return ["DEBIT", vi.fn()];
			if (stateCall === 3) return ["s1", vi.fn()];
			if (stateCall === 4) return ["tr1", vi.fn()];
			if (stateCall === 5) return ["Groceries", vi.fn()];
			if (stateCall === 6) return [789, vi.fn()];
			if (stateCall === 13)
				return [
					[{ key: "first", amount: "300", categoryId: "c1" }],
					vi.fn(),
				];
			if (stateCall === 7)
				return [
					[
						{
							id: "s1",
							name: "Cash",
							currencyCode: "INR",
							balance: "0",
						},
					],
					vi.fn(),
				];
			if (stateCall === 8)
				return [
					[
						{
							id: "c1",
							name: "Food",
							kind: "EXPENSE",
							isIncome: false,
						},
					],
					vi.fn(),
				];
			if (stateCall === 9) return [[{ id: "tr1", name: "Goa" }], vi.fn()];
			if (stateCall === 10) return [[{ id: "i1", name: "MF" }], vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = TransactionFormScreen({
			navigation,
			route: { key: "k9", name: "TransactionForm", params: {} },
		} as any);
		await flush();

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Save transaction" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.saveTransaction).toHaveBeenCalledWith(
			{ id: "db" },
			{
				id: undefined,
				classification: "GENERAL",
				type: "DEBIT",
				isApplicable: true,
				sourceId: "s1",
				destinationSourceId: undefined,
				amount: "300",
				toAmount: undefined,
				categoryId: undefined,
				items: [
					{
						id: undefined,
						categoryId: "c1",
						amount: "300",
						investmentId: undefined,
						sourceId: undefined,
						destinationSourceId: undefined,
						toAmount: undefined,
					},
				],
				tripId: "tr1",
				investmentId: undefined,
				reason: "Groceries",
				transactionAt: 789,
			},
		);
	});

	it("maps category options with kind descriptions", async () => {
		const navigation = { goBack: vi.fn() };
		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 8) {
				return [
					[
						{
							id: "c1",
							name: "Salary",
							kind: "INCOME",
							isIncome: true,
						},
						{
							id: "c2",
							name: "Food",
							kind: "EXPENSE",
							isIncome: false,
						},
						{
							id: "c3",
							name: "Lent",
							kind: "REFUND",
							isIncome: false,
						},
					],
					vi.fn(),
				];
			}
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = TransactionFormScreen({
			navigation,
			route: { key: "k11", name: "TransactionForm", params: {} },
		} as any);

		const itemRow = findByPredicate(
			tree,
			(node) => node?.type === TransactionItemRow,
		)[0];
		expect(itemRow?.props?.entityOptions).toEqual([
			{ label: "Salary", value: "c1", description: "Income" },
			{ label: "Food", value: "c2", description: "Expense" },
			{ label: "Lent", value: "c3", description: "Refund" },
		]);
	});

	it("covers existing-transaction null fallbacks and error notice rendering", async () => {
		const navigation = { goBack: vi.fn() };
		serviceMocks.getTransaction.mockResolvedValueOnce({
			id: "tx2",
			classification: "GENERAL",
			type: "DEBIT",
			sourceId: "s1",
			destinationSourceId: null,
			amount: "11",
			toAmount: null,
			categoryId: null,
			tripId: null,
			investmentId: null,
			reason: "R",
			transactionAt: 200,
			items: [
				{
					id: "item",
					categoryId: null,
					amount: "11",
					categoryName: null,
					investmentId: null,
					investmentName: null,
					sourceId: null,
					sourceName: null,
					destinationSourceId: null,
					destinationSourceName: null,
					toAmount: null,
				},
			],
		});

		const setItems = vi.fn();
		const setTripId = vi.fn();
		let stateCall = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			stateCall += 1;
			if (stateCall === 13) return [[], setItems];
			if (stateCall === 4) return ["", setTripId];
			if (stateCall === 12) return ["boom", vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = TransactionFormScreen({
			navigation,
			route: {
				key: "k12",
				name: "TransactionForm",
				params: { transactionId: "tx2" },
			},
		} as any);
		await flush();
		await flush();

		expect(setItems).toHaveBeenCalledWith([
			expect.objectContaining({
				id: "item",
				amount: "11",
				categoryId: "",
				investmentId: "",
				sourceId: "",
				destinationSourceId: "",
				toAmount: "",
			}),
		]);
		expect(setTripId).toHaveBeenCalledWith("");
		expect(
			findByPredicate(
				tree,
				(node) =>
					node?.props?.message === "boom" &&
					node?.props?.tone === "danger",
			),
		).not.toHaveLength(0);
	});
});
