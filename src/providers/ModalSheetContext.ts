import { createContext } from "react";

import type ModalSheetContextValue from "@/types/ModalSheetContextValue";

const ModalSheetContext = createContext<ModalSheetContextValue | null>(null);

export default ModalSheetContext;
