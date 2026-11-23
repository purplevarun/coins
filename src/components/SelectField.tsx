import CustomText from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	BackHandler,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";

import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useModalSheet from "@/hooks/useModalSheet";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type SelectFieldProps from "@/types/SelectFieldProps";
import type SelectSheetProps from "@/types/SelectSheetProps";
import createThemedStyles from "@/utils/createThemedStyles";

const renderSwatches = (
	styles: (typeof themedStyles)[keyof typeof themedStyles],
	swatches?: readonly string[],
): React.JSX.Element | null =>
	swatches ? (
		<View style={styles.swatches}>
			{swatches.map((color) => (
				<View
					key={color}
					style={[styles.swatch, { backgroundColor: color }]}
				/>
			))}
		</View>
	) : null;

const SelectSheet = ({
	label,
	options,
	onSelect,
	onClose,
	value,
	isOptional = false,
	isSearchable = true,
}: SelectSheetProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const [search, setSearch] = useState("");

	const filteredOptions = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return options;
		return options.filter(
			(o) =>
				o.label.toLowerCase().includes(q) ||
				(o.description ?? "").toLowerCase().includes(q),
		);
	}, [options, search]);

	useEffect(() => {
		const subscription = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				onClose();
				return true;
			},
		);
		return () => subscription.remove();
	}, [onClose]);

	return (
		<Pressable onPress={onClose} style={styles.overlay}>
			<Pressable style={styles.sheet}>
				<CustomText style={styles.sheetTitle}>{label}</CustomText>
				{isSearchable ? (
					<CustomTextInput
						autoFocus
						onChangeText={setSearch}
						placeholder={MESSAGES.COMPONENTS.SEARCH_PLACEHOLDER}
						style={styles.searchInput}
						value={search}
					/>
				) : null}
				<ScrollView keyboardShouldPersistTaps="handled">
					{isOptional ? (
						<Pressable
							onPress={() => onSelect("")}
							style={styles.option}
						>
							<CustomText style={styles.optionText}>
								None
							</CustomText>
						</Pressable>
					) : null}
					{filteredOptions.length === 0 ? (
						<CustomText style={styles.noResults}>
							{search.trim()
								? `No results for "${search}"`
								: MESSAGES.COMPONENTS.NO_OPTIONS}
						</CustomText>
					) : null}
					{filteredOptions.map((option) => (
						<Pressable
							key={option.value}
							onPress={() => onSelect(option.value)}
							style={[
								styles.option,
								option.value === value && styles.selectedOption,
							]}
						>
							{renderSwatches(styles, option.swatches)}
							<View style={styles.optionContent}>
								<CustomText style={styles.optionText}>
									{option.label}
								</CustomText>
								{option.description ? (
									<CustomText style={styles.description}>
										{option.description}
									</CustomText>
								) : null}
							</View>
							{option.value === value ? (
								<Ionicons
									color={COLORS.primaryBright}
									name="checkmark-circle"
									size={20}
								/>
							) : null}
						</Pressable>
					))}
				</ScrollView>
			</Pressable>
		</Pressable>
	);
};

const SelectField = ({
	label,
	value,
	options,
	onChange,
	placeholder = MESSAGES.COMMON.SELECT,
	isOptional = false,
	isCompact = false,
	isSearchable = true,
	isDisabled = false,
}: SelectFieldProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const sheetHost = useModalSheet();
	const sheetIdRef = useRef(0);
	const selectedOption = options.find((option) => option.value === value);

	useEffect(
		() => () => {
			sheetHost.hide(sheetIdRef.current);
		},
		[sheetHost],
	);

	const handleOpen = (): void => {
		let sheetId = 0;
		const closeSheet = (): void => sheetHost.hide(sheetId);
		sheetId = sheetHost.show(
			<SelectSheet
				label={label}
				options={options}
				value={value}
				isOptional={isOptional}
				isSearchable={isSearchable}
				onSelect={(selectedValue) => {
					onChange(selectedValue);
					closeSheet();
				}}
				onClose={closeSheet}
			/>,
		);
		sheetIdRef.current = sheetId;
	};

	return (
		<View style={[styles.container, isCompact && styles.compactContainer]}>
			{!isCompact ? (
				<CustomText style={styles.label}>{label}</CustomText>
			) : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={`${label}: ${selectedOption?.label ?? placeholder}`}
				accessibilityState={{ disabled: isDisabled }}
				disabled={isDisabled}
				onPress={handleOpen}
				style={[
					styles.trigger,
					isCompact && styles.compactTrigger,
					isDisabled && styles.disabled,
				]}
			>
				{renderSwatches(styles, selectedOption?.swatches)}
				<CustomText
					style={[
						styles.triggerText,
						isCompact && styles.compactText,
						!selectedOption && styles.placeholder,
					]}
				>
					{selectedOption?.label ?? placeholder}
				</CustomText>
				<Ionicons
					color={COLORS.textMuted}
					name="chevron-down"
					size={18}
				/>
			</Pressable>
		</View>
	);
};

const {
	ALIGN,
	BORDER,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	LETTER_SPACING,
	OPACITY,
	RADIUS,
	SIZES,
	SPACING,
	TEXT_TRANSFORM,
} = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		disabled: {
			opacity: OPACITY.MEDIUM,
		},
		swatches: {
			flexDirection: FLEX.ROW,
			gap: SPACING.S4,
			flexShrink: 0,
		},
		swatch: {
			width: SIZES.S16,
			height: SIZES.S16,
			borderRadius: RADIUS.S4,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.borderStrong,
		},
		container: {
			gap: SPACING.S7,
			maxWidth: "100%",
		},
		compactContainer: {
			minWidth: 0,
			flexBasis: "auto",
			alignSelf: ALIGN.START,
			flexShrink: 1,
		},
		compactTrigger: {
			minHeight: SIZES.S44,
			borderRadius: RADIUS.S12,
			paddingHorizontal: SPACING.S8,
			gap: SPACING.S5,
		},
		compactText: {
			fontSize: FONT_SIZE.S13,
			fontWeight: FONT_WEIGHT.BOLD,
			flex: 0,
			flexShrink: 1,
		},
		label: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
			fontWeight: FONT_WEIGHT.BOLD,
			textTransform: TEXT_TRANSFORM.UPPERCASE,
			letterSpacing: LETTER_SPACING.WIDEST,
		},
		trigger: {
			minHeight: SIZES.S50,
			paddingVertical: SPACING.S8,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.borderStrong,
			borderRadius: RADIUS.S15,
			backgroundColor: COLORS.surfaceLight,
			paddingHorizontal: SPACING.S14,
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
			gap: SPACING.S8,
		},
		triggerText: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			flex: FLEX.FILL,
		},
		placeholder: {
			color: COLORS.textDim,
		},
		overlay: {
			flex: FLEX.FILL,
			backgroundColor: COLORS.overlayStrong,
			justifyContent: ALIGN.START,
			padding: SPACING.S16,
			paddingTop: SPACING.S56,
		},
		sheet: {
			maxHeight: SIZES.SHEET,
			borderRadius: RADIUS.S24,
			backgroundColor: COLORS.glassStrong,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.borderStrong,
			padding: SPACING.S16,
		},
		sheetTitle: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S20,
			fontWeight: FONT_WEIGHT.HEAVY,
			marginBottom: SPACING.S12,
		},
		searchInput: {
			backgroundColor: COLORS.surfaceHigh,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			borderRadius: RADIUS.S12,
			paddingHorizontal: SPACING.S12,
			paddingVertical: SPACING.S10,
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			marginBottom: SPACING.S8,
		},
		noResults: {
			color: COLORS.textDim,
			fontSize: FONT_SIZE.S13,
			padding: SPACING.S12,
			textAlign: ALIGN.CENTER,
		},
		option: {
			minHeight: SIZES.S54,
			padding: SPACING.S12,
			borderRadius: RADIUS.S14,
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
			gap: SPACING.S8,
		},
		selectedOption: {
			backgroundColor: COLORS.primaryMuted,
		},
		optionContent: {
			flex: FLEX.FILL,
			gap: SPACING.S3,
		},
		optionText: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			fontWeight: FONT_WEIGHT.BOLD,
		},
		description: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
		},
	}),
);

export default SelectField;
