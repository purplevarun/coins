import type HeaderIconButtonProps from "@/types/HeaderIconButtonProps";
import type { ReactElement } from "react";
import type { Mock } from "vitest";

type TransactionFormHarness = Readonly<{
	render: () => ReactElement;
	renderHeader: () => ReactElement<HeaderIconButtonProps> | null;
	renderHeaderSwitch: () => any;
	values: Map<number, unknown>;
	navigation: Readonly<{ goBack: Mock; setOptions: Mock }>;
}>;

export type { TransactionFormHarness as default };
