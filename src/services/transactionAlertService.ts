import type TransactionAlert from "@/types/TransactionAlert";
import type TransactionAlertsNativeModule from "@/types/TransactionAlertsNativeModule";
import { requireNativeModule } from "expo-modules-core";

const nativeModule = ((): TransactionAlertsNativeModule | null => {
	try {
		return requireNativeModule<TransactionAlertsNativeModule>(
			"TransactionAlerts",
		);
	} catch {
		return null;
	}
})();

const isAlertAccessGranted = (): boolean =>
	nativeModule?.isAccessGranted() ?? false;

const openAlertAccessSettings = (): void => {
	nativeModule?.openAccessSettings();
};

const drainTransactionAlerts = (): readonly TransactionAlert[] =>
	nativeModule?.drainAlerts() ?? [];

const transactionAlertService = {
	drainTransactionAlerts,
	isAlertAccessGranted,
	openAlertAccessSettings,
};

export default transactionAlertService;
