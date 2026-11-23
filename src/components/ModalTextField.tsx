import CustomText from "@/components/CustomText";
import CustomTextInput from "@/components/CustomTextInput";
import HeaderIconButton from "@/components/HeaderIconButton";
import MESSAGES from "@/constants/messageConstants";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
	BackHandler,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	View,
} from "react-native";

import styleConstants from "@/constants/styleConstants";
import useModalSheet from "@/hooks/useModalSheet";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type ModalFieldSheetProps from "@/types/ModalFieldSheetProps";
import type ModalTextFieldProps from "@/types/ModalTextFieldProps";
import createThemedStyles from "@/utils/createThemedStyles";

const ModalFieldSheet = ({
	label,
	initialValue,
	onCommit,
	placeholder,
	keyboardType = "default",
}: ModalFieldSheetProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	const [draft, setDraft] = useState(initialValue);

	const handleCommit = (): void => {
		onCommit(draft);
	};

	useEffect(() => {
		const subscription = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				onCommit(draft);
				return true;
			},
		);
		return () => subscription.remove();
	}, [draft, onCommit]);

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : undefined}
			style={styles.keyboardView}
		>
			<Pressable onPress={handleCommit} style={styles.overlay}>
				<Pressable style={styles.sheet}>
					<View style={styles.sheetHeader}>
						<CustomText style={styles.sheetTitle}>
							{label}
						</CustomText>
						<View style={styles.sheetActions}>
							<HeaderIconButton
								icon="trash-outline"
								accessibilityLabel={MESSAGES.COMMON.CLEAR}
								onPress={() => setDraft("")}
							/>
							<HeaderIconButton
								icon="checkmark"
								accessibilityLabel={MESSAGES.COMMON.DONE}
								onPress={handleCommit}
							/>
						</View>
					</View>
					<CustomTextInput
						autoFocus
						keyboardType={keyboardType}
						onChangeText={setDraft}
						onSubmitEditing={handleCommit}
						placeholder={placeholder}
						returnKeyType="done"
						style={styles.input}
						value={draft}
					/>
				</Pressable>
			</Pressable>
		</KeyboardAvoidingView>
	);
};

const ModalTextField = ({
	label,
	value,
	onChange,
	placeholder,
	keyboardType = "default",
	isCompact = false,
	isDisabled = false,
}: ModalTextFieldProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const sheetHost = useModalSheet();
	const sheetIdRef = useRef(0);

	useEffect(
		() => () => {
			sheetHost.hide(sheetIdRef.current);
		},
		[sheetHost],
	);

	const handleOpen = (): void => {
		let sheetId = 0;
		sheetId = sheetHost.show(
			<ModalFieldSheet
				label={label}
				initialValue={value}
				keyboardType={keyboardType}
				placeholder={placeholder}
				onCommit={(draft) => {
					onChange(draft);
					sheetHost.hide(sheetId);
				}}
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
				accessibilityLabel={`${label}: ${value || (placeholder ?? "")}`}
				accessibilityState={{ disabled: isDisabled }}
				disabled={isDisabled}
				onPress={handleOpen}
				style={[
					styles.trigger,
					isCompact && styles.compactTrigger,
					isDisabled && styles.disabled,
				]}
			>
				<CustomText
					style={[
						styles.triggerText,
						isCompact && styles.compactText,
						!value && styles.placeholder,
					]}
				>
					{value || placeholder}
				</CustomText>
				<Ionicons
					color={COLORS.textMuted}
					name="create-outline"
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
		keyboardView: {
			flex: FLEX.FILL,
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
			borderRadius: RADIUS.S24,
			backgroundColor: COLORS.glassStrong,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.borderStrong,
			padding: SPACING.S16,
		},
		sheetHeader: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.SPACE_BETWEEN,
			gap: SPACING.S8,
			marginBottom: SPACING.S12,
		},
		sheetActions: {
			flexDirection: FLEX.ROW,
			gap: SPACING.S8,
		},
		sheetTitle: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S20,
			fontWeight: FONT_WEIGHT.HEAVY,
			flex: FLEX.FILL,
		},
		input: {
			backgroundColor: COLORS.surfaceHigh,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			borderRadius: RADIUS.S12,
			paddingHorizontal: SPACING.S12,
			paddingVertical: SPACING.S10,
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
		},
	}),
);

export default ModalTextField;
