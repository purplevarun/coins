import { describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ View: "View" }));
vi.mock("@/components/HeaderIconButton", () => ({
	default: "HeaderIconButton",
}));
vi.mock("@/screens/PlatformsScreen", () => ({ default: "PlatformsScreen" }));
vi.mock("@/screens/TripTypesScreen", () => ({ default: "TripTypesScreen" }));
vi.mock("@/screens/InvestmentTypesScreen", () => ({
	default: "InvestmentTypesScreen",
}));
vi.mock("@/screens/RelationDetailsScreen", () => ({
	default: "RelationDetailsScreen",
}));

vi.mock("@/constants/typography", () => ({
	default: {
		FONT_FAMILY: "Rubik-SemiBold",
	},
}));

vi.mock("@react-navigation/native", () => ({
	DarkTheme: {
		dark: true,
		colors: {
			background: "dark-bg",
			card: "dark-card",
			border: "dark-border",
			primary: "dark-primary",
			text: "dark-text",
		},
	},
	DefaultTheme: { dark: false, colors: {} },
	NavigationContainer: "NavigationContainer",
}));

vi.mock("@react-navigation/native-stack", () => ({
	createNativeStackNavigator: () => ({
		Navigator: "Navigator",
		Screen: "Screen",
	}),
}));

vi.mock("@/screens/AnalysisScreen", () => ({ default: "AnalysisScreen" }));
vi.mock("@/screens/AnalysisDetailsScreen", () => ({
	default: "AnalysisDetailsScreen",
}));
vi.mock("@/screens/ArchivedRelationsScreen", () => ({
	default: "ArchivedRelationsScreen",
}));
vi.mock("@/screens/BudgetFormScreen", () => ({ default: "BudgetFormScreen" }));
vi.mock("@/screens/BudgetsScreen", () => ({ default: "BudgetsScreen" }));
vi.mock("@/screens/CategoriesScreen", () => ({ default: "CategoriesScreen" }));
vi.mock("@/screens/CategoryFormScreen", () => ({
	default: "CategoryFormScreen",
}));
vi.mock("@/screens/ExchangeRatesScreen", () => ({
	default: "ExchangeRatesScreen",
}));
vi.mock("@/screens/GlobalSearchScreen", () => ({
	default: "GlobalSearchScreen",
}));
vi.mock("@/screens/HomeScreen", () => ({ default: "HomeScreen" }));
vi.mock("@/screens/InvestmentFormScreen", () => ({
	default: "InvestmentFormScreen",
}));
vi.mock("@/screens/InvestmentsScreen", () => ({
	default: "InvestmentsScreen",
}));
vi.mock("@/screens/LinkedTransactionsScreen", () => ({
	default: "LinkedTransactionsScreen",
}));
vi.mock("@/screens/SectorFormScreen", () => ({
	default: "SectorFormScreen",
}));
vi.mock("@/screens/SectorsScreen", () => ({ default: "SectorsScreen" }));
vi.mock("@/screens/SettingsScreen", () => ({ default: "SettingsScreen" }));
vi.mock("@/screens/SourceFormScreen", () => ({
	default: "SourceFormScreen",
}));
vi.mock("@/screens/SourcesScreen", () => ({ default: "SourcesScreen" }));
vi.mock("@/screens/TransactionFormScreen", () => ({
	default: "TransactionFormScreen",
}));
vi.mock("@/screens/TransactionsScreen", () => ({
	default: "TransactionsScreen",
}));
vi.mock("@/screens/TripFormScreen", () => ({ default: "TripFormScreen" }));
vi.mock("@/screens/TripsScreen", () => ({ default: "TripsScreen" }));
vi.mock("@/screens/VaultFormScreen", () => ({ default: "VaultFormScreen" }));
vi.mock("@/screens/VaultScreen", () => ({ default: "VaultScreen" }));

import themeConstants from "@/constants/themeConstants";
import THEME_PALETTES from "@/constants/themePaletteConstants";
import useTheme from "@/hooks/useTheme";
import AppNavigator from "@/navigation/AppNavigator";

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

describe("AppNavigator", () => {
	it.each(themeConstants.THEME_OPTIONS)(
		"themes navigation and headers for $label",
		({ value }) => {
			const theme = THEME_PALETTES[value];
			vi.mocked(useTheme).mockReturnValue(theme);
			const tree = AppNavigator();
			const container = findAllByType(tree, "NavigationContainer")[0];
			expect(container.props.theme.dark).toBe(theme.isDark);
			expect(container.props.theme.colors).toMatchObject({
				background: theme.colors.background,
				text: theme.colors.text,
				notification: theme.colors.danger,
			});
			const options = findAllByType(
				tree,
				"Navigator",
			)[0].props.screenOptions({ navigation: {} });
			expect(options.headerStyle.backgroundColor).toBe(
				theme.colors.backgroundElevated,
			);
			expect(options.headerTintColor).toBe(theme.colors.text);
			vi.mocked(useTheme).mockReturnValue(
				THEME_PALETTES[themeConstants.DEFAULT_THEME_ID],
			);
		},
	);

	it("wires screens, theme, and dynamic title options", () => {
		const tree = AppNavigator();
		const containers = findAllByType(tree, "NavigationContainer");
		expect(containers).toHaveLength(1);
		expect(containers[0]?.props?.theme?.colors?.background).toBe("#1C1C1C");

		const navigators = findAllByType(tree, "Navigator");
		expect(navigators).toHaveLength(1);
		expect(navigators[0]?.props?.initialRouteName).toBe("Home");
		const navigation = { canGoBack: vi.fn(() => true), goBack: vi.fn() };
		const options = navigators[0]?.props?.screenOptions({ navigation });
		expect(options.headerTitleStyle.fontFamily).toBe("Rubik-SemiBold");
		options.headerLeft().props.children.props.onPress();
		expect(navigation.goBack).toHaveBeenCalledOnce();
		navigation.canGoBack.mockReturnValue(false);
		expect(options.headerLeft()).toBeNull();

		const screens = findAllByType(tree, "Screen");
		expect(screens).toHaveLength(28);

		const byName = (name: string): any =>
			screens.find((screen) => screen?.props?.name === name);
		const transactionOptions = byName("TransactionForm").props.options;
		expect(transactionOptions({ route: { params: undefined } }).title).toBe(
			"New transaction",
		);
		expect(transactionOptions({ route: { params: {} } }).title).toBe(
			"New transaction",
		);
		expect(
			transactionOptions({
				route: { params: { transactionId: "transaction" } },
			}).title,
		).toBe("Edit transaction");
		expect(
			transactionOptions({
				route: { params: { cloneFromTransactionId: "transaction" } },
			}).title,
		).toBe("Clone transaction");
		expect(
			transactionOptions({
				route: {
					params: {
						transactionId: "edit",
						cloneFromTransactionId: "clone",
					},
				},
			}).title,
		).toBe("Edit transaction");
		expect(
			byName("RelationDetails")?.props?.options({
				route: { params: { entityName: "Holiday" } },
			}).title,
		).toBe("Holiday");
		for (const [name, newTitle, editTitle] of [
			["SourceForm", "New source", "Edit source"],
			["CategoryForm", "New category", "Edit category"],
			["TripTypes", "New trip type", "Edit trip type"],
			["TripForm", "New trip", "Edit trip"],
			["InvestmentTypes", "New investment type", "Edit investment type"],
			["InvestmentForm", "New investment", "Edit investment"],
			[
				"Platforms",
				"New investment platform",
				"Edit investment platform",
			],
			["SectorForm", "New sector", "Edit sector"],
		] as const) {
			const options = byName(name)?.props?.options;
			expect(options({ route: { params: undefined } }).title).toBe(
				newTitle,
			);
			expect(options({ route: { params: {} } }).title).toBe(newTitle);
			expect(
				options({ route: { params: { entityId: "entity" } } }).title,
			).toBe(editTitle);
		}

		expect(byName("AnalysisDetails")).toBeTruthy();
		expect(
			byName("AnalysisDetails")?.props?.options({
				route: { params: { mode: "CATEGORIES" } },
			}).title,
		).toBe("All categories");
		expect(
			byName("AnalysisDetails")?.props?.options({
				route: { params: { mode: "INVESTMENTS" } },
			}).title,
		).toBe("All investments");

		expect(byName("Transactions")?.props?.options?.title).toBe(
			"Transactions",
		);
		expect(byName("Sources")?.props?.options?.title).toBe("Sources");
		expect(byName("Categories")?.props?.options?.title).toBe("Categories");
		expect(byName("Sectors")?.props?.options?.title).toBe("Sectors");
		expect(byName("Trips")?.props?.options?.title).toBe("Trips");
		expect(byName("Investments")?.props?.options?.title).toBe(
			"Investments",
		);
		expect(
			byName("LinkedTransactions")?.props?.options({
				route: { params: { entityName: "Rent" } },
			}).title,
		).toBe("Rent");
		expect(byName("GlobalSearch")?.props?.options?.title).toBe("Search");
		expect(byName("Vault")?.props?.options?.title).toBe("Vault");

		const budgetFormOptions = byName("BudgetForm")?.props?.options;
		expect(budgetFormOptions({ route: { params: {} } }).title).toBe(
			"New budget",
		);
		expect(
			budgetFormOptions({ route: { params: { budgetId: "b1" } } }).title,
		).toBe("Edit budget");

		const vaultFormOptions = byName("VaultForm")?.props?.options;
		expect(
			vaultFormOptions({ route: { params: { kind: "PASSWORD" } } }).title,
		).toBe("New password");
		expect(
			vaultFormOptions({
				route: { params: { kind: "PASSWORD", entryId: "p1" } },
			}).title,
		).toBe("Edit password");
		expect(
			vaultFormOptions({ route: { params: { kind: "CARD" } } }).title,
		).toBe("New card");
		expect(
			vaultFormOptions({
				route: { params: { kind: "CARD", entryId: "c1" } },
			}).title,
		).toBe("Edit card");
	});
});
