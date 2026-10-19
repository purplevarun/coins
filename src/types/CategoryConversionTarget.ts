import type CategoryKind from "@/types/CategoryKind";

type CategoryConversionTarget = Readonly<{
	id: string | null;
	name: string;
	kind: CategoryKind;
}>;

export type { CategoryConversionTarget as default };
