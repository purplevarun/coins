import { beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
	useCallback: vi.fn((fn: unknown) => fn),
	useEffect: vi.fn(),
	useRef: vi.fn((value: unknown) => ({ current: value })),
	useState: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
	addEventListener: vi.fn(),
	confirm: vi.fn(),
	drainTransactionAlerts: vi.fn((): unknown[] => []),
	navigate: vi.fn(),
	remove: vi.fn(),
	setQueue: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	return {
		...actual,
		useCallback: reactMocks.useCallback,
		useEffect: reactMocks.useEffect,
		useRef: reactMocks.useRef,
		useState: reactMocks.useState,
	};
});

vi.mock("react-native", () => ({
	AppState: { addEventListener: mocks.addEventListener },
}));

vi.mock("@react-navigation/native", () => ({
	useNavigation: () => ({ navigate: mocks.navigate }),
}));

vi.mock("@/hooks/useAppDialog", () => ({
	default: () => ({ confirm: mocks.confirm }),
}));

vi.mock("@/services/transactionAlertService", () => ({
	default: {
		drainTransactionAlerts: mocks.drainTransactionAlerts,
	},
}));

import TransactionAlertsController from "@/components/TransactionAlertsController";

const alert = {
	type: "DEBIT" as const,
	amount: "45.00",
	reason: "Cafe",
	packageName: "com.phonepe.app",
	postedAt: 1_700_000_000_000,
};

describe("TransactionAlertsController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.addEventListener.mockReturnValue({ remove: mocks.remove });
		mocks.drainTransactionAlerts.mockReturnValue([]);
		reactMocks.useState.mockImplementation((initial: unknown) => [
			initial,
			mocks.setQueue,
		]);
	});

	it("renders nothing, drains on mount, and subscribes to app state", () => {
		expect(TransactionAlertsController()).toBeNull();
		const effects = reactMocks.useEffect.mock.calls.map(
			(call) => call[0] as () => () => void,
		);
		const cleanup = effects[0]!();
		expect(mocks.drainTransactionAlerts).toHaveBeenCalled();
		expect(mocks.addEventListener).toHaveBeenCalledWith(
			"change",
			expect.any(Function),
		);
		const listener = mocks.addEventListener.mock.calls[0]![1] as (
			state: string,
		) => void;
		listener("background");
		expect(mocks.drainTransactionAlerts).toHaveBeenCalledTimes(1);
		listener("active");
		expect(mocks.drainTransactionAlerts).toHaveBeenCalledTimes(2);
		cleanup();
		expect(mocks.remove).toHaveBeenCalled();
	});

	it("appends drained alerts to the queue", () => {
		mocks.drainTransactionAlerts.mockReturnValue([alert]);
		TransactionAlertsController();
		const drainEffect = reactMocks.useEffect.mock
			.calls[0]![0] as () => void;
		drainEffect();
		const updater = mocks.setQueue.mock.calls[0]![0] as (
			current: readonly unknown[],
		) => readonly unknown[];
		expect(updater([])).toEqual([alert]);
	});

	it("prompts for the first queued alert and navigates on confirm", () => {
		reactMocks.useState.mockImplementation(() => [[alert], mocks.setQueue]);
		TransactionAlertsController();
		const promptEffect = reactMocks.useEffect.mock
			.calls[1]![0] as () => void;
		promptEffect();
		expect(mocks.confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Add transaction?",
			}),
		);
		const options = mocks.confirm.mock.calls[0]![0] as {
			onConfirm: () => void;
			onDismiss?: () => void;
		};
		options.onConfirm();
		expect(mocks.navigate).toHaveBeenCalledWith("TransactionForm", {
			initialType: "DEBIT",
			initialAmount: "45.00",
			initialReason: "Cafe",
			initialTransactionAt: alert.postedAt,
		});
		const dequeue = mocks.setQueue.mock.calls.at(-1)![0] as (
			current: readonly unknown[],
		) => readonly unknown[];
		expect(dequeue([alert, alert])).toEqual([alert]);
	});

	it("labels credited alerts as CREDIT", () => {
		const creditAlert = { ...alert, type: "CREDIT" as const };
		reactMocks.useState.mockImplementation(() => [
			[creditAlert],
			mocks.setQueue,
		]);
		TransactionAlertsController();
		(reactMocks.useEffect.mock.calls[1]![0] as () => void)();
		expect(mocks.confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("Credited"),
			}),
		);
	});

	it("advances the queue when the dialog is dismissed", () => {
		reactMocks.useState.mockImplementation(() => [[alert], mocks.setQueue]);
		TransactionAlertsController();
		(reactMocks.useEffect.mock.calls[1]![0] as () => void)();
		const options = mocks.confirm.mock.calls[0]![0] as {
			onDismiss?: () => void;
		};
		options.onDismiss?.();
		expect(mocks.navigate).not.toHaveBeenCalled();
		const dequeue = mocks.setQueue.mock.calls.at(-1)![0] as (
			current: readonly unknown[],
		) => readonly unknown[];
		expect(dequeue([alert])).toEqual([]);
	});

	it("does not re-prompt while a dialog is open", () => {
		reactMocks.useState.mockImplementation(() => [[alert], mocks.setQueue]);
		reactMocks.useRef.mockReturnValue({ current: true });
		TransactionAlertsController();
		(reactMocks.useEffect.mock.calls[1]![0] as () => void)();
		expect(mocks.confirm).not.toHaveBeenCalled();
	});
});
