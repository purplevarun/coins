import { useEffect, useState } from "react";

import FormModal from "@/components/FormModal";
import PlatformPicker from "@/components/PlatformPicker";
import SelectField from "@/components/SelectField";
import TextField from "@/components/TextField";
import financeConstants from "@/constants/financeConstants";
import MESSAGES from "@/constants/messageConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import investmentService from "@/services/investmentService";
import investmentTypeService from "@/services/investmentTypeService";
import platformService from "@/services/platformService";
import relationConversionService from "@/services/relationConversionService";
import type CategoryConversionModalProps from "@/types/CategoryConversionModalProps";
import type Investment from "@/types/Investment";
import type InvestmentType from "@/types/InvestmentType";
import type Platform from "@/types/Platform";
import getErrorMessage from "@/utils/error";

const { NEW_RELATION_OPTION_VALUE } = financeConstants;
const { RELATION_ACTIONS } = MESSAGES;
const { getInvestments } = investmentService;
const { getInvestmentTypes } = investmentTypeService;
const { getPlatforms } = platformService;
const { convertCategoryToInvestment } = relationConversionService;

const CategoryConversionModal = ({
	category,
	isVisible,
	onClose,
	onCompleted,
}: CategoryConversionModalProps): React.JSX.Element => {
	const { database } = useDatabaseContext();
	const dialog = useAppDialog();
	const [investments, setInvestments] = useState<readonly Investment[]>([]);
	const [platforms, setPlatforms] = useState<readonly Platform[]>([]);
	const [investmentTypes, setInvestmentTypes] = useState<
		readonly InvestmentType[]
	>([]);
	const [targetId, setTargetId] = useState(NEW_RELATION_OPTION_VALUE);
	const [name, setName] = useState("");
	const [platformId, setPlatformId] = useState("");
	const [investmentTypeId, setInvestmentTypeId] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const isNew = targetId === NEW_RELATION_OPTION_VALUE;

	useEffect(() => {
		if (!isVisible) return;
		const getOptions = async (): Promise<void> => {
			setError("");
			setTargetId(NEW_RELATION_OPTION_VALUE);
			setName(category.name);
			setPlatformId("");
			setInvestmentTypeId("");
			try {
				const [loadedInvestments, loadedPlatforms, loadedTypes] =
					await Promise.all([
						getInvestments(database),
						getPlatforms(database),
						getInvestmentTypes(database),
					]);
				setInvestments(loadedInvestments);
				setPlatforms(loadedPlatforms);
				setInvestmentTypes(loadedTypes);
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getOptions();
	}, [category.name, database, isVisible]);

	const handleSubmit = async (): Promise<void> => {
		if (isSaving) return;
		setIsSaving(true);
		setError("");
		try {
			await convertCategoryToInvestment(database, category.id, {
				id: isNew ? null : targetId,
				name,
				investmentTypeId: investmentTypeId || null,
				platformId: platformId || null,
			});
			dialog.showMessage({
				title: RELATION_ACTIONS.CONVERTED_TITLE,
				message: RELATION_ACTIONS.CATEGORY_CONVERTED_MESSAGE,
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
			message={RELATION_ACTIONS.TO_INVESTMENT_MESSAGE}
			onClose={onClose}
			onConfirm={() => void handleSubmit()}
			title={RELATION_ACTIONS.CONVERT_TO_INVESTMENT}
			variant="danger"
		>
			<SelectField
				label={RELATION_ACTIONS.TARGET_INVESTMENT}
				onChange={setTargetId}
				options={[
					{
						label: RELATION_ACTIONS.NEW_INVESTMENT,
						value: NEW_RELATION_OPTION_VALUE,
					},
					...investments.map((investment) => ({
						label: investment.name,
						value: investment.id,
					})),
				]}
				value={targetId}
			/>
			{isNew ? (
				<>
					<TextField
						label={MESSAGES.COMPONENTS.NAME}
						onChangeText={setName}
						placeholder={MESSAGES.RELATION_FORMS.INVESTMENT_NAME}
						value={name}
					/>
					<PlatformPicker
						onValueChange={(value) => setPlatformId(value ?? "")}
						platforms={platforms}
						value={platformId}
					/>
					<SelectField
						isOptional
						label={MESSAGES.RELATION_FORMS.INVESTMENT_TYPE}
						onChange={setInvestmentTypeId}
						options={investmentTypes.map((type) => ({
							label: type.name,
							value: type.id,
						}))}
						placeholder={MESSAGES.INVESTMENTS.NO_TYPE}
						value={investmentTypeId}
					/>
				</>
			) : null}
		</FormModal>
	);
};

export default CategoryConversionModal;
