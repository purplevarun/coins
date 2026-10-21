import CustomText from "@/components/CustomText";
import type Folder from "@/types/Folder";
import type ListItemProps from "@/types/ListItemProps";

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import EmptyState from "@/components/EmptyState";
import FloatingAddButton from "@/components/FloatingAddButton";
import FolderFilterChips from "@/components/FolderFilterChips";
import GlassCard from "@/components/GlassCard";
import ListHeader from "@/components/ListHeader";
import Notice from "@/components/Notice";
import ScreenList from "@/components/ScreenList";
import folderConstants from "@/constants/folderConstants";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useFolders from "@/hooks/useFolders";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import todoService from "@/services/todoService";
import type Todo from "@/types/Todo";
import type TodosScreenProps from "@/types/TodosScreenProps";
import createThemedStyles from "@/utils/createThemedStyles";
import dateUtils from "@/utils/date";
import getErrorMessage from "@/utils/error";
import runAfterRender from "@/utils/runAfterRender";
const { FOLDER_FILTER_ALL, FOLDER_FILTER_NONE } = folderConstants;
const { getTodos, toggleTodo } = todoService;
const { formatDate } = dateUtils;

const TodosScreen = ({ navigation }: TodosScreenProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const { database, dataVersion, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const { folders, handleDeleteFolder, handleRenameFolder } =
		useFolders("TODO");
	const [todos, setTodos] = useState<readonly Todo[]>([]);
	const [selectedFolderId, setSelectedFolderId] = useState(FOLDER_FILTER_ALL);
	const [error, setError] = useState("");

	const getScreenData = useCallback(async (): Promise<void> => {
		try {
			setTodos(await getTodos(database));
			setError("");
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		}
	}, [database]);

	useEffect(
		() =>
			runAfterRender(() => {
				void getScreenData();
			}),
		[dataVersion, getScreenData],
	);

	const handleToggle = useCallback(
		async (id: string): Promise<void> => {
			try {
				await toggleTodo(database, id);
				refreshData();
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		},
		[database, refreshData],
	);

	const renderTodo = useCallback(
		({ item: todo }: ListItemProps<Todo>): React.JSX.Element => (
			<Pressable
				onPress={() =>
					navigation.navigate("TodoForm", {
						todoId: todo.id,
					})
				}
			>
				<GlassCard accent={todo.isDone ? "success" : "default"}>
					<View style={styles.row}>
						<Pressable
							onPress={() => void handleToggle(todo.id)}
							style={styles.checkbox}
						>
							<Ionicons
								color={
									todo.isDone
										? COLORS.success
										: COLORS.textMuted
								}
								name={
									todo.isDone
										? "checkmark-circle"
										: "ellipse-outline"
								}
								size={27}
							/>
						</Pressable>
						<View style={styles.details}>
							<View style={styles.headingRow}>
								<CustomText
									style={[
										styles.title,
										todo.isDone && styles.completedTitle,
									]}
								>
									{todo.title}
								</CustomText>
							</View>
							{todo.description ? (
								<CustomText style={styles.description}>
									{todo.description}
								</CustomText>
							) : null}
							<CustomText style={styles.meta}>
								{todo.folderName ?? MESSAGES.TODOS.NO_FOLDER}
								{todo.dueAt
									? ` · Due ${formatDate(todo.dueAt)}`
									: ""}
							</CustomText>
						</View>
					</View>
				</GlassCard>
			</Pressable>
		),
		[handleToggle, navigation, styles, COLORS],
	);

	const filteredTodos = useMemo(
		() =>
			todos.filter((todo) => {
				if (selectedFolderId === FOLDER_FILTER_ALL) {
					return true;
				}
				if (selectedFolderId === FOLDER_FILTER_NONE) {
					return !todo.folderId;
				}
				return todo.folderId === selectedFolderId;
			}),
		[selectedFolderId, todos],
	);

	const handleDeleteFolderWithConfirm = useCallback(
		(folder: Pick<Folder, "id" | "name">): void => {
			dialog.confirm({
				title: `Delete "${folder.name}"?`,
				message: MESSAGES.FOLDERS.DELETE_HINT,
				confirmLabel: MESSAGES.COMMON.DELETE,
				variant: "danger",
				onConfirm: () => {
					const processDelete = async (): Promise<void> => {
						try {
							await handleDeleteFolder(folder.id);
							if (selectedFolderId === folder.id) {
								setSelectedFolderId(FOLDER_FILTER_ALL);
							}
						} catch (caughtError: unknown) {
							setError(getErrorMessage(caughtError));
						}
					};
					void processDelete();
				},
			});
		},
		[dialog, handleDeleteFolder, selectedFolderId],
	);

	const handleRenameFolderWithModal = useCallback(
		(folder: Pick<Folder, "id" | "name">, newName: string): void => {
			const processRename = async (): Promise<void> => {
				try {
					await handleRenameFolder(folder.id, newName);
				} catch (caughtError: unknown) {
					setError(getErrorMessage(caughtError));
				}
			};
			void processRename();
		},
		[handleRenameFolder],
	);

	// Top-4 folders by todo count for quick chips
	const topFolderChips = useMemo(() => {
		const countMap = new Map<string, number>();
		for (const todo of todos) {
			if (todo.folderId) {
				countMap.set(
					todo.folderId,
					(countMap.get(todo.folderId) ?? 0) + 1,
				);
			}
		}
		return [...folders]
			.sort(
				(a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0),
			)
			.slice(0, 4);
	}, [folders, todos]);

	const listHeader = useMemo(
		() => (
			<ListHeader>
				<FolderFilterChips
					folders={folders}
					onDeleteFolder={handleDeleteFolderWithConfirm}
					onRenameFolder={handleRenameFolderWithModal}
					onSelectFolder={setSelectedFolderId}
					selectedFolderId={selectedFolderId}
				/>
				{topFolderChips.length > 0 ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.quickChipsRow}
					>
						{topFolderChips.map((folder) => {
							const isSelected = selectedFolderId === folder.id;
							return (
								<Pressable
									key={folder.id}
									onPress={() =>
										setSelectedFolderId(folder.id)
									}
									style={[
										styles.quickChip,
										isSelected && styles.quickChipSelected,
									]}
								>
									<CustomText
										style={[
											styles.quickChipLabel,
											isSelected &&
												styles.quickChipLabelSelected,
										]}
									>
										{folder.name}
									</CustomText>
								</Pressable>
							);
						})}
					</ScrollView>
				) : null}
				{error ? <Notice message={error} tone="danger" /> : null}
			</ListHeader>
		),
		[
			error,
			folders,
			handleDeleteFolderWithConfirm,
			handleRenameFolderWithModal,
			selectedFolderId,
			topFolderChips,
			styles,
		],
	);

	const listEmpty = useMemo(
		() => (
			<EmptyState
				icon="checkbox-outline"
				message={MESSAGES.TODOS.EMPTY_MESSAGE}
				title={MESSAGES.TODOS.EMPTY_TITLE}
			/>
		),
		[],
	);

	return (
		<View style={styles.screen}>
			<ScreenList
				ListEmptyComponent={listEmpty}
				ListHeaderComponent={listHeader}
				data={filteredTodos}
				extraData={dataVersion}
				keyExtractor={(todo) => todo.id}
				renderItem={renderTodo}
			/>
			<FloatingAddButton
				onPress={() => navigation.navigate("TodoForm")}
			/>
		</View>
	);
};

const {
	ALIGN,
	BORDER,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	LINE_HEIGHT,
	RADIUS,
	SPACING,
	TEXT_DECORATION,
} = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		screen: {
			flex: FLEX.FILL,
			backgroundColor: COLORS.background,
		},
		row: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.START,
			gap: SPACING.S10,
		},
		checkbox: {
			padding: SPACING.S2,
		},
		details: {
			flex: FLEX.FILL,
			gap: SPACING.S4,
		},
		headingRow: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S5,
		},
		title: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			fontWeight: FONT_WEIGHT.BLACK,
		},
		completedTitle: {
			color: COLORS.textMuted,
			textDecorationLine: TEXT_DECORATION.LINE_THROUGH,
		},
		description: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
			lineHeight: LINE_HEIGHT.S17,
		},
		meta: {
			color: COLORS.textDim,
			fontSize: FONT_SIZE.S10,
		},
		quickChipsRow: {
			marginTop: SPACING.S6,
			marginHorizontal: SPACING.N2,
		},
		quickChip: {
			marginHorizontal: SPACING.S2,
			paddingHorizontal: SPACING.S14,
			paddingVertical: SPACING.S7,
			borderRadius: RADIUS.PILL,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			backgroundColor: COLORS.surfaceFaint,
		},
		quickChipSelected: {
			borderColor: COLORS.borderStrong,
			backgroundColor: COLORS.primaryMuted,
		},
		quickChipLabel: {
			color: COLORS.textDim,
			fontSize: FONT_SIZE.S11,
			fontWeight: FONT_WEIGHT.BOLD,
		},
		quickChipLabelSelected: {
			color: COLORS.primaryBright,
		},
	}),
);

export default TodosScreen;
