import type Investment from "@/types/Investment";
import type RelationModalProps from "@/types/RelationModalProps";

type InvestmentConversionModalProps = RelationModalProps &
	Readonly<{
		investment: Pick<Investment, "id" | "name">;
	}>;

export type { InvestmentConversionModalProps as default };
