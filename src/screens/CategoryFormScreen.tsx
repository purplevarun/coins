import CustomText from "@/components/CustomText";

import { useEffect, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import AppButton from "@/components/AppButton";
import GlassCard from "@/components/GlassCard";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import SegmentedControl from "@/components/SegmentedControl";
import TextField from "@/components/TextField";
import financeConstants from "@/constants/financeConstants";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import categoryService from "@/services/categoryService";
import type CategoryFormScreenProps from "@/types/CategoryFormScreenProps";
import type CategoryKind from "@/types/CategoryKind";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
const { CATEGORY_KIND_OPTIONS, DEFAULT_CATEGORY_KIND } = financeConstants;
const { getCategory, saveCategory } = categoryService;

const CategoryFormScreen = ({
	navigation,
	route,
}: CategoryFormScreenProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	const { colors: COLORS } = useTheme();
	const { database, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const entityId = route.params?.entityId;
	const [name, setName] = useState("");
	const [kind, setKind] = useState<CategoryKind>(DEFAULT_CATEGORY_KIND);
	const [originalKind, setOriginalKind] = useState<CategoryKind>(
		DEFAULT_CATEGORY_KIND,
	);
	const [tripAgnostic, setTripAgnostic] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const getEntity = async (): Promise<void> => {
			if (!entityId) {
				return;
			}
			try {
				const category = await getCategory(database, entityId);
				if (category) {
					setName(category.name);
					setKind(category.kind);
					setOriginalKind(category.kind);
					setTripAgnostic(Boolean(category.tripAgnostic));
				}
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getEntity();
	}, [database, entityId]);

	const processSave = async (): Promise<void> => {
		setIsSaving(true);
		setError("");
		try {
			await saveCategory(database, entityId, name, kind, tripAgnostic);
			// Bump dataVersion first so CategoriesScreen reloads when we pop back
			refreshData();
			// Small delay to ensure the state update propagates before navigation
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
			navigation.goBack();
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		} finally {
			setIsSaving(false);
		}
	};

	const handleSave = (): void => {
		const hasClassificationChanged =
			Boolean(entityId) && kind !== originalKind;
		if (!hasClassificationChanged) {
			void processSave();
			return;
		}
		dialog.confirm({
			title: MESSAGES.RELATION_FORMS.RECLASSIFY_TITLE,
			message: MESSAGES.RELATION_FORMS.RECLASSIFY_MESSAGE,
			confirmLabel: MESSAGES.COMMON.CHANGE,
			variant: "danger",
			onConfirm: () => void processSave(),
		});
	};

	return (
		<ScreenContainer>
			<GlassCard>
				<View style={styles.form}>
					<CustomText style={styles.heading}>
						{entityId
							? MESSAGES.RELATION_FORMS.EDIT_CATEGORY
							: MESSAGES.RELATION_FORMS.NEW_CATEGORY}
					</CustomText>
					<TextField
						label={MESSAGES.COMPONENTS.NAME}
						onChangeText={setName}
						placeholder={MESSAGES.RELATION_FORMS.CATEGORY_NAME}
						value={name}
					/>
					<View style={styles.switchRow}>
						<View style={styles.switchText}>
							<CustomText style={styles.switchTitle}>
								Category kind
							</CustomText>
							<CustomText style={styles.switchDescription}>
								Controls which analysis bucket receives this
								category. Refund categories are excluded from
								analysis.
							</CustomText>
						</View>
						<SegmentedControl
							onChange={(value) => setKind(value as CategoryKind)}
							options={CATEGORY_KIND_OPTIONS}
							value={kind}
						/>
					</View>
					<View style={styles.switchRow}>
						<View style={styles.switchContent}>
							<View style={styles.switchText}>
								<CustomText style={styles.switchTitle}>
									Trip agnostic
								</CustomText>
								<CustomText style={styles.switchDescription}>
									Transactions using this category cannot be
									tagged to a trip.
								</CustomText>
							</View>
							<Switch
								accessibilityLabel="Trip agnostic"
								value={tripAgnostic}
								onValueChange={setTripAgnostic}
								disabled={isSaving}
								trackColor={{
									false: COLORS.borderStrong,
									true: COLORS.primaryMuted,
								}}
								thumbColor={
									tripAgnostic
										? COLORS.primary
										: COLORS.textMuted
								}
							/>
						</View>
					</View>
					{error ? <Notice message={error} tone="danger" /> : null}
					<AppButton
						isLoading={isSaving}
						label={MESSAGES.COMMON.SAVE}
						onPress={handleSave}
					/>
				</View>
			</GlassCard>
		</ScreenContainer>
	);
};

const {
	ALIGN,
	BORDER,
	FLEX,
	FONT_SIZE,
	FONT_WEIGHT,
	LETTER_SPACING,
	LINE_HEIGHT,
	RADIUS,
	SPACING,
} = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		form: {
			gap: SPACING.S16,
		},
		heading: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S24,
			fontWeight: FONT_WEIGHT.BLACK,
			letterSpacing: LETTER_SPACING.TIGHT,
		},
		switchRow: {
			gap: SPACING.S12,
			padding: SPACING.S14,
			borderRadius: RADIUS.S15,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
			backgroundColor: COLORS.surfaceSoft,
		},
		switchContent: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S12,
		},
		switchText: {
			flex: FLEX.FILL,
			gap: SPACING.S4,
		},
		switchTitle: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			fontWeight: FONT_WEIGHT.HEAVY,
		},
		switchDescription: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
			lineHeight: LINE_HEIGHT.S17,
		},
	}),
);

export default CategoryFormScreen;
