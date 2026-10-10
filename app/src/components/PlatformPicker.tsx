import SelectField from "@/components/SelectField";
import MESSAGES from "@/constants/messageConstants";
import type PlatformPickerProps from "@/types/PlatformPickerProps";
import type React from "react";
import { View } from "react-native";

const PlatformPicker = ({
	platforms,
	value,
	onValueChange,
	placeholder,
}: PlatformPickerProps): React.JSX.Element => {
	return (
		<View>
			<SelectField
				label={MESSAGES.COMPONENTS.PLATFORM}
				isOptional
				value={value ?? ""}
				onChange={(id) => onValueChange(id || null)}
				placeholder={placeholder ?? MESSAGES.COMPONENTS.SELECT_PLATFORM}
				options={platforms
					.filter(
						(platform) =>
							!platform.archived || platform.id === value,
					)
					.map((platform) => ({
						label: platform.name,
						value: platform.id,
					}))}
			/>
		</View>
	);
};

export default PlatformPicker;
