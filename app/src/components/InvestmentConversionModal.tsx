import { useEffect, useState } from "react";

import FormModal from "@/components/FormModal";
import SegmentedControl from "@/components/SegmentedControl";
import SelectField from "@/components/SelectField";
import TextField from "@/components/TextField";
import financeConstants from "@/constants/financeConstants";
import MESSAGES from "@/constants/messageConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import categoryService from "@/services/categoryService";
import relationConversionService from "@/services/relationConversionService";
import type Category from "@/types/Category";
import type CategoryKind from "@/types/CategoryKind";
import type InvestmentConversionModalProps from "@/types/InvestmentConversionModalProps";
import getErrorMessage from "@/utils/error";

const {
	CATEGORY_KIND_LABELS,
	CATEGORY_KIND_OPTIONS,
	DEFAULT_CATEGORY_KIND,
	NEW_RELATION_OPTION_VALUE,
} = financeConstants;
const { RELATION_ACTIONS } = MESSAGES;
const { getCategories } = categoryService;
const { convertInvestmentToCategory } = relationConversionService;

const InvestmentConversionModal = ({
	investment,
	isVisible,
	onClose,
	onCompleted,
}: InvestmentConversionModalProps): React.JSX.Element => {
	const { database } = useDatabaseContext();
	const dialog = useAppDialog();
	const [categories, setCategories] = useState<readonly Category[]>([]);
	const [targetId, setTargetId] = useState(NEW_RELATION_OPTION_VALUE);
	const [name, setName] = useState("");
	const [kind, setKind] = useState<CategoryKind>(DEFAULT_CATEGORY_KIND);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!isVisible) return;
		const getOptions = async (): Promise<void> => {
			setError("");
			setTargetId(NEW_RELATION_OPTION_VALUE);
			setName(investment.name);
			setKind(DEFAULT_CATEGORY_KIND);
			try {
				setCategories(await getCategories(database));
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getOptions();
	}, [database, investment.name, isVisible]);

	const handleSubmit = async (): Promise<void> => {
		if (isSaving) return;
		setIsSaving(true);
		setError("");
		try {
			const isNew = targetId === NEW_RELATION_OPTION_VALUE;
			await convertInvestmentToCategory(database, investment.id, {
				id: isNew ? null : targetId,
				name,
				kind,
			});
			dialog.showMessage({
				title: RELATION_ACTIONS.CONVERTED_TITLE,
				message: RELATION_ACTIONS.INVESTMENT_CONVERTED_MESSAGE,
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
			confirmLabel={RELATION_ACTIONS.CONVERT}
			error={error}
			isLoading={isSaving}
			isVisible={isVisible}
			message={RELATION_ACTIONS.TO_CATEGORY_MESSAGE}
			onClose={onClose}
			onConfirm={() => void handleSubmit()}
			title={RELATION_ACTIONS.CONVERT_TO_CATEGORY}
			variant="danger"
		>
			<SelectField
				label={RELATION_ACTIONS.TARGET_CATEGORY}
				onChange={setTargetId}
				options={[
					{
						label: RELATION_ACTIONS.NEW_CATEGORY,
						value: NEW_RELATION_OPTION_VALUE,
					},
					...categories.map((category) => ({
						label: category.name,
						value: category.id,
						description: `${CATEGORY_KIND_LABELS[category.kind]} category`,
					})),
				]}
				value={targetId}
			/>
			{targetId === NEW_RELATION_OPTION_VALUE ? (
				<>
					<TextField
						label={MESSAGES.COMPONENTS.NAME}
						onChangeText={setName}
						placeholder={MESSAGES.RELATION_FORMS.CATEGORY_NAME}
						value={name}
					/>
					<SegmentedControl
						onChange={(value) => setKind(value as CategoryKind)}
						options={CATEGORY_KIND_OPTIONS}
						value={kind}
					/>
				</>
			) : null}
		</FormModal>
	);
};

export default InvestmentConversionModal;
