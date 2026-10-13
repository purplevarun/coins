import type CategoryKind from "@/types/CategoryKind";
import type RelationModalProps from "@/types/RelationModalProps";

type CategoryMergeModalProps = RelationModalProps &
	Readonly<{
		kind: CategoryKind;
	}>;

export type { CategoryMergeModalProps as default };
