import typographyConstants from "@/constants/typography";

import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";

import HeaderIconButton from "@/components/HeaderIconButton";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import AnalysisDetailsScreen from "@/screens/AnalysisDetailsScreen";
import AnalysisScreen from "@/screens/AnalysisScreen";
import ArchivedRelationsScreen from "@/screens/ArchivedRelationsScreen";
import BudgetFormScreen from "@/screens/BudgetFormScreen";
import BudgetsScreen from "@/screens/BudgetsScreen";
import CategoriesScreen from "@/screens/CategoriesScreen";
import CategoryFormScreen from "@/screens/CategoryFormScreen";
import ExchangeRatesScreen from "@/screens/ExchangeRatesScreen";
import GlobalSearchScreen from "@/screens/GlobalSearchScreen";
import HomeScreen from "@/screens/HomeScreen";
import InvestmentFormScreen from "@/screens/InvestmentFormScreen";
import InvestmentsScreen from "@/screens/InvestmentsScreen";
import InvestmentTypesScreen from "@/screens/InvestmentTypesScreen";
import LinkedTransactionsScreen from "@/screens/LinkedTransactionsScreen";
import PlatformsScreen from "@/screens/PlatformsScreen";
import RelationDetailsScreen from "@/screens/RelationDetailsScreen";
import SectorFormScreen from "@/screens/SectorFormScreen";
import SectorsScreen from "@/screens/SectorsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import SourceFormScreen from "@/screens/SourceFormScreen";
import SourcesScreen from "@/screens/SourcesScreen";
import TransactionFormScreen from "@/screens/TransactionFormScreen";
import TransactionsScreen from "@/screens/TransactionsScreen";
import TripFormScreen from "@/screens/TripFormScreen";
import TripsScreen from "@/screens/TripsScreen";
import TripTypesScreen from "@/screens/TripTypesScreen";
import VaultFormScreen from "@/screens/VaultFormScreen";
import VaultScreen from "@/screens/VaultScreen";
import type RootStackParamList from "@/types/RootStackParamList";
const { FONT_FAMILY } = typographyConstants;
const { FONT_WEIGHT, SPACING } = styleConstants;

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const navigationTheme = {
		...DarkTheme,
		colors: {
			...DarkTheme.colors,
			background: COLORS.background,
			card: COLORS.backgroundElevated,
			border: COLORS.border,
			primary: COLORS.primary,
			text: COLORS.text,
			notification: COLORS.danger,
		},
	};

	return (
		<NavigationContainer theme={navigationTheme}>
			<Stack.Navigator
				initialRouteName="Home"
				screenOptions={({ navigation }) => ({
					contentStyle: { backgroundColor: COLORS.background },
					headerStyle: { backgroundColor: COLORS.backgroundElevated },
					headerTintColor: COLORS.text,
					headerShadowVisible: false,
					headerTitleStyle: {
						fontFamily: FONT_FAMILY,
						fontWeight: FONT_WEIGHT.HEAVY,
					},
					animation: "slide_from_right",
					headerBackVisible: false,
					headerLeft: () =>
						navigation.canGoBack() ? (
							<View style={{ marginRight: SPACING.S15 }}>
								<HeaderIconButton
									icon="chevron-back"
									onPress={() => navigation.goBack()}
									accessibilityLabel="Back"
								/>
							</View>
						) : null,
				})}
			>
				<Stack.Screen
					component={HomeScreen}
					name="Home"
					options={{ headerShown: false }}
				/>
				<Stack.Screen
					component={TransactionsScreen}
					name="Transactions"
					options={{ title: "Transactions" }}
				/>
				<Stack.Screen
					component={TransactionFormScreen}
					name="TransactionForm"
					options={({ route }) => ({
						title: route.params?.transactionId
							? MESSAGES.TRANSACTION_FORM.EDIT_TITLE
							: route.params?.cloneFromTransactionId
								? MESSAGES.TRANSACTION_FORM.CLONE_TITLE
								: MESSAGES.TRANSACTION_FORM.NEW_TITLE,
					})}
				/>
				<Stack.Screen
					component={SourcesScreen}
					name="Sources"
					options={{ title: "Sources" }}
				/>
				<Stack.Screen
					component={SourceFormScreen}
					name="SourceForm"
					options={({ route }) => ({
						title: route.params?.entityId
							? MESSAGES.RELATION_FORMS.EDIT_SOURCE
							: MESSAGES.RELATION_FORMS.NEW_SOURCE,
					})}
				/>
				<Stack.Screen
					component={CategoriesScreen}
					name="Categories"
					options={{ title: "Categories" }}
				/>
				<Stack.Screen
					component={CategoryFormScreen}
					name="CategoryForm"
					options={({ route }) => ({
						title: route.params?.entityId
							? MESSAGES.RELATION_FORMS.EDIT_CATEGORY
							: MESSAGES.RELATION_FORMS.NEW_CATEGORY,
					})}
				/>
				<Stack.Screen
					component={SectorsScreen}
					name="Sectors"
					options={{ title: "Sectors" }}
				/>
				<Stack.Screen
					component={SectorFormScreen}
					name="SectorForm"
					options={({ route }) => ({
						title: route.params?.entityId
							? MESSAGES.RELATION_FORMS.EDIT_SECTOR
							: MESSAGES.RELATION_FORMS.NEW_SECTOR,
					})}
				/>
				<Stack.Screen
					component={TripsScreen}
					name="Trips"
					options={{ title: "Trips" }}
				/>
				<Stack.Screen
					component={TripTypesScreen}
					name="TripTypes"
					options={({ route }) => ({
						title: route.params?.entityId
							? MESSAGES.RELATION_FORMS.EDIT_TRIP_TYPE
							: MESSAGES.RELATION_FORMS.NEW_TRIP_TYPE,
					})}
				/>
				<Stack.Screen
					component={TripFormScreen}
					name="TripForm"
					options={({ route }) => ({
						title: route.params?.entityId
							? MESSAGES.RELATION_FORMS.EDIT_TRIP
							: MESSAGES.RELATION_FORMS.NEW_TRIP,
					})}
				/>
				<Stack.Screen
					component={InvestmentsScreen}
					name="Investments"
					options={{ title: "Investments" }}
				/>
				<Stack.Screen
					component={InvestmentTypesScreen}
					name="InvestmentTypes"
					options={({ route }) => ({
						title: route.params?.entityId
							? MESSAGES.RELATION_FORMS.EDIT_INVESTMENT_TYPE
							: MESSAGES.RELATION_FORMS.NEW_INVESTMENT_TYPE,
					})}
				/>
				<Stack.Screen
					component={PlatformsScreen}
					name="Platforms"
					options={({ route }) => ({
						title: route.params?.entityId
							? MESSAGES.RELATION_FORMS.EDIT_PLATFORM
							: MESSAGES.RELATION_FORMS.NEW_PLATFORM,
					})}
				/>
				<Stack.Screen
					component={RelationDetailsScreen}
					name="RelationDetails"
					options={({ route }) => ({
						title: route.params.entityName,
					})}
				/>
				<Stack.Screen
					component={InvestmentFormScreen}
					name="InvestmentForm"
					options={({ route }) => ({
						title: route.params?.entityId
							? MESSAGES.RELATION_FORMS.EDIT_INVESTMENT
							: MESSAGES.RELATION_FORMS.NEW_INVESTMENT,
					})}
				/>
				<Stack.Screen
					component={ArchivedRelationsScreen}
					name="ArchivedRelations"
					options={{ title: "Archived relations" }}
				/>
				<Stack.Screen
					component={LinkedTransactionsScreen}
					name="LinkedTransactions"
					options={({ route }) => ({
						title: route.params.entityName,
					})}
				/>
				<Stack.Screen
					component={BudgetsScreen}
					name="Budgets"
					options={{ title: "Budgets" }}
				/>
				<Stack.Screen
					component={BudgetFormScreen}
					name="BudgetForm"
					options={({ route }) => ({
						title: route.params?.budgetId
							? MESSAGES.BUDGET_FORM.EDIT_TITLE
							: MESSAGES.BUDGET_FORM.NEW_TITLE,
					})}
				/>
				<Stack.Screen
					component={AnalysisScreen}
					name="Analysis"
					options={{ title: "Analysis" }}
				/>
				<Stack.Screen
					component={AnalysisDetailsScreen}
					name="AnalysisDetails"
					options={({ route }) => ({
						title:
							/* v8 ignore next */
							route.params.mode === "CATEGORIES"
								? "All categories"
								: route.params.mode === "SECTORS"
									? "All sectors"
									: "All investments",
					})}
				/>
				<Stack.Screen
					component={ExchangeRatesScreen}
					name="ExchangeRates"
					options={{ title: "Exchange rates" }}
				/>
				<Stack.Screen
					component={GlobalSearchScreen}
					name="GlobalSearch"
					options={{ title: "Search" }}
				/>
				<Stack.Screen
					component={VaultScreen}
					name="Vault"
					options={{ title: MESSAGES.HOME.VAULT_LABEL }}
				/>
				<Stack.Screen
					component={VaultFormScreen}
					name="VaultForm"
					options={({ route }) => ({
						title:
							route.params.kind === "PASSWORD"
								? route.params.entryId
									? MESSAGES.VAULT_FORM.EDIT_PASSWORD
									: MESSAGES.VAULT_FORM.NEW_PASSWORD
								: route.params.entryId
									? MESSAGES.VAULT_FORM.EDIT_CARD
									: MESSAGES.VAULT_FORM.NEW_CARD,
					})}
				/>
				<Stack.Screen
					component={SettingsScreen}
					name="Settings"
					options={{ title: "Settings & backup" }}
				/>
			</Stack.Navigator>
		</NavigationContainer>
	);
};

export default AppNavigator;
