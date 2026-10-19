import type CardEntry from "@/types/CardEntry";

type CardInput = Omit<CardEntry, "id" | "createdAt" | "updatedAt"> &
	Partial<Pick<CardEntry, "id">>;

export type { CardInput as default };
