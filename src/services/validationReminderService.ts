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

const scheduleValidationChecks = (): boolean =>
	nativeModule?.scheduleValidationChecks() ?? false;

const runValidationCheck = (): boolean =>
	nativeModule?.runValidationCheck() ?? false;

const areNotificationsEnabled = (): boolean =>
	nativeModule?.areNotificationsEnabled() ?? false;

const requestNotificationPermission = (): boolean =>
	nativeModule?.requestNotificationPermission() ?? false;

// Schedules the hourly background check, runs one immediately, and asks for
// notification permission once — safe to call on every app start.
const initialize = (): void => {
	scheduleValidationChecks();
	runValidationCheck();
	requestNotificationPermission();
};

const validationReminderService = {
	areNotificationsEnabled,
	initialize,
	requestNotificationPermission,
	runValidationCheck,
	scheduleValidationChecks,
};

export default validationReminderService;
