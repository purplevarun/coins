import CustomText from "@/components/CustomText";

import type { SQLiteDatabase } from "expo-sqlite";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import AppButton from "@/components/AppButton";
import AttachmentField from "@/components/AttachmentField";
import DateField from "@/components/DateField";
import FolderPicker from "@/components/FolderPicker";
import GlassCard from "@/components/GlassCard";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import TextField from "@/components/TextField";
import COLORS from "@/constants/colors";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useAttachment from "@/hooks/useAttachment";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useFolders from "@/hooks/useFolders";
import todoService from "@/services/todoService";
import type TodoFormScreenProps from "@/types/TodoFormScreenProps";
import getErrorMessage from "@/utils/error";
const { deleteTodo, getTodo, saveTodo } = todoService;

const runInTransaction = async (
	database: SQLiteDatabase,
	operation: () => Promise<void>,
): Promise<void> => {
	if (typeof database.withTransactionAsync === "function") {
		await database.withTransactionAsync(operation);
		return;
	}
	await operation();
};

const TodoFormScreen = ({
	navigation,
	route,
}: TodoFormScreenProps): React.JSX.Element => {
	const todoId = route.params?.todoId;
	const { database, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const { folders, handleCreateFolder } = useFolders("TODO");
	const attachment = useAttachment("TODO", todoId);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [folderId, setFolderId] = useState("");
	const [isDone, setIsDone] = useState(false);
	const [hasDueDate, setHasDueDate] = useState(false);
	const [dueAt, setDueAt] = useState(() => Date.now());
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const getExistingTodo = async (): Promise<void> => {
			if (!todoId) {
				return;
			}
			try {
				const todo = await getTodo(database, todoId);
				if (todo) {
					setTitle(todo.title);
					setDescription(todo.description);
					setFolderId(todo.folderId ?? "");
					setIsDone(todo.isDone);
					setHasDueDate(todo.dueAt !== null);
					setDueAt(todo.dueAt ?? Date.now());
				}
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getExistingTodo();
	}, [database, todoId]);

	const handleSave = async (): Promise<void> => {
		setIsSaving(true);
		setError("");
		try {
			await runInTransaction(database, async () => {
				const savedId = await saveTodo(database, {
					id: todoId,
					title,
					description,
					folderId: folderId || undefined,
					dueAt: hasDueDate ? dueAt : undefined,
					isDone,
				});
				await attachment.processAttachment(savedId);
			});
			refreshData();
			navigation.goBack();
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = (targetTodoId: string): void => {
		dialog.confirm({
			title: MESSAGES.TODOS.DELETE_TITLE,
			message: MESSAGES.COMMON.IRREVERSIBLE,
			confirmLabel: MESSAGES.COMMON.DELETE,
			variant: "danger",
			onConfirm: () => {
				const processDelete = async (): Promise<void> => {
					try {
						await deleteTodo(database, targetTodoId);
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
						{todoId
							? MESSAGES.TODOS.EDIT_TITLE
							: MESSAGES.TODOS.NEW_TITLE}
					</CustomText>
					<TextField
						label={MESSAGES.COMPONENTS.TITLE}
						onChangeText={setTitle}
						placeholder={MESSAGES.TODOS.TITLE_PLACEHOLDER}
						value={title}
					/>
					<TextField
						isMultiline
						label={MESSAGES.TODOS.DESCRIPTION_LABEL}
						onChangeText={setDescription}
						placeholder={MESSAGES.TODOS.DESCRIPTION_PLACEHOLDER}
						value={description}
					/>
					<FolderPicker
						folders={folders}
						onChange={setFolderId}
						onCreateFolder={handleCreateFolder}
						value={folderId}
					/>
					<View style={styles.switchRow}>
						<CustomText style={styles.switchLabel}>
							Due date
						</CustomText>
						<Switch
							onValueChange={setHasDueDate}
							value={hasDueDate}
						/>
					</View>
					{hasDueDate ? (
						<DateField
							label={MESSAGES.COMPONENTS.DUE}
							onChange={setDueAt}
							value={dueAt}
						/>
					) : null}
					<View style={styles.switchRow}>
						<CustomText style={styles.switchLabel}>
							Completed
						</CustomText>
						<Switch onValueChange={setIsDone} value={isDone} />
					</View>
					<AttachmentField
						existingAttachment={attachment.existingAttachment}
						isRemoved={attachment.isRemoved}
						onSend={() => void attachment.handleSend()}
						onView={attachment.handleOpen}
						onPick={() => void attachment.handlePick()}
						onRemove={attachment.handleRemove}
						pendingAttachment={attachment.pendingAttachment}
					/>
					{error ? <Notice message={error} tone="danger" /> : null}
					<AppButton
						isLoading={isSaving}
						label={MESSAGES.TODOS.SAVE_ACTION}
						onPress={() => void handleSave()}
					/>
					{todoId ? (
						<AppButton
							label={MESSAGES.TODOS.DELETE_ACTION}
							onPress={() => handleDelete(todoId)}
							variant="danger"
						/>
					) : null}
				</View>
			</GlassCard>
		</ScreenContainer>
	);
};

const { ALIGN, BORDER, FLEX, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } =
	styleConstants;

const styles = StyleSheet.create({
	form: {
		gap: SPACING.S16,
	},
	heading: {
		color: COLORS.text,
		fontSize: FONT_SIZE.S24,
		fontWeight: FONT_WEIGHT.BLACK,
	},
	switchRow: {
		flexDirection: FLEX.ROW,
		alignItems: ALIGN.CENTER,
		justifyContent: ALIGN.SPACE_BETWEEN,
		padding: SPACING.S12,
		borderRadius: RADIUS.S14,
		borderWidth: BORDER.THIN,
		borderColor: COLORS.border,
	},
	switchLabel: {
		color: COLORS.text,
		fontSize: FONT_SIZE.S14,
		fontWeight: FONT_WEIGHT.HEAVY,
	},
});

export default TodoFormScreen;
