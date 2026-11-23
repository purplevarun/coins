import {
	useCallback,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
	type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";

import ModalSheetContext from "@/providers/ModalSheetContext";
import type HostedSheet from "@/types/HostedSheet";

const ModalSheetProvider = ({ children }: PropsWithChildren): ReactNode => {
	const [stack, setStack] = useState<readonly HostedSheet[]>([]);
	const nextIdRef = useRef(0);

	const show = useCallback((sheet: ReactNode): number => {
		const id = ++nextIdRef.current;
		setStack((current) => [...current, { id, node: sheet }]);
		return id;
	}, []);

	const hide = useCallback((sheetId: number): void => {
		setStack((current) => current.filter((sheet) => sheet.id !== sheetId));
	}, []);

	const value = useMemo(() => ({ show, hide }), [show, hide]);
	const top = stack[stack.length - 1];

	return (
		<ModalSheetContext.Provider value={value}>
			{children}
			{top ? <View style={styles.host}>{top.node}</View> : null}
		</ModalSheetContext.Provider>
	);
};

const styles = StyleSheet.create({
	host: { ...StyleSheet.absoluteFill },
});

export default ModalSheetProvider;
