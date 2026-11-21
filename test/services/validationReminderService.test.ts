import { beforeEach, describe, expect, it, vi } from "vitest";

const nativeMocks = vi.hoisted(() => ({
	scheduleValidationChecks: vi.fn(() => true),
	runValidationCheck: vi.fn(() => true),
	areNotificationsEnabled: vi.fn(() => true),
	requestNotificationPermission: vi.fn(() => true),
	requireNativeModule: vi.fn(),
}));

vi.mock("expo-modules-core", () => ({
	requireNativeModule: nativeMocks.requireNativeModule,
}));

const loadService = async (): Promise<
	(typeof import("@/services/validationReminderService"))["default"]
> => {
	vi.resetModules();
	const module = await import("@/services/validationReminderService");
	return module.default;
};

describe("validationReminderService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		nativeMocks.requireNativeModule.mockReturnValue(nativeMocks);
	});

	it("delegates to the native module when present", async () => {
		const service = await loadService();
		expect(nativeMocks.requireNativeModule).toHaveBeenCalledWith(
			"TransactionAlerts",
		);
		expect(service.scheduleValidationChecks()).toBe(true);
		expect(service.runValidationCheck()).toBe(true);
		expect(service.areNotificationsEnabled()).toBe(true);
		expect(service.requestNotificationPermission()).toBe(true);
	});

	it("initialize schedules checks, runs one, and requests permission", async () => {
		const service = await loadService();
		service.initialize();
		expect(nativeMocks.scheduleValidationChecks).toHaveBeenCalled();
		expect(nativeMocks.runValidationCheck).toHaveBeenCalled();
		expect(nativeMocks.requestNotificationPermission).toHaveBeenCalled();
	});

	it("falls back to safe defaults when the native module is missing", async () => {
		nativeMocks.requireNativeModule.mockImplementation(() => {
			throw new Error("unavailable");
		});
		const service = await loadService();
		expect(service.scheduleValidationChecks()).toBe(false);
		expect(service.runValidationCheck()).toBe(false);
		expect(service.areNotificationsEnabled()).toBe(false);
		expect(service.requestNotificationPermission()).toBe(false);
		expect(() => service.initialize()).not.toThrow();
	});
});
