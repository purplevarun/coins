import type CardEntry from "@/types/CardEntry";
import type PasswordEntry from "@/types/PasswordEntry";

type VaultListItem =
	| { kind: "PASSWORD"; entry: PasswordEntry }
	| { kind: "CARD_HEADER"; label: string }
	| { kind: "CARD"; entry: CardEntry };

export type { VaultListItem as default };
