import CustomText from "@/components/CustomText";
import { useEffect } from "react";
import {
	BackHandler,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";

import AppButton from "@/components/AppButton";
import GlassCard from "@/components/GlassCard";
import Notice from "@/components/Notice";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useModalSheet from "@/hooks/useModalSheet";
import useThemedStyles from "@/hooks/useThemedStyles";
import type FormModalProps from "@/types/FormModalProps";
import createThemedStyles from "@/utils/createThemedStyles";

const FormModal = ({
	children,
	confirmLabel,
	error,
	isLoading = false,
	isVisible,
	message,
	onClose,
	onConfirm,
	title,
	variant = "primary",
}: FormModalProps): null => {
	const styles = useThemedStyles(themedStyles);
	const sheetHost = useModalSheet();

	useEffect(() => {
		if (!isVisible) return undefined;
		const sheetId = sheetHost.show(
			<View style={styles.overlay}>
				<Pressable onPress={onClose} style={styles.scrim} />
				<View style={styles.cardHost}>
					<GlassCard
						accent={variant === "danger" ? "danger" : "warning"}
					>
						<ScrollView
							contentContainerStyle={styles.content}
							keyboardShouldPersistTaps="handled"
						>
							<View style={styles.copy}>
								<CustomText style={styles.title}>
									{title}
								</CustomText>
								<CustomText style={styles.message}>
									{message}
								</CustomText>
							</View>
							{children}
							{error ? (
								<Notice message={error} tone="danger" />
							) : null}
							<View style={styles.actions}>
								<AppButton
									isCompact
									label={MESSAGES.COMMON.CANCEL}
									onPress={onClose}
									variant="secondary"
								/>
								<AppButton
									isCompact
									isLoading={isLoading}
									label={confirmLabel}
									onPress={onConfirm}
									variant={variant}
								/>
							</View>
						</ScrollView>
					</GlassCard>
				</View>
			</View>,
		);
		const subscription = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				onClose();
				return true;
			},
		);
		return () => {
			subscription.remove();
			sheetHost.hide(sheetId);
		};
	});

	return null;
};

const { ALIGN, FLEX, FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT, SIZES, SPACING } =
	styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		overlay: {
			flex: FLEX.FILL,
			alignItems: ALIGN.CENTER,
			justifyContent: ALIGN.CENTER,
			padding: SPACING.S22,
			backgroundColor: COLORS.overlay,
		},
		scrim: {
			...StyleSheet.absoluteFill,
		},
		cardHost: {
			width: SIZES.FULL,
			maxWidth: SIZES.S420,
			maxHeight: SIZES.SHEET,
		},
		content: {
			gap: SPACING.S14,
		},
		copy: {
			gap: SPACING.S6,
		},
		title: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S20,
			fontWeight: FONT_WEIGHT.BLACK,
		},
		message: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S13,
			lineHeight: LINE_HEIGHT.S20,
		},
		actions: {
			flexDirection: FLEX.ROW,
			justifyContent: ALIGN.END,
			gap: SPACING.S8,
			marginTop: SPACING.S2,
		},
	}),
);

export default FormModal;
