import { useState } from "react";
import { StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import SelectField from "@/components/SelectField";
import TextField from "@/components/TextField";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import type InvestmentTypePickerProps from "@/types/InvestmentTypePickerProps";
import type SelectOption from "@/types/SelectOption";

const InvestmentTypePicker = ({
	value,
	investmentTypes,
	onChange,
	onCreateInvestmentType,
}: InvestmentTypePickerProps): React.JSX.Element => {
	const [isCreating, setIsCreating] = useState(false);
	const [typeName, setTypeName] = useState("");
	const options: readonly SelectOption[] = investmentTypes.map((type) => ({
		label: type.name,
		value: type.id,
	}));

	const handleCreate = async (): Promise<void> => {
		const id = await onCreateInvestmentType(typeName);
		onChange(id);
		setTypeName("");
		setIsCreating(false);
	};

	return (
		<View style={styles.container}>
			<SelectField
				isOptional
				label={MESSAGES.COMPONENTS.INVESTMENT_TYPE}
				onChange={onChange}
				options={options}
				placeholder={MESSAGES.INVESTMENTS.NO_TYPE}
				value={value}
			/>
			{isCreating ? (
				<View style={styles.creator}>
					<TextField
						label={MESSAGES.COMPONENTS.NEW_INVESTMENT_TYPE}
						onChangeText={setTypeName}
						placeholder={MESSAGES.COMPONENTS.TYPE_NAME}
						value={typeName}
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
					icon="pricetags-outline"
					isCompact
					label={MESSAGES.COMPONENTS.NEW_INVESTMENT_TYPE}
					onPress={() => setIsCreating(true)}
					variant="secondary"
				/>
			)}
		</View>
	);
};

const { ALIGN, FLEX, SPACING } = styleConstants;

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
});

export default InvestmentTypePicker;
