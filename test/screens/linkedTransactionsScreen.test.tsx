import type AppButtonProps from "@/types/AppButtonProps";
import { isValidElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FloatingAddButton from "@/components/FloatingAddButton";
import type LinkedTransactionsScreenProps from "@/types/LinkedTransactionsScreenProps";

const reactMocks = vi.hoisted(() => ({
	useCallback: vi.fn((fn: any) => fn),
	useEffect: vi.fn((effect: () => void) => effect()),
	useMemo: vi.fn((factory: () => unknown) => factory()),
	useState: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
	getLinkedTransactions: vi.fn(),
	getSources: vi.fn(),
	deleteSource: vi.fn(),
	validateSource: vi.fn(),
	deleteCategory: vi.fn(),
	deleteTrip: vi.fn(),
	deleteInvestment: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
	refreshData: vi.fn(),
	confirm: vi.fn(),
	showMessage: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useCallback: reactMocks.useCallback,
		useEffect: reactMocks.useEffect,
		useMemo: reactMocks.useMemo,
		useState: reactMocks.useState,
	};
});

vi.mock("@expo/vector-icons/Ionicons", () => ({
	default: (props: any) => ({ type: "Ionicons", props }),
}));

vi.mock("react-native", () => ({
	StyleSheet: { create: (styles: any) => styles },
	View: (props: any) => ({ type: "View", props }),
}));

vi.mock("@/components/AppButton", () => ({
	default: (props: any) => ({ type: "AppButton", props }),
}));
vi.mock("@/components/CategoryConversionModal", () => ({
	default: (props: any) => ({ type: "CategoryConversionModal", props }),
}));
vi.mock("@/components/InvestmentConversionModal", () => ({
	default: (props: any) => ({ type: "InvestmentConversionModal", props }),
}));
vi.mock("@/components/CustomText", () => ({
	default: (props: any) => ({ type: "CustomText", props }),
}));
vi.mock("@/components/EmptyState", () => ({
	default: (props: any) => ({ type: "EmptyState", props }),
}));
vi.mock("@/components/FloatingAddButton", () => ({
	default: "FloatingAddButton",
}));
vi.mock("@/components/GlassCard", () => ({
	default: (props: any) => ({ type: "GlassCard", props }),
}));
vi.mock("@/components/ListHeader", () => ({
	default: (props: any) => ({ type: "ListHeader", props }),
}));
vi.mock("@/components/Notice", () => ({
	default: (props: any) => ({ type: "Notice", props }),
}));
vi.mock("@/components/ScreenList", () => ({
	default: (props: any) => ({ type: "ScreenList", props }),
}));
vi.mock("@/components/TransactionCard", () => ({
	default: (props: any) => ({ type: "TransactionCard", props }),
}));

vi.mock("@/hooks/useAppDialog", () => ({
	default: () => ({
		confirm: hookMocks.confirm,
		showMessage: hookMocks.showMessage,
	}),
}));
vi.mock("@/hooks/useDatabaseContext", () => ({
	default: () => ({
		database: { id: "db" },
		dataVersion: 1,
		refreshData: hookMocks.refreshData,
	}),
}));

vi.mock("@/services/transactionService", () => ({
	default: { getLinkedTransactions: serviceMocks.getLinkedTransactions },
}));
vi.mock("@/services/sourceService", () => ({
	default: {
		deleteSource: serviceMocks.deleteSource,
		getSources: serviceMocks.getSources,
		validateSource: serviceMocks.validateSource,
	},
}));
vi.mock("@/services/categoryService", () => ({
	default: { deleteCategory: serviceMocks.deleteCategory },
}));
vi.mock("@/services/tripService", () => ({
	default: { deleteTrip: serviceMocks.deleteTrip },
}));
vi.mock("@/services/investmentService", () => ({
	default: { deleteInvestment: serviceMocks.deleteInvestment },
}));

vi.mock("@/utils/relation", () => ({
	default: (kind: string) => ({
		title: `${kind} title`,
		singular: kind.toLowerCase(),
	}),
}));
vi.mock("@/utils/error", () => ({
	default: (caughtError: unknown) =>
		caughtError instanceof Error ? caughtError.message : "Unknown error",
}));
vi.mock("@/utils/runAfterRender", () => ({
	default: (fn: () => void) => fn(),
}));

import LinkedTransactionsScreen from "@/screens/LinkedTransactionsScreen";

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

describe("LinkedTransactionsScreen", () => {
	beforeEach(() => {
		reactMocks.useState.mockReset();
		reactMocks.useState.mockImplementation((initial: any) => [
			typeof initial === "function" ? initial() : initial,
			vi.fn(),
		]);
		Object.values(serviceMocks).forEach((mockFn) => mockFn.mockReset());
		Object.values(hookMocks).forEach((mockFn) => mockFn.mockReset());
		hookMocks.confirm.mockImplementation(({ onConfirm }: any) =>
			onConfirm(),
		);
		serviceMocks.getLinkedTransactions.mockResolvedValue([
			{ id: "tx1", transactionAt: 100 },
		]);
		serviceMocks.getSources.mockResolvedValue([]);
		serviceMocks.deleteSource.mockResolvedValue(undefined);
		serviceMocks.validateSource.mockResolvedValue(undefined);
		serviceMocks.deleteCategory.mockResolvedValue(undefined);
		serviceMocks.deleteTrip.mockResolvedValue(undefined);
		serviceMocks.deleteInvestment.mockResolvedValue(undefined);
	});

	it.each([
		{
			kind: "SOURCE" as const,
			params: {
				initialSourceId: "b17200f8-746c-4e14-a24c-087e087e6e96",
			},
		},
		{
			kind: "CATEGORY" as const,
			params: {
				initialCategoryId: "b17200f8-746c-4e14-a24c-087e087e6e96",
			},
		},
	])(
		"adds a transaction from an empty $kind linked list",
		async ({ kind, params }) => {
			const navigation = { navigate: vi.fn(), goBack: vi.fn() };
			serviceMocks.getLinkedTransactions.mockResolvedValue([]);
			const tree = LinkedTransactionsScreen({
				navigation,
				route: {
					key: "linked",
					name: "LinkedTransactions",
					params: {
						entityId: "b17200f8-746c-4e14-a24c-087e087e6e96",
						entityName: "Linked entity",
						kind,
					},
				},
			} as unknown as LinkedTransactionsScreenProps);
			await flush();

			const addButtons = findByPredicate(
				tree,
				(node: unknown) =>
					isValidElement(node) && node.type === FloatingAddButton,
			) as ReactElement<Pick<AppButtonProps, "onPress">>[];
			expect(addButtons).toHaveLength(1);
			addButtons[0]?.props.onPress();
			expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
				"TransactionForm",
				params,
			);
		},
	);

	it.each([
		["SOURCE", "SourceForm"],
		["CATEGORY", "CategoryForm"],
		["TRIP", "TripForm"],
		["INVESTMENT", "InvestmentForm"],
	] as const)(
		"covers %s edit and transaction navigation plus key extractor",
		async (kind, formRoute) => {
			const navigation = { navigate: vi.fn(), goBack: vi.fn() };
			const tree = LinkedTransactionsScreen({
				navigation,
				route: {
					key: "k",
					name: "LinkedTransactions",
					params: {
						entityId: "e1",
						entityName: "Entity",
						kind,
					},
				},
			} as any);
			await flush();

			const editAction = findByPredicate(
				tree,
				(node) =>
					node?.props?.label === "Edit" &&
					typeof node?.props?.onPress === "function",
			)[0];
			expect(editAction.props.style).toMatchObject({
				flexGrow: 1,
				flexBasis: 120,
				minWidth: 120,
			});
			expect(
				findByPredicate(
					tree,
					(node) => node?.props?.style?.flexWrap === "wrap",
				),
			).not.toHaveLength(0);
			editAction.props.onPress();

			const screenList = findByPredicate(
				tree,
				(node) =>
					typeof node?.props?.renderItem === "function" &&
					typeof node?.props?.keyExtractor === "function",
			)[0];
			expect(screenList.props.keyExtractor({ id: "tx9" })).toBe("tx9");

			const rendered = screenList.props.renderItem({
				item: { id: "tx9", transactionAt: 125 },
			});
			findByPredicate(
				rendered,
				(node) => typeof node?.props?.onPress === "function",
			)[0]?.props?.onPress();

			expect(navigation.navigate).toHaveBeenCalledWith(formRoute, {
				entityId: "e1",
			});
			expect(navigation.navigate).toHaveBeenCalledWith(
				"TransactionForm",
				{
					transactionId: "tx9",
				},
			);
			rendered.props.onLongPress();
			expect(navigation.navigate).toHaveBeenCalledWith(
				"TransactionForm",
				{
					cloneFromTransactionId: "tx9",
				},
			);
		},
	);

	it("shows the source balance beside a source detail", async () => {
		const navigation = { navigate: vi.fn(), goBack: vi.fn() };
		serviceMocks.getSources.mockResolvedValue([
			{ id: "e1", name: "Cash", currencyCode: "INR", balance: "1000" },
		]);
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 4) return ["₹1,000", vi.fn()];
			return [initial, vi.fn()];
		});
		const tree = LinkedTransactionsScreen({
			navigation,
			route: {
				key: "source",
				name: "LinkedTransactions",
				params: { entityId: "e1", entityName: "Cash", kind: "SOURCE" },
			},
		} as any);
		await flush();
		expect(serviceMocks.getSources).toHaveBeenCalledWith({ id: "db" });
		expect(
			findByPredicate(
				tree,
				(node) =>
					Array.isArray(node?.props?.children) &&
					node.props.children.includes("₹1,000"),
			),
		).not.toHaveLength(0);
	});

	it.each([
		{ kind: "CATEGORY" as const, relation: "category" },
		{ kind: "INVESTMENT" as const, relation: "investment" },
	])(
		"converts a $relation from beside Edit and Delete",
		async ({ kind, relation }) => {
			const navigation = { navigate: vi.fn(), goBack: vi.fn() };
			const setIsConvertOpen = vi.fn();
			let call = 0;
			reactMocks.useState.mockImplementation((initial: any) => {
				call += 1;
				if (call === 3) return [true, setIsConvertOpen];
				return [initial, vi.fn()];
			});
			const tree = LinkedTransactionsScreen({
				navigation,
				route: {
					key: "convert",
					name: "LinkedTransactions",
					params: { entityId: "pf", entityName: "PF", kind },
				},
			} as unknown as LinkedTransactionsScreenProps);
			await flush();
			const labels = findByPredicate(
				tree,
				(node) => typeof node?.props?.label === "string",
			).map((node) => node.props.label);
			expect(labels).toEqual(
				expect.arrayContaining(["Edit", "Convert", "Delete"]),
			);
			findByPredicate(
				tree,
				(node) => node?.props?.label === "Convert",
			)[0]?.props.onPress();
			expect(setIsConvertOpen).toHaveBeenCalledWith(true);
			const [popup] = findByPredicate(
				tree,
				(node) => typeof node?.props?.onCompleted === "function",
			);
			expect(popup.props).toMatchObject({
				isVisible: true,
				[relation]: { id: "pf", name: "PF" },
			});
			popup.props.onClose();
			expect(setIsConvertOpen).toHaveBeenLastCalledWith(false);
			popup.props.onCompleted();
			expect(hookMocks.refreshData).toHaveBeenCalledOnce();
			expect(navigation.goBack).toHaveBeenCalledOnce();
		},
	);

	it.each(["SOURCE", "TRIP"] as const)(
		"does not offer conversion for a %s",
		async (kind) => {
			const tree = LinkedTransactionsScreen({
				navigation: { navigate: vi.fn(), goBack: vi.fn() },
				route: {
					key: "no-convert",
					name: "LinkedTransactions",
					params: { entityId: "e1", entityName: "Entity", kind },
				},
			} as unknown as LinkedTransactionsScreenProps);
			await flush();
			expect(
				findByPredicate(
					tree,
					(node) =>
						node?.props?.label === "Convert" ||
						typeof node?.props?.onCompleted === "function",
				),
			).toHaveLength(0);
		},
	);

	it("covers load and delete error branches", async () => {
		const navigation = { navigate: vi.fn(), goBack: vi.fn() };
		const setError = vi.fn();
		serviceMocks.getLinkedTransactions.mockRejectedValueOnce(
			new Error("load failed"),
		);
		serviceMocks.deleteSource.mockRejectedValueOnce(
			new Error("cannot delete"),
		);

		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 2) return ["", setError];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = LinkedTransactionsScreen({
			navigation,
			route: {
				key: "k2",
				name: "LinkedTransactions",
				params: {
					entityId: "e1",
					entityName: "Entity",
					kind: "SOURCE",
					dateRangeLabel: "This month",
				},
			},
		} as any);
		await flush();

		expect(setError).toHaveBeenCalledWith("load failed");

		findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Delete" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.deleteSource).toHaveBeenCalledWith(
			{ id: "db" },
			"e1",
		);
		expect(hookMocks.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Unable to delete",
				message: "cannot delete",
				variant: "danger",
			}),
		);
		expect(hookMocks.refreshData).not.toHaveBeenCalled();
		expect(navigation.goBack).not.toHaveBeenCalled();
	});

	it("validates a source from the summary actions and reports failures", async () => {
		const navigation = { navigate: vi.fn(), goBack: vi.fn() };
		const setError = vi.fn();
		serviceMocks.validateSource.mockRejectedValueOnce(
			new Error("validate failed"),
		);

		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 2) return ["", setError];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = LinkedTransactionsScreen({
			navigation,
			route: {
				key: "k3",
				name: "LinkedTransactions",
				params: {
					entityId: "e1",
					entityName: "Bank",
					kind: "SOURCE",
				},
			},
		} as any);
		await flush();

		const validateButton = findByPredicate(
			tree,
			(node) =>
				node?.props?.label === "Validate" &&
				typeof node?.props?.onPress === "function",
		)[0];
		expect(validateButton).toBeDefined();
		validateButton.props.onPress();
		await flush();
		expect(serviceMocks.validateSource).toHaveBeenCalledWith(
			{ id: "db" },
			"e1",
		);
		expect(setError).toHaveBeenCalledWith("validate failed");
		expect(hookMocks.refreshData).not.toHaveBeenCalled();

		serviceMocks.validateSource.mockResolvedValueOnce(undefined);
		validateButton.props.onPress();
		await flush();
		expect(hookMocks.refreshData).toHaveBeenCalledOnce();
	});

	it("filters linked transactions by provided date range", async () => {
		const setTransactions = vi.fn();
		serviceMocks.getLinkedTransactions.mockResolvedValueOnce([
			{ id: "tx-old", transactionAt: 100 },
			{ id: "tx-in", transactionAt: 200 },
			{ id: "tx-new", transactionAt: 300 },
		]);

		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 1) return [[], setTransactions];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		LinkedTransactionsScreen({
			navigation: { navigate: vi.fn(), goBack: vi.fn() },
			route: {
				key: "k3",
				name: "LinkedTransactions",
				params: {
					entityId: "e1",
					entityName: "Entity",
					kind: "SOURCE",
					dateRangeStart: 150,
					dateRangeEnd: 250,
				},
			},
		} as any);
		await flush();

		expect(setTransactions).toHaveBeenCalledWith([
			{ id: "tx-in", transactionAt: 200 },
		]);
	});

	it("sorts linked transactions by debit amount descending", async () => {
		const setTransactions = vi.fn();
		serviceMocks.getLinkedTransactions.mockResolvedValueOnce([
			{ id: "tx-credit", type: "CREDIT", amount: "999" },
			{ id: "tx-small", type: "DEBIT", amount: "10" },
			{ id: "tx-big", type: "DEBIT", amount: "500" },
		]);

		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 1) return [[], setTransactions];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		LinkedTransactionsScreen({
			navigation: { navigate: vi.fn(), goBack: vi.fn() },
			route: {
				key: "k4",
				name: "LinkedTransactions",
				params: {
					entityId: "e1",
					entityName: "Entity",
					kind: "CATEGORY",
					sortBy: "DEBIT_DESC",
				},
			},
		} as any);
		await flush();

		expect(setTransactions).toHaveBeenCalledWith([
			{ id: "tx-big", type: "DEBIT", amount: "500" },
			{ id: "tx-small", type: "DEBIT", amount: "10" },
			{ id: "tx-credit", type: "CREDIT", amount: "999" },
		]);
	});

	it.each([
		["CATEGORY", "deleteCategory"],
		["TRIP", "deleteTrip"],
		["INVESTMENT", "deleteInvestment"],
	] as const)(
		"deletes linked relation successfully for %s",
		async (kind, deleteKey) => {
			const navigation = { navigate: vi.fn(), goBack: vi.fn() };
			const tree = LinkedTransactionsScreen({
				navigation,
				route: {
					key: `k-${kind}`,
					name: "LinkedTransactions",
					params: {
						entityId: "e1",
						entityName: "Entity",
						kind,
					},
				},
			} as any);
			await flush();

			findByPredicate(
				tree,
				(node) =>
					node?.props?.label === "Delete" &&
					typeof node?.props?.onPress === "function",
			)[0]?.props?.onPress();
			await flush();

			expect(serviceMocks[deleteKey]).toHaveBeenCalledWith(
				{ id: "db" },
				"e1",
			);
			expect(hookMocks.refreshData).toHaveBeenCalled();
			expect(navigation.goBack).toHaveBeenCalled();
		},
	);

	it("renders list-header error notice branch", async () => {
		const navigation = { navigate: vi.fn(), goBack: vi.fn() };

		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 2) return ["manual header error", vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = LinkedTransactionsScreen({
			navigation,
			route: {
				key: "k4",
				name: "LinkedTransactions",
				params: {
					entityId: "e1",
					entityName: "Entity",
					kind: "CATEGORY",
				},
			},
		} as any);
		await flush();

		expect(
			findByPredicate(
				tree,
				(node) =>
					node?.props?.message === "manual header error" &&
					node?.props?.tone === "danger",
			),
		).not.toHaveLength(0);
	});
});
