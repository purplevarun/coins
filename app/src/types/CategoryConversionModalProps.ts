import type Category from "@/types/Category";
import type RelationModalProps from "@/types/RelationModalProps";

type CategoryConversionModalProps = RelationModalProps &
	Readonly<{
		category: Pick<Category, "id" | "name">;
	}>;

export type { CategoryConversionModalProps as default };
