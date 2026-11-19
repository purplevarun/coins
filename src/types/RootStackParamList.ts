import type RelationKind from "@/types/RelationKind";
import type VaultKind from "@/types/VaultKind";

type RootStackParamList = {
	Home: undefined;
	Transactions: undefined;
	TransactionForm:
		| {
				transactionId?: string;
				cloneFromTransactionId?: string;
				initialTransactionAt?: number;
				initialSourceId?: string;
				initialCategoryId?: string;
		  }
		| undefined;
	Sources: undefined;
	SourceForm: { entityId?: string } | undefined;
	Categories: undefined;
	CategoryForm: { entityId?: string } | undefined;
	Sectors: undefined;
	SectorForm: { entityId?: string } | undefined;
	Trips: undefined;
	TripForm: { entityId?: string; tripTypeId?: string } | undefined;
	Investments: undefined;
	InvestmentForm:
		| { entityId?: string; platformId?: string; investmentTypeId?: string }
		| undefined;
	Platforms: { entityId?: string; entityName?: string } | undefined;
	InvestmentTypes: { entityId?: string; entityName?: string } | undefined;
	TripTypes: { entityId?: string; entityName?: string } | undefined;
	RelationDetails: {
		kind: "TRIP_TYPE" | "INVESTMENT_TYPE" | "PLATFORM";
		entityId: string;
		entityName: string;
	};
	ArchivedRelations: undefined;
	LinkedTransactions: {
		kind: RelationKind;
		entityId: string;
		entityName: string;
		dateRangeStart?: number;
		dateRangeEnd?: number;
		dateRangeLabel?: string;
		sortBy?: "DEBIT_DESC";
	};
	Budgets: undefined;
	BudgetForm: { budgetId?: string } | undefined;
	Analysis: undefined;
	AnalysisDetails: {
		mode: "CATEGORIES" | "INVESTMENTS" | "SECTORS";
		dateRangeStart?: number;
		dateRangeEnd?: number;
		dateRangeLabel?: string;
	};
	ExchangeRates: undefined;
	GlobalSearch: undefined;
	Vault: { kind: VaultKind };
	VaultForm: { kind: VaultKind; entryId?: string };
	Settings: undefined;
};

export type { RootStackParamList as default };
