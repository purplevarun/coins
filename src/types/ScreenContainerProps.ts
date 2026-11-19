import type { PropsWithChildren, ReactNode } from "react";

type ScreenContainerProps = PropsWithChildren<
	Readonly<{
		isScrollable?: boolean;
		header?: ReactNode;
		footer?: ReactNode;
	}>
>;

export type { ScreenContainerProps as default };
