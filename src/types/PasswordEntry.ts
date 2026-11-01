type PasswordEntry = Readonly<{
	id: string;
	title: string;
	username: string;
	password: string;
	lastPassword: string;
	createdAt: number;
	updatedAt: number;
}>;

export type { PasswordEntry as default };
