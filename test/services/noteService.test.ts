import type TestAsyncFunction from "@test/types/TestAsyncFunction";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	deleteContentRow: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
	getNoteRow: vi.fn<TestAsyncFunction>().mockResolvedValue(null),
	getNoteRows: vi.fn<TestAsyncFunction>().mockResolvedValue([]),
	upsertNoteRow: vi.fn<TestAsyncFunction>().mockResolvedValue(undefined),
	createId: vi.fn(() => "note-id"),
}));

vi.mock("@/repositories/contentRepository", () => ({
	default: {
		deleteContentRow: mocks.deleteContentRow,
		getNoteRow: mocks.getNoteRow,
		getNoteRows: mocks.getNoteRows,
		upsertNoteRow: mocks.upsertNoteRow,
	},
}));

vi.mock("@/utils/id", () => ({
	default: mocks.createId,
}));

import noteService from "@/services/noteService";

const database = {} as any;

describe("noteService", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-25T12:00:00.000Z"));
		Object.values(mocks).forEach((mockFn) => mockFn.mockClear());
	});

	it("loads notes and handles missing records", async () => {
		mocks.getNoteRows.mockResolvedValueOnce([
			{
				id: "n1",
				title: "A",
				content: "B",
				folderId: null,
			},
		]);
		mocks.getNoteRow.mockResolvedValueOnce({
			id: "n2",
			title: "A",
			content: "B",
			folderId: null,
		});
		expect(await noteService.getNotes(database)).toMatchObject([
			{ id: "n1", title: "A", content: "B" },
		]);
		expect(await noteService.getNote(database, "n2")).toMatchObject({
			id: "n2",
			title: "A",
			content: "B",
		});
		mocks.getNoteRow.mockResolvedValueOnce(null);
		expect(await noteService.getNote(database, "missing")).toBeNull();
	});

	it("validates and creates note", async () => {
		await expect(
			noteService.saveNote(database, undefined, "   ", "x", undefined),
		).rejects.toMatchObject({
			code: "NOTE_TITLE_REQUIRED",
		});

		const id = await noteService.saveNote(
			database,
			undefined,
			"  Title  ",
			"  Content  ",
			undefined,
		);
		expect(id).toBe("note-id");
		expect(mocks.upsertNoteRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				id: "note-id",
				title: "Title",
				content: "Content",
				folderId: null,
				createdAt: new Date("2026-08-25T12:00:00.000Z").getTime(),
			}),
		);
	});

	it("updates existing note preserving createdAt", async () => {
		mocks.getNoteRow.mockResolvedValueOnce({
			id: "n1",
			title: "Old",
			content: "Old",
			folderId: "f1",
			createdAt: 123,
			updatedAt: 456,
		});

		const id = await noteService.saveNote(
			database,
			"n1",
			"  New  ",
			"  Body  ",
			"f2",
		);
		expect(id).toBe("n1");
		expect(mocks.upsertNoteRow).toHaveBeenCalledWith(
			database,
			expect.objectContaining({
				id: "n1",
				title: "New",
				content: "Body",
				folderId: "f2",
				createdAt: 123,
			}),
		);
	});

	it("deletes note through content repository", async () => {
		await noteService.deleteNote(database, "n1");
		expect(mocks.deleteContentRow).toHaveBeenCalledWith(
			database,
			"notes",
			"n1",
		);
	});
});
