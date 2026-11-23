import { useContext } from "react";

import ModalSheetContext from "@/providers/ModalSheetContext";
import type ModalSheetContextValue from "@/types/ModalSheetContextValue";

const useModalSheet = (): ModalSheetContextValue => {
	const context = useContext(ModalSheetContext);
	if (!context) {
		throw new Error(
			"useModalSheet must be used inside ModalSheetProvider.",
		);
	}
	return context;
};

export default useModalSheet;
