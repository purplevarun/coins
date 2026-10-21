import type AppButtonProps from "@/types/AppButtonProps";
import type { ReactElement } from "react";
import type { Mock } from "vitest";

type TransactionFormHarness = Readonly<{
	render: () => ReactElement;
	renderHeader: () => ReactElement<AppButtonProps> | null;
	values: Map<number, unknown>;
	navigation: Readonly<{ goBack: Mock; setOptions: Mock }>;
}>;

export type { TransactionFormHarness as default };
