import type { ReactNode } from "react";

type ModalSheetContextValue = Readonly<{
	show: (sheet: ReactNode) => number;
	hide: (sheetId: number) => void;
}>;

export type { ModalSheetContextValue as default };
