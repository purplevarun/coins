import type Sector from "@/types/Sector";

type SectorWithCategories = Readonly<{
	sector: Sector;
	categoryIds: readonly string[];
}>;

export type { SectorWithCategories as default };
