import CustomText from "@/components/CustomText";

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import FolderPicker from "@/components/FolderPicker";
import GlassCard from "@/components/GlassCard";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import TextField from "@/components/TextField";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useFolders from "@/hooks/useFolders";
import useThemedStyles from "@/hooks/useThemedStyles";
import noteService from "@/services/noteService";
import type NoteFormScreenProps from "@/types/NoteFormScreenProps";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
const { deleteNote, getNote, saveNote } = noteService;

const NoteFormScreen = ({
	navigation,
	route,
}: NoteFormScreenProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	const noteId = route.params?.noteId;
	const { database, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const { folders, handleCreateFolder } = useFolders("NOTE");
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [folderId, setFolderId] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const getExistingNote = async (): Promise<void> => {
			if (!noteId) {
				return;
			}
			try {
				const note = await getNote(database, noteId);
				if (note) {
					setTitle(note.title);
					setContent(note.content);
					setFolderId(note.folderId ?? "");
				}
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getExistingNote();
	}, [database, noteId]);

	const handleSave = async (): Promise<void> => {
		setIsSaving(true);
		setError("");
		try {
			await saveNote(
				database,
				noteId,
				title,
				content,
				folderId || undefined,
			);
			refreshData();
			navigation.goBack();
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = (targetNoteId: string): void => {
		dialog.confirm({
			title: MESSAGES.NOTES.DELETE_TITLE,
			message: MESSAGES.COMMON.IRREVERSIBLE,
			confirmLabel: MESSAGES.COMMON.DELETE,
			variant: "danger",
			onConfirm: () => {
				const processDelete = async (): Promise<void> => {
					try {
						await deleteNote(database, targetNoteId);
						refreshData();
						navigation.goBack();
					} catch (caughtError: unknown) {
						setError(getErrorMessage(caughtError));
					}
				};
				void processDelete();
			},
		});
	};

	return (
		<ScreenContainer>
			<GlassCard>
				<View style={styles.form}>
					<CustomText style={styles.heading}>
						{noteId
							? MESSAGES.NOTES.EDIT_TITLE
							: MESSAGES.NOTES.NEW_TITLE}
					</CustomText>
					<TextField
						label={MESSAGES.COMPONENTS.TITLE}
						onChangeText={setTitle}
						placeholder={MESSAGES.NOTES.TITLE_PLACEHOLDER}
						value={title}
					/>
					<TextField
						isMultiline
						label={MESSAGES.NOTES.CONTENT_LABEL}
						onChangeText={setContent}
						placeholder={MESSAGES.NOTES.CONTENT_PLACEHOLDER}
						value={content}
					/>
					<FolderPicker
						folders={folders}
						onChange={setFolderId}
						onCreateFolder={handleCreateFolder}
						value={folderId}
					/>

					{error ? <Notice message={error} tone="danger" /> : null}
					<AppButton
						isLoading={isSaving}
						label={MESSAGES.NOTES.SAVE_ACTION}
						onPress={() => void handleSave()}
					/>
					{noteId ? (
						<AppButton
							label={MESSAGES.NOTES.DELETE_ACTION}
							onPress={() => handleDelete(noteId)}
							variant="danger"
						/>
					) : null}
				</View>
			</GlassCard>
		</ScreenContainer>
	);
};

const { FONT_SIZE, FONT_WEIGHT, SPACING } = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		form: {
			gap: SPACING.S16,
		},
		heading: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S24,
			fontWeight: FONT_WEIGHT.BLACK,
		},
	}),
);

export default NoteFormScreen;
