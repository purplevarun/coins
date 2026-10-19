import { useEffect, useState } from "react";

import FormModal from "@/components/FormModal";
import SelectField from "@/components/SelectField";
import MESSAGES from "@/constants/messageConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import categoryService from "@/services/categoryService";
import type Category from "@/types/Category";
import type CategoryMergeModalProps from "@/types/CategoryMergeModalProps";
import type SelectOption from "@/types/SelectOption";
import getErrorMessage from "@/utils/error";

const { RELATION_ACTIONS } = MESSAGES;
const { getCategories, mergeCategories } = categoryService;

const CategoryMergeModal = ({
	isVisible,
	kind,
	onClose,
	onCompleted,
}: CategoryMergeModalProps): React.JSX.Element => {
	const { database } = useDatabaseContext();
	const dialog = useAppDialog();
	const [categories, setCategories] = useState<readonly Category[]>([]);
	const [sourceId, setSourceId] = useState("");
	const [targetId, setTargetId] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const toOption = (category: Category): SelectOption => ({
		label: category.name,
		value: category.id,
	});
	const targets = categories.filter((category) => category.id !== sourceId);

	useEffect(() => {
		if (!isVisible) return;
		const getOptions = async (): Promise<void> => {
			setError("");
			setSourceId("");
			setTargetId("");
			try {
				setCategories(await getCategories(database, kind));
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getOptions();
	}, [database, isVisible, kind]);

	const handleSourceChange = (value: string): void => {
		setSourceId(value);
		if (value === targetId) setTargetId("");
	};

	const handleSubmit = async (): Promise<void> => {
		if (isSaving) return;
		setIsSaving(true);
		setError("");
		try {
			await mergeCategories(database, sourceId, targetId);
			dialog.showMessage({
				title: RELATION_ACTIONS.MERGED_TITLE,
				message: RELATION_ACTIONS.MERGED_MESSAGE,
				variant: "success",
			});
			onCompleted();
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<FormModal
			confirmLabel={RELATION_ACTIONS.MERGE}
			error={error}
			isLoading={isSaving}
			isVisible={isVisible}
			message={RELATION_ACTIONS.MERGE_MESSAGE}
			onClose={onClose}
			onConfirm={() => void handleSubmit()}
			title={RELATION_ACTIONS.MERGE_CATEGORIES}
			variant="danger"
		>
			<SelectField
				label={RELATION_ACTIONS.MERGE_CATEGORY}
				onChange={handleSourceChange}
				options={categories.map(toOption)}
				placeholder={RELATION_ACTIONS.SELECT_CATEGORY}
				value={sourceId}
			/>
			<SelectField
				label={RELATION_ACTIONS.INTO_CATEGORY}
				onChange={setTargetId}
				options={targets.map(toOption)}
				placeholder={
					targets.length
						? RELATION_ACTIONS.SELECT_CATEGORY
						: RELATION_ACTIONS.NO_MERGE_TARGETS
				}
				value={targetId}
			/>
		</FormModal>
	);
};

export default CategoryMergeModal;
