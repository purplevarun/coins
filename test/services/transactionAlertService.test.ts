import { beforeEach, describe, expect, it, vi } from "vitest";

const nativeMocks = vi.hoisted(() => ({
	isAccessGranted: vi.fn(() => true),
	openAccessSettings: vi.fn(() => true),
	openAppSettings: vi.fn(() => true),
	drainAlerts: vi.fn((): unknown[] => []),
	requireNativeModule: vi.fn(),
}));

vi.mock("expo-modules-core", () => ({
	requireNativeModule: nativeMocks.requireNativeModule,
}));

const loadService = async (): Promise<
	(typeof import("@/services/transactionAlertService"))["default"]
> => {
	vi.resetModules();
	const module = await import("@/services/transactionAlertService");
	return module.default;
};

describe("transactionAlertService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		nativeMocks.requireNativeModule.mockReturnValue(nativeMocks);
	});

	it("delegates to the native module when present", async () => {
		const alerts = [
			{
				type: "DEBIT" as const,
				amount: "120.50",
				reason: "Swiggy",
				packageName: "com.phonepe.app",
				postedAt: 123,
			},
		];
		nativeMocks.drainAlerts.mockReturnValue(alerts);
		const service = await loadService();
		expect(nativeMocks.requireNativeModule).toHaveBeenCalledWith(
			"TransactionAlerts",
		);
		expect(service.isAlertAccessGranted()).toBe(true);
		service.openAlertAccessSettings();
		expect(nativeMocks.openAccessSettings).toHaveBeenCalled();
		service.openAppSettings();
		expect(nativeMocks.openAppSettings).toHaveBeenCalled();
		expect(service.drainTransactionAlerts()).toEqual(alerts);
	});

	it("falls back to safe defaults when the native module is missing", async () => {
		nativeMocks.requireNativeModule.mockImplementation(() => {
			throw new Error("unavailable");
		});
		const service = await loadService();
		expect(service.isAlertAccessGranted()).toBe(false);
		expect(service.drainTransactionAlerts()).toEqual([]);
		expect(() => service.openAlertAccessSettings()).not.toThrow();
		expect(() => service.openAppSettings()).not.toThrow();
	});
});
