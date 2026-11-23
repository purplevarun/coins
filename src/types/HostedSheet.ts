import type { ReactNode } from "react";

type HostedSheet = Readonly<{
	id: number;
	node: ReactNode;
}>;

export type { HostedSheet as default };
