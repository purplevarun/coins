import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import MESSAGES from "@/constants/messageConstants";
import useAppDialog from "@/hooks/useAppDialog";
import transactionAlertService from "@/services/transactionAlertService";
import validationReminderService from "@/services/validationReminderService";
import type RootStackParamList from "@/types/RootStackParamList";
import type TransactionAlert from "@/types/TransactionAlert";

const { ALERTS } = MESSAGES;

// Drains the native queue of parsed bank/UPI alerts whenever the app is
// (re)opened and offers each as a prefilled transaction.
const TransactionAlertsController = (): null => {
	const navigation = useNavigation<NavigationProp<RootStackParamList>>();
	const dialog = useAppDialog();
	const [queue, setQueue] = useState<readonly TransactionAlert[]>([]);
	const prompting = useRef(false);

	const drain = useCallback((): void => {
		const pending = transactionAlertService.drainTransactionAlerts();
		if (pending.length > 0) {
			setQueue((current) => [...current, ...pending]);
		}
	}, []);

	useEffect(() => {
		validationReminderService.initialize();
		// eslint-disable-next-line react-hooks/set-state-in-effect -- draining the persistent alert queue into state is the effect's purpose
		drain();
		const subscription = AppState.addEventListener(
			"change",
			(state) => state === "active" && drain(),
		);
		return () => subscription.remove();
	}, [drain]);

	const advance = useCallback((): void => {
		prompting.current = false;
		setQueue((current) => current.slice(1));
	}, []);

	useEffect(() => {
		const alert = queue[0];
		if (!alert || prompting.current) return;
		prompting.current = true;
		dialog.confirm({
			title: ALERTS.ADD_TITLE,
			message: `${alert.type === "DEBIT" ? ALERTS.DEBIT_LABEL : ALERTS.CREDIT_LABEL} ${alert.amount} · ${alert.reason}`,
			confirmLabel: MESSAGES.COMMON.ADD,
			cancelLabel: MESSAGES.COMMON.SKIP,
			onConfirm: () => {
				navigation.navigate("TransactionForm", {
					initialType: alert.type,
					initialAmount: alert.amount,
					initialReason: alert.reason,
					initialTransactionAt: alert.postedAt,
				});
				advance();
			},
			onDismiss: advance,
		});
	}, [advance, dialog, navigation, queue]);

	return null;
};

export default TransactionAlertsController;
