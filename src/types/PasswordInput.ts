import type PasswordEntry from "@/types/PasswordEntry";

type PasswordInput = Omit<
	PasswordEntry,
	"id" | "createdAt" | "updatedAt" | "lastPassword"
> &
	Partial<Pick<PasswordEntry, "id">>;

export type { PasswordInput as default };
