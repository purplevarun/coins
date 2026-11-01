import type CardEntry from "@/types/CardEntry";
import type PasswordEntry from "@/types/PasswordEntry";

type VaultListItem =
	| { kind: "PASSWORD"; entry: PasswordEntry }
	| { kind: "CARD"; entry: CardEntry };

export type { VaultListItem as default };
