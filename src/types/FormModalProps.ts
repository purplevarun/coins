import type ButtonVariant from "@/types/ButtonVariant";
import type { PropsWithChildren } from "react";

type FormModalProps = PropsWithChildren<
	Readonly<{
		title: string;
		message: string;
		confirmLabel: string;
		isVisible: boolean;
		onClose: () => void;
		onConfirm: () => void;
		error?: string;
		isLoading?: boolean;
		variant?: ButtonVariant;
	}>
>;

export type { FormModalProps as default };
