import CustomText from "@/components/CustomText";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import SelectField from "@/components/SelectField";
import TextField from "@/components/TextField";
import COLORS from "@/constants/colors";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import type FolderPickerProps from "@/types/FolderPickerProps";
import type SelectOption from "@/types/SelectOption";

const FolderPicker = ({
	value,
	folders,
	onChange,
	onCreateFolder,
}: FolderPickerProps): React.JSX.Element => {
	const [isCreating, setIsCreating] = useState(false);
	const [folderName, setFolderName] = useState("");
	const options: readonly SelectOption[] = folders.map((folder) => ({
		label: folder.name,
		value: folder.id,
	}));

	const handleCreate = async (): Promise<void> => {
		const id = await onCreateFolder(folderName);
		onChange(id);
		setFolderName("");
		setIsCreating(false);
	};

	return (
		<View style={styles.container}>
			<SelectField
				isOptional
				label={MESSAGES.COMPONENTS.FOLDER}
				onChange={onChange}
				options={options}
				placeholder={MESSAGES.COMPONENTS.NO_FOLDER}
				value={value}
			/>
			{isCreating ? (
				<View style={styles.creator}>
					<TextField
						label={MESSAGES.COMPONENTS.NEW_FOLDER}
						onChangeText={setFolderName}
						placeholder={MESSAGES.COMPONENTS.FOLDER_NAME}
						value={folderName}
					/>
					<View style={styles.actions}>
						<AppButton
							isCompact
							label={MESSAGES.COMMON.CANCEL}
							onPress={() => setIsCreating(false)}
							variant="secondary"
						/>
						<AppButton
							isCompact
							label={MESSAGES.COMMON.CREATE}
							onPress={() => void handleCreate()}
						/>
					</View>
				</View>
			) : (
				<AppButton
					icon="folder-open-outline"
					isCompact
					label={MESSAGES.COMPONENTS.NEW_FOLDER}
					onPress={() => setIsCreating(true)}
					variant="secondary"
				/>
			)}
			<CustomText style={styles.hint}>
				Folders with linked items cannot be deleted.
			</CustomText>
		</View>
	);
};

const { ALIGN, FLEX, FONT_SIZE, SPACING } = styleConstants;

const styles = StyleSheet.create({
	container: {
		gap: SPACING.S9,
	},
	creator: {
		gap: SPACING.S9,
	},
	actions: {
		flexDirection: FLEX.ROW,
		justifyContent: ALIGN.END,
		gap: SPACING.S8,
	},
	hint: {
		color: COLORS.textDim,
		fontSize: FONT_SIZE.S11,
	},
});

export default FolderPicker;
