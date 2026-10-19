import type IdentityEntry from "@/types/IdentityEntry";

type IdentityInput = Omit<IdentityEntry, "id" | "createdAt" | "updatedAt"> &
	Partial<Pick<IdentityEntry, "id">>;

export type { IdentityInput as default };
