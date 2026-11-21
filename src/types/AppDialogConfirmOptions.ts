import type ButtonVariant from "@/types/ButtonVariant";

type AppDialogConfirmOptions = Readonly<{
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel?: string;
	variant?: ButtonVariant;
	onConfirm: () => void;
	onDismiss?: () => void;
}>;

export type { AppDialogConfirmOptions as default };
