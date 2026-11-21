import type TransactionAlert from "@/types/TransactionAlert";

type TransactionAlertsNativeModule = {
	isAccessGranted: () => boolean;
	openAccessSettings: () => boolean;
	drainAlerts: () => TransactionAlert[];
	scheduleValidationChecks: () => boolean;
	runValidationCheck: () => boolean;
	areNotificationsEnabled: () => boolean;
	requestNotificationPermission: () => boolean;
};

export default TransactionAlertsNativeModule;
