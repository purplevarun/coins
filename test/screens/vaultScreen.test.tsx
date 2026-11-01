import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useCallback: vi.fn((fn: any) => fn),
	useEffect: vi.fn(),
	useLayoutEffect: vi.fn<(effect: () => void) => void>(),
	useMemo: vi.fn((factory: () => unknown) => factory()),
	useState: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
	deleteCard: vi.fn(),
	getCards: vi.fn(),
	deletePassword: vi.fn(),
	getPasswords: vi.fn(),
	setStringAsync: vi.fn(),
}));

const hookMocks = vi.hoisted(() => ({
	refreshData: vi.fn(),
	confirm: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useCallback: reactMocks.useCallback,
		useEffect: reactMocks.useEffect,
		useLayoutEffect: reactMocks.useLayoutEffect,
		useMemo: reactMocks.useMemo,
		useState: reactMocks.useState,
	};
});

vi.mock("@expo/vector-icons", () => ({
	Ionicons: (props: any) => ({ type: "Ionicons", props }),
}));

vi.mock("expo-clipboard", () => ({
	setStringAsync: serviceMocks.setStringAsync,
}));

vi.mock("react-native", () => ({
	Pressable: (props: any) => ({ type: "Pressable", props }),
	StyleSheet: { create: (styles: any) => styles },
	View: (props: any) => ({ type: "View", props }),
}));

vi.mock("@/components/AppButton", () => ({
	default: (props: any) => ({ type: "AppButton", props }),
}));
vi.mock("@/components/CustomText", () => ({
	default: (props: any) => ({ type: "CustomText", props }),
}));
vi.mock("@/components/EmptyState", () => ({
	default: (props: any) => ({ type: "EmptyState", props }),
}));
vi.mock("@/components/FloatingAddButton", () => ({
	default: (props: any) => ({ type: "FloatingAddButton", props }),
}));
vi.mock("@/components/GlassCard", () => ({
	default: (props: any) => ({ type: "GlassCard", props }),
}));
vi.mock("@/components/HeaderIconButton", () => ({
	default: (props: any) => ({ type: "HeaderIconButton", props }),
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
vi.mock("@/components/SearchBar", () => ({
	default: (props: any) => ({ type: "SearchBar", props }),
}));

vi.mock("@/hooks/useAppDialog", () => ({
	default: () => ({ confirm: hookMocks.confirm }),
}));
vi.mock("@/hooks/useDatabaseContext", () => ({
	default: () => ({
		database: { id: "db" },
		dataVersion: 1,
		refreshData: hookMocks.refreshData,
	}),
}));

vi.mock("@/services/cardService", () => ({
	default: {
		deleteCard: serviceMocks.deleteCard,
		getCards: serviceMocks.getCards,
	},
}));
vi.mock("@/services/passwordService", () => ({
	default: {
		deletePassword: serviceMocks.deletePassword,
		getPasswords: serviceMocks.getPasswords,
	},
}));

vi.mock("@/utils/date", () => ({
	default: {
		formatDate: (value: number) => `date:${value}`,
	},
}));
vi.mock("@/utils/error", () => ({
	default: (caughtError: unknown) =>
		caughtError instanceof Error ? caughtError.message : "Unknown error",
}));
vi.mock("@/utils/runAfterRender", () => ({
	default: (fn: () => void) => fn(),
}));

import VaultScreen, {
	CARD_TYPE_LABEL,
	CopyRow,
	getCardSubtitle,
	getPasswordSubtitle,
	getVaultFormParams,
	getVaultListData,
	maskValue,
} from "@/screens/VaultScreen";

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

describe("VaultScreen", () => {
	beforeEach(() => {
		reactMocks.useEffect.mockReset();
		reactMocks.useLayoutEffect.mockReset();
		reactMocks.useState.mockReset();
		reactMocks.useEffect.mockImplementation((effect: () => void) => {
			effect();
		});
		reactMocks.useState.mockImplementation((initial: any) => [
			typeof initial === "function" ? initial() : initial,
			vi.fn(),
		]);

		Object.values(serviceMocks).forEach((mockFn) => mockFn.mockReset());
		Object.values(hookMocks).forEach((mockFn) => mockFn.mockReset());

		serviceMocks.getPasswords.mockResolvedValue([{ id: "p1" }]);
		serviceMocks.getCards.mockResolvedValue([{ id: "c1" }]);
		serviceMocks.deletePassword.mockResolvedValue(undefined);
		serviceMocks.deleteCard.mockResolvedValue(undefined);
		serviceMocks.setStringAsync.mockResolvedValue(undefined);
		hookMocks.confirm.mockImplementation(({ onConfirm }: any) =>
			onConfirm(),
		);
	});

	it("executes PASSWORD row copy/delete flows", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 1) {
				return [
					[
						{
							id: "p1",
							title: "Github",
							username: "u",
							password: "secret",
							updatedAt: 10,
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

		const tree = VaultScreen({
			navigation,
			route: { key: "k", name: "Vault", params: { kind: "PASSWORD" } },
		} as any);
		await flush();

		const screenList = findByPredicate(
			tree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		const renderedItem = screenList.props.renderItem({
			item: {
				kind: "PASSWORD",
				entry: {
					id: "p1",
					title: "Github",
					username: "u",
					password: "secret",
					updatedAt: 10,
				},
			},
		});

		findByPredicate(
			renderedItem,
			(node) =>
				node?.props?.label === "Copy" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		findByPredicate(
			renderedItem,
			(node) =>
				node?.props?.label === "Delete" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.setStringAsync).toHaveBeenCalledWith("secret");
		expect(serviceMocks.deletePassword).toHaveBeenCalledWith(
			{ id: "db" },
			"p1",
		);
		expect(hookMocks.refreshData).toHaveBeenCalled();
	});

	it.each([
		{
			kind: "PASSWORD",
			stateIndex: 1,
			entries: [{ id: "p1" }],
			expected: "1 password",
		},
		{
			kind: "PASSWORD",
			stateIndex: 1,
			entries: [{ id: "p1" }, { id: "p2" }],
			expected: "2 passwords",
		},
		{
			kind: "CARD",
			stateIndex: 2,
			entries: [{ id: "c1" }],
			expected: "1 card",
		},
		{
			kind: "CARD",
			stateIndex: 2,
			entries: [{ id: "c1" }, { id: "c2" }, { id: "c3" }],
			expected: "3 cards",
		},
	] as const)(
		"shows $expected on the $kind list",
		({ kind, stateIndex, entries, expected }) => {
			let call = 0;
			reactMocks.useState.mockImplementation((initial: any) => {
				call += 1;
				if (call === stateIndex) return [entries, vi.fn()];
				return [
					typeof initial === "function" ? initial() : initial,
					vi.fn(),
				];
			});
			const tree = VaultScreen({
				navigation: { navigate: vi.fn(), setOptions: vi.fn() },
				route: { key: "k", name: "Vault", params: { kind } },
			} as any);
			expect(
				findByPredicate(
					tree,
					(node) =>
						Array.isArray(node?.props?.children) &&
						node.props.children.join("").trim() === expected,
				),
			).toHaveLength(1);
		},
	);

	it("executes CARD delete flow", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };

		const cardTree = VaultScreen({
			navigation,
			route: { key: "c", name: "Vault", params: { kind: "CARD" } },
		} as any);
		await flush();
		const cardList = findByPredicate(
			cardTree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		const cardItem = cardList.props.renderItem({
			item: {
				kind: "CARD",
				entry: {
					id: "c1",
					name: "Visa",
					cardType: "CREDIT_CARD",
					cardNumber: "1111",
					expiry: "12/30",
					cvv: "111",
					pin: "0000",
					network: "VISA",
				},
			},
		});
		findByPredicate(
			cardItem,
			(node) =>
				node?.props?.label === "Delete" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(serviceMocks.deleteCard).toHaveBeenCalledWith(
			{ id: "db" },
			"c1",
		);
		expect(hookMocks.refreshData).toHaveBeenCalled();
	});

	it("covers CARD copy/navigation and floating add navigation", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 2)
				return [
					[
						{
							id: "c1",
							name: "Visa",
							cardType: "CREDIT_CARD",
							cardNumber: "1111",
							expiry: "12/30",
							cvv: "111",
							pin: "0000",
							network: "VISA",
						},
					],
					vi.fn(),
				];
			if (call === 5) return ["vi", vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = VaultScreen({
			navigation,
			route: { key: "c2", name: "Vault", params: { kind: "CARD" } },
		} as any);
		await flush();

		const list = findByPredicate(
			tree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		const row = list.props.renderItem({
			item: {
				kind: "CARD",
				entry: {
					id: "c1",
					name: "Visa",
					cardType: "CREDIT_CARD",
					cardNumber: "1111",
					expiry: "12/30",
					cvv: "111",
					pin: "0000",
					network: "VISA",
				},
			},
		});

		findByPredicate(
			row,
			(node) =>
				typeof node?.type === "function" &&
				typeof node?.props?.onCopy === "function" &&
				(node?.props?.label === "Card number" ||
					node?.props?.label === "CVV" ||
					node?.props?.label === "PIN"),
		).forEach((node) =>
			node.props.onCopy(node.props.value, node.props.label),
		);
		findByPredicate(
			row,
			(node) => typeof node?.props?.onPress === "function",
		).forEach((node) => node.props.onPress());
		await flush();

		expect(serviceMocks.setStringAsync).toHaveBeenCalledWith("1111");
		expect(serviceMocks.setStringAsync).toHaveBeenCalledWith("111");
		expect(serviceMocks.setStringAsync).toHaveBeenCalledWith("0000");
		expect(navigation.navigate).toHaveBeenCalledWith("VaultForm", {
			kind: "CARD",
			entryId: "c1",
		});
	});

	it("covers CopyRow and card label helpers directly", () => {
		expect(CARD_TYPE_LABEL.CREDIT_CARD).toBe("Credit card");
		expect(CARD_TYPE_LABEL.DEBIT_CARD).toBe("Debit card");
		expect(CARD_TYPE_LABEL.IDENTITY_CARD).toBe("Identity card");
		expect(getPasswordSubtitle("user")).toBe("user");
		expect(getPasswordSubtitle("")).toBe("No username");
		expect(getCardSubtitle("CREDIT_CARD", "VISA")).toBe(
			"Credit card · VISA",
		);
		expect(getCardSubtitle("CUSTOM", "")).toBe("CUSTOM");
		expect(getVaultFormParams("PASSWORD")).toEqual({ kind: "PASSWORD" });
		expect(getVaultFormParams("CARD", "c1")).toEqual({
			kind: "CARD",
			entryId: "c1",
		});
		expect(
			getVaultListData(
				"PASSWORD",
				[
					{
						id: "p1",
						title: "Github",
						username: "user",
					} as any,
				],
				[],
				"git",
			),
		).toHaveLength(1);

		const cardList = getVaultListData(
			"CARD",
			[],
			[
				{
					id: "c1",
					name: "Visa",
					network: "VISA",
					cardNumber: "1111",
					cardType: "CREDIT_CARD",
				} as any,
				{
					id: "c2",
					name: "Aadhaar",
					network: "",
					cardNumber: "2222",
					cardType: "IDENTITY_CARD",
				} as any,
				{
					id: "c3",
					name: "Legacy",
					network: "",
					cardNumber: "3333",
					cardType: "OTHER",
				} as any,
			],
			"",
		);
		expect(cardList.map((item) => item.kind)).toEqual([
			"CARD_HEADER",
			"CARD",
			"CARD_HEADER",
			"CARD",
			"CARD_HEADER",
			"CARD",
		]);
		expect(
			cardList
				.filter((item) => item.kind === "CARD_HEADER")
				.map((item) => item.label),
		).toEqual(["Credit card", "Identity card", "OTHER"]);
		expect(
			getVaultListData(
				"CARD",
				[],
				[
					{
						id: "c1",
						name: "Visa",
						network: "VISA",
						cardNumber: "1111",
						cardType: "CREDIT_CARD",
					} as any,
				],
				"nomatch",
			),
		).toHaveLength(0);
		expect(
			getVaultListData(
				"CARD",
				[],
				[
					{
						id: "c1",
						name: "Visa",
						network: "VISA",
						cardNumber: "1111",
						cardType: "CREDIT_CARD",
					} as any,
				],
				"visa",
			),
		).toHaveLength(2);

		const onCopy = vi.fn();
		expect(CopyRow({ label: "PIN", value: "", onCopy } as any)).toBeNull();

		const row = CopyRow({
			label: "PIN",
			value: "1234",
			onCopy,
		}) as any;
		const copyButton = findByPredicate(
			row,
			(node) => typeof node?.props?.onPress === "function",
		)[0];
		copyButton.props.onPress();
		expect(onCopy).toHaveBeenCalledWith("1234", "PIN");

		expect(maskValue("12 34")).toBe("•• ••");
		const maskedRow = CopyRow({
			label: "PIN",
			value: "1234",
			isMasked: true,
		}) as any;
		expect(
			findByPredicate(
				maskedRow,
				(node) => node?.props?.children === "••••",
			),
		).toHaveLength(1);
		expect(
			findByPredicate(
				maskedRow,
				(node) => typeof node?.props?.onPress === "function",
			),
		).toHaveLength(0);
	});

	it("covers row navigation callbacks, keyExtractor, and floating add action", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 1) {
				return [
					[
						{
							id: "p1",
							title: "Github",
							username: "u",
							password: "secret",
							updatedAt: 10,
						},
					],
					vi.fn(),
				];
			}
			if (call === 4) return ["pa", vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const passwordTree = VaultScreen({
			navigation,
			route: { key: "vp", name: "Vault", params: { kind: "PASSWORD" } },
		} as any);
		await flush();

		const passwordList = findByPredicate(
			passwordTree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		expect(passwordList.props.keyExtractor({ entry: { id: "p1" } })).toBe(
			"p1",
		);
		expect(
			passwordList.props.keyExtractor({
				kind: "CARD_HEADER",
				label: "Debit card",
			}),
		).toBe("header:Debit card");

		const passwordRow = passwordList.props.renderItem({
			item: {
				kind: "PASSWORD",
				entry: {
					id: "p1",
					title: "Github",
					username: "u",
					password: "secret",
					updatedAt: 10,
				},
			},
		});
		findByPredicate(
			passwordRow,
			(node) =>
				typeof node?.props?.onPress === "function" &&
				node?.props?.label !== "Delete" &&
				node?.props?.label !== "Copy password",
		)[0]?.props?.onPress();

		const headerRow = passwordList.props.renderItem({
			item: { kind: "CARD_HEADER", label: "Debit card" },
		});
		expect(
			findByPredicate(
				headerRow,
				(node) => node?.props?.children === "Debit card",
			),
		).toHaveLength(1);

		findByPredicate(
			passwordTree,
			(node) =>
				typeof node?.props?.onPress === "function" &&
				typeof node?.props?.label === "undefined",
		).forEach((node) => node.props.onPress());

		expect(navigation.navigate).toHaveBeenCalledWith("VaultForm", {
			kind: "PASSWORD",
			entryId: "p1",
		});
		expect(navigation.navigate).toHaveBeenCalledWith("VaultForm", {
			kind: "PASSWORD",
		});
	});

	it("toggles the vault search bar from the header button", () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		const setSearchVisible = vi.fn();
		const setSearchQuery = vi.fn();
		const setSearchDebounced = vi.fn();
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 3) return [true, setSearchVisible];
			if (call === 4) return ["", setSearchQuery];
			if (call === 5) return ["", setSearchDebounced];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = VaultScreen({
			navigation,
			route: { key: "vs", name: "Vault", params: { kind: "CARD" } },
		} as any);

		expect(
			findByPredicate(
				tree,
				(node) =>
					typeof node?.type === "function" &&
					node?.props?.placeholder === "Search vault",
			),
		).toHaveLength(1);

		reactMocks.useLayoutEffect.mock.calls.forEach(([effect]) => effect());
		const headerRight = navigation.setOptions.mock.calls.at(-1)?.[0]
			?.headerRight as () => any;
		const button = headerRight();
		expect(button.props.icon).toBe("close-outline");
		expect(button.props.isActive).toBe(true);
		button.props.onPress();

		const updater = setSearchVisible.mock.calls[0]?.[0] as (
			current: boolean,
		) => boolean;
		expect(updater(false)).toBe(true);
		expect(setSearchQuery).toHaveBeenCalledWith("");
		expect(setSearchDebounced).toHaveBeenCalledWith("");
	});

	it("renders the collapsed search header button", () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };

		VaultScreen({
			navigation,
			route: { key: "vs2", name: "Vault", params: { kind: "CARD" } },
		} as any);

		reactMocks.useLayoutEffect.mock.calls.forEach(([effect]) => effect());
		const headerRight = navigation.setOptions.mock.calls.at(-1)?.[0]
			?.headerRight as () => any;
		const button = headerRight();
		expect(button.props.icon).toBe("search-outline");
		expect(button.props.isActive).toBe(false);
		expect(button.props.accessibilityLabel).toBe("Search");
		button.props.onPress();
	});

	it("covers the search debounce timer and its cleanup", () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		const setSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
			fn: any,
		) => {
			fn();
			return 0;
		}) as any);
		const clearSpy = vi
			.spyOn(globalThis, "clearTimeout")
			.mockImplementation(() => {});
		reactMocks.useEffect.mockImplementation((effect: () => void) => {
			const cleanup = effect() as unknown;
			if (typeof cleanup === "function") cleanup();
		});

		VaultScreen({
			navigation,
			route: { key: "vs3", name: "Vault", params: { kind: "CARD" } },
		} as any);

		expect(clearSpy).toHaveBeenCalled();
		setSpy.mockRestore();
		clearSpy.mockRestore();
	});

	it("covers VaultScreen load and delete error branches", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		hookMocks.confirm.mockImplementation(({ onConfirm }: any) =>
			onConfirm(),
		);
		serviceMocks.getPasswords.mockRejectedValueOnce(
			new Error("vault load failed"),
		);
		serviceMocks.deletePassword.mockRejectedValueOnce(
			new Error("vault delete failed"),
		);

		const setError = vi.fn();
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 1) {
				return [
					[
						{
							id: "p1",
							title: "Github",
							username: "u",
							password: "secret",
							updatedAt: 10,
						},
					],
					vi.fn(),
				];
			}
			if (call === 6) return ["", setError];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = VaultScreen({
			navigation,
			route: { key: "ve", name: "Vault", params: { kind: "PASSWORD" } },
		} as any);
		await flush();
		await flush();

		const screenList = findByPredicate(
			tree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		const renderedItem = screenList.props.renderItem({
			item: {
				kind: "PASSWORD",
				entry: {
					id: "p1",
					title: "Github",
					username: "u",
					password: "secret",
					updatedAt: 10,
				},
			},
		});
		findByPredicate(
			renderedItem,
			(node) =>
				node?.props?.label === "Delete" &&
				typeof node?.props?.onPress === "function",
		)[0]?.props?.onPress();
		await flush();

		expect(setError).toHaveBeenCalledWith("vault load failed");
		expect(setError).toHaveBeenCalledWith("vault delete failed");
	});

	it("renders vault notices without attachment indicators", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 2) {
				return [
					[
						{
							id: "c2",
							name: "Master",
							cardType: "DEBIT_CARD",
							cardNumber: "2222",
							expiry: "",
							cvv: "",
							pin: "",
							network: "",
						},
					],
					vi.fn(),
				];
			}
			if (call === 6) return ["error notice", vi.fn()];
			if (call === 7) return ["copied notice", vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const cardTree = VaultScreen({
			navigation,
			route: { key: "vb1", name: "Vault", params: { kind: "CARD" } },
		} as any);
		await flush();

		expect(
			findByPredicate(
				cardTree,
				(node) => node?.props?.message === "copied notice",
			),
		).not.toHaveLength(0);
		expect(
			findByPredicate(
				cardTree,
				(node) =>
					node?.props?.message === "error notice" &&
					node?.props?.tone === "danger",
			),
		).not.toHaveLength(0);

		const cardList = findByPredicate(
			cardTree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		const cardRow = cardList.props.renderItem({
			item: {
				kind: "CARD",
				entry: {
					id: "c2",
					name: "Master",
					cardType: "DEBIT_CARD",
					cardNumber: "2222",
					expiry: "",
					cvv: "",
					pin: "",
					network: "",
				},
			},
		});
		expect(String(JSON.stringify(cardRow))).not.toContain(
			'"name":"attach"',
		);
	});

	it("masks card details until the eye toggle reveals them", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		const setRevealedIds = vi.fn();
		const entry = {
			id: "c1",
			name: "Visa",
			cardType: "CREDIT_CARD",
			cardNumber: "4111 1111",
			expiry: "12/30",
			cvv: "111",
			pin: "0000",
			network: "VISA",
		};
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 2) return [[entry], vi.fn()];
			if (call === 8) return [new Set(), setRevealedIds];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const tree = VaultScreen({
			navigation,
			route: { key: "cm", name: "Vault", params: { kind: "CARD" } },
		} as any);
		await flush();

		const list = findByPredicate(
			tree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		const row = list.props.renderItem({ item: { kind: "CARD", entry } });
		expect(
			findByPredicate(row, (node) => node?.props?.isMasked === true),
		).toHaveLength(4);
		findByPredicate(
			row,
			(node) => node?.props?.accessibilityLabel === "Show card details",
		)[0]?.props?.onPress();
		const updater = setRevealedIds.mock.calls[0]?.[0] as (
			current: ReadonlySet<string>,
		) => ReadonlySet<string>;
		expect(updater(new Set())).toEqual(new Set(["c1"]));
		expect(updater(new Set(["c1"]))).toEqual(new Set());
	});

	it("shows card and password details when revealed", async () => {
		const navigation = { navigate: vi.fn(), setOptions: vi.fn() };
		const card = {
			id: "c1",
			name: "Visa",
			cardType: "CREDIT_CARD",
			cardNumber: "4111 1111",
			expiry: "12/30",
			cvv: "111",
			pin: "0000",
			network: "VISA",
		};
		const password = {
			id: "p1",
			title: "Github",
			username: "u",
			password: "secret",
			updatedAt: 10,
		};
		let call = 0;
		reactMocks.useState.mockImplementation((initial: any) => {
			call += 1;
			if (call === 1) return [[password], vi.fn()];
			if (call === 2) return [[card], vi.fn()];
			if (call === 8 || call === 16)
				return [new Set(["c1", "p1"]), vi.fn()];
			return [
				typeof initial === "function" ? initial() : initial,
				vi.fn(),
			];
		});

		const cardTree = VaultScreen({
			navigation,
			route: { key: "cr", name: "Vault", params: { kind: "CARD" } },
		} as any);
		await flush();
		const cardList = findByPredicate(
			cardTree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		const cardRow = cardList.props.renderItem({
			item: { kind: "CARD", entry: card },
		});
		expect(
			findByPredicate(cardRow, (node) => node?.props?.isMasked === false),
		).toHaveLength(4);
		expect(
			findByPredicate(
				cardRow,
				(node) =>
					node?.props?.accessibilityLabel === "Hide card details",
			),
		).toHaveLength(1);

		const passwordTree = VaultScreen({
			navigation,
			route: {
				key: "pr",
				name: "Vault",
				params: { kind: "PASSWORD" },
			},
		} as any);
		await flush();
		const passwordList = findByPredicate(
			passwordTree,
			(node) => typeof node?.props?.renderItem === "function",
		)[0];
		const passwordRow = passwordList.props.renderItem({
			item: { kind: "PASSWORD", entry: password },
		});
		expect(
			findByPredicate(
				passwordRow,
				(node) =>
					node?.props?.label === "Password" &&
					node?.props?.isMasked === false &&
					node?.props?.value === "secret",
			),
		).toHaveLength(1);
		const viewButton = findByPredicate(
			passwordRow,
			(node) => node?.props?.label === "Hide",
		)[0];
		expect(viewButton?.props?.icon).toBe("eye-off-outline");
		viewButton?.props?.onPress();

		const passwordlessRow = passwordList.props.renderItem({
			item: {
				kind: "PASSWORD",
				entry: { ...password, password: "" },
			},
		});
		expect(
			findByPredicate(
				passwordlessRow,
				(node) => node?.props?.label === "Password",
			),
		).toHaveLength(0);
	});
});
