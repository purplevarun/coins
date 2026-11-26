import type Transaction from "@/types/Transaction";
import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useState: vi.fn(),
}));

const transactionServiceMocks = vi.hoisted(() => ({
	getTransactionDisplayReason: vi.fn(() => "Display reason"),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useState: reactMocks.useState,
	};
});

vi.mock("react-native", () => ({
	Modal: "Modal",
	Pressable: "Pressable",
	ScrollView: "ScrollView",
	StyleSheet: { create: (styles: unknown) => styles },
	View: "View",
}));

vi.mock("@expo/vector-icons/Ionicons", () => ({
	default: "Ionicons",
}));

vi.mock("react-native-svg", () => ({
	default: "Svg",
	Circle: "Circle",
}));

vi.mock("@/components/CustomText", () => ({ default: "CustomText" }));
vi.mock("@/components/CustomTextInput", () => ({ default: "CustomTextInput" }));
vi.mock("@/components/AppButton", () => ({ default: "AppButton" }));
vi.mock("@/components/GlassCard", () => ({ default: "GlassCard" }));

vi.mock("@/services/transactionService", () => ({
	default: transactionServiceMocks,
}));

vi.mock("@/utils/date", () => ({
	default: {
		formatDate: vi.fn(() => "2026-08-25"),
	},
}));

vi.mock("@/utils/money", async (importOriginal) => ({
	default: {
		...(await importOriginal<typeof import("@/utils/money")>()).default,
		formatMoney: vi.fn(
			(amount: string, currencyCode: string) =>
				`${currencyCode}:${amount}`,
		),
	},
}));

import DonutChart from "@/components/DonutChart";
import TransactionCard from "@/components/TransactionCard";

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

const hasTextContaining = (node: any, value: string): boolean =>
	findAllByType(node, "CustomText").some((textNode) => {
		const children = textNode?.props?.children;
		if (Array.isArray(children)) {
			return children
				.map((part) => String(part))
				.join("")
				.includes(value);
		}
		return String(children ?? "").includes(value);
	});

const baseTransaction: Transaction = {
	items: [],
	id: "t1",
	classification: "GENERAL",
	type: "DEBIT",
	sourceId: "s1",
	destinationSourceId: null,
	amount: "100",
	toAmount: null,
	categoryId: "c1",
	tripId: null,
	investmentId: null,
	reason: "",
	transactionAt: 123,
	createdAt: 123,
	updatedAt: 123,
	sourceName: "Cash",
	sourceCurrencyCode: "INR",
	destinationSourceName: null,
	destinationCurrencyCode: null,
	categoryName: "Groceries",
	tripName: null,
	investmentName: null,
};

describe("advanced components", () => {
	beforeEach(() => {
		reactMocks.useState.mockReset();
		transactionServiceMocks.getTransactionDisplayReason.mockClear();
	});

	it("covers DonutChart total and legend behavior", () => {
		const chartWithData = DonutChart({
			centerLabel: "INR 100",
			data: [
				{ label: "A", value: 10, color: "#111" },
				{ label: "B", value: 20, color: "#222" },
				{ label: "C", value: 30, color: "#333" },
				{ label: "D", value: 40, color: "#444" },
				{ label: "E", value: 50, color: "#555" },
				{ label: "F", value: 60, color: "#666" },
				{ label: "G", value: 70, color: "#777" },
			],
		});
		expect(findAllByType(chartWithData, "Circle")).toHaveLength(8);
		const legendRows = findAllByType(chartWithData, "View").filter(
			(view) => view?.props?.style?.gap === 8,
		);
		expect(legendRows.length).toBeGreaterThan(0);

		const chartWithoutData = DonutChart({
			centerLabel: "INR 0",
			data: [{ label: "A", value: 0, color: "#111" }],
		});
		expect(findAllByType(chartWithoutData, "Circle")).toHaveLength(1);
	});

	it.each([undefined, true, false])(
		"marks transaction applicability %s only when excluded",
		(isApplicable) => {
			const tree = TransactionCard({
				transaction: { ...baseTransaction, isApplicable },
				onPress: vi.fn(),
			});
			const warnings = findAllByType(tree, "Ionicons").filter(
				(icon) => icon.props.name === "warning",
			);
			expect(warnings).toHaveLength(isApplicable === false ? 1 : 0);
			if (isApplicable === false) {
				expect(warnings[0].props).toMatchObject({
					accessible: true,
					accessibilityRole: "image",
					accessibilityLabel: "Not applicable",
					color: "#E0DE71",
				});
			}
		},
	);

	it("covers TransactionCard icon/meta/amount branches", () => {
		const onPress = vi.fn();
		const onLongPress = vi.fn();

		const credit = TransactionCard({
			transaction: {
				...baseTransaction,
				type: "CREDIT",
			},
			onPress,
			onLongPress,
		} as any);
		expect(
			findAllByType(credit, "Ionicons").some(
				(icon) => icon.props.name === "arrow-down",
			),
		).toBe(true);
		expect(
			findAllByType(credit, "Ionicons").some(
				(icon) => icon.props.name === "attach",
			),
		).toBe(false);
		expect(hasTextContaining(credit, "+INR:100")).toBe(true);

		const debitInvestment = TransactionCard({
			transaction: {
				...baseTransaction,
				classification: "INVESTMENT",
				investmentName: "Mutual Fund",
				type: "DEBIT",
				tripName: "Trip A",
			},
			onPress,
		} as any);
		expect(
			findAllByType(debitInvestment, "Ionicons").some(
				(icon) => icon.props.name === "arrow-up",
			),
		).toBe(true);
		expect(
			findAllByType(debitInvestment, "CustomText").some(
				(text) => text.props.children === "Mutual Fund",
			),
		).toBe(true);
		expect(hasTextContaining(debitInvestment, "-INR:100")).toBe(true);

		const transfer = TransactionCard({
			transaction: {
				...baseTransaction,
				type: "TRANSFER",
				destinationSourceName: "Bank",
				destinationCurrencyCode: "USD",
				toAmount: "2",
			},
			onPress,
		} as any);
		expect(
			findAllByType(transfer, "Ionicons").some(
				(icon) => icon.props.name === "swap-horizontal",
			),
		).toBe(true);
		expect(hasTextContaining(transfer, "-> USD:2")).toBe(true);

		const transferWithoutDestinationName = TransactionCard({
			transaction: {
				...baseTransaction,
				type: "TRANSFER",
				destinationSourceName: null,
				destinationCurrencyCode: null,
				toAmount: null,
			},
			onPress,
		} as any);
		expect(
			hasTextContaining(transferWithoutDestinationName, "Cash -> "),
		).toBe(true);

		const debitWithoutCategory = TransactionCard({
			transaction: {
				...baseTransaction,
				type: "DEBIT",
				classification: "GENERAL",
				categoryName: null,
			},
			onPress,
		} as any);
		expect(hasTextContaining(debitWithoutCategory, "Cash · ")).toBe(true);
	});

	it("lists investment item names for an itemized investment", () => {
		const tree = TransactionCard({
			transaction: {
				...baseTransaction,
				classification: "INVESTMENT",
				investmentName: null,
				items: [
					{
						id: "one",
						transactionId: "t1",
						categoryId: null,
						investmentId: "i1",
						investmentName: "Nifty",
						amount: "50",
						position: 0,
						createdAt: 1,
						updatedAt: 1,
					},
					{
						id: "two",
						transactionId: "t1",
						categoryId: null,
						investmentId: "i2",
						investmentName: "Gold",
						amount: "50",
						position: 1,
						createdAt: 1,
						updatedAt: 1,
					},
				],
			},
			onPress: vi.fn(),
		});
		expect(hasTextContaining(tree, "Nifty, Gold")).toBe(true);
	});

	it("shows one split payment total and the matching category allocation", () => {
		expect(
			hasTextContaining(
				TransactionCard({
					transaction: {
						...baseTransaction,
						type: "CREDIT",
						categoryName: null,
					},
					onPress: vi.fn(),
				}),
				"Cash · ",
			),
		).toBe(true);
		const transaction: Transaction = {
			...baseTransaction,
			amount: "200",
			categoryId: null,
			items: [
				{
					id: "one",
					transactionId: "t1",
					categoryId: "food",
					categoryName: "Food",
					amount: "50",
					position: 0,
					createdAt: 1,
					updatedAt: 1,
				},
				{
					id: "two",
					transactionId: "t1",
					categoryId: "grocery",
					categoryName: "Grocery",
					amount: "100",
					position: 1,
					createdAt: 1,
					updatedAt: 1,
				},
				{
					id: "three",
					transactionId: "t1",
					categoryId: "food",
					categoryName: "Food",
					amount: "50",
					position: 2,
					createdAt: 1,
					updatedAt: 1,
				},
			],
		};
		const tree = TransactionCard({
			transaction,
			categoryId: "food",
			onPress: vi.fn(),
		});
		expect(hasTextContaining(tree, "Cash · Food, Grocery")).toBe(true);
		expect(hasTextContaining(tree, "-INR:200")).toBe(true);
		expect(hasTextContaining(tree, "Food: INR:100 of INR:200")).toBe(true);
		expect(
			hasTextContaining(
				TransactionCard({
					transaction,
					categoryId: "missing",
					onPress: vi.fn(),
				}),
				" of ",
			),
		).toBe(false);
	});

	it("lists destination source names for transfer items", () => {
		const tree = TransactionCard({
			transaction: {
				...baseTransaction,
				type: "TRANSFER",
				destinationSourceName: "Bank",
				items: [
					{
						id: "one",
						transactionId: "t1",
						categoryId: null,
						destinationSourceId: "s2",
						destinationSourceName: "Bank",
						amount: "50",
						position: 0,
						createdAt: 1,
						updatedAt: 1,
					},
				],
			},
			onPress: vi.fn(),
		});
		expect(hasTextContaining(tree, "Bank")).toBe(true);
	});
});
