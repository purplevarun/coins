type Todo = Readonly<{
	id: string;
	folderId: string | null;
	folderName: string | null;
	title: string;
	description: string;
	isDone: boolean;
	dueAt: number | null;
	createdAt: number;
	updatedAt: number;
}>;

export type { Todo as default };
