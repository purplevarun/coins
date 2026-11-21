import CustomText from "@/components/CustomText";

import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import GlassCard from "@/components/GlassCard";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import TextField from "@/components/TextField";
import financeConstants from "@/constants/financeConstants";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import categoryService from "@/services/categoryService";
import sectorService from "@/services/sectorService";
import type Category from "@/types/Category";
import type SectorFormScreenProps from "@/types/SectorFormScreenProps";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";

const { CATEGORY_KIND_LABELS } = financeConstants;
const { getCategories } = categoryService;
const { getSector, getSectorCategoryOwners, saveSector } = sectorService;

const SectorFormScreen = ({
	navigation,
	route,
}: SectorFormScreenProps): React.JSX.Element => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const { database, refreshData } = useDatabaseContext();
	const entityId = route.params?.entityId;
	const [name, setName] = useState("");
	const [categories, setCategories] = useState<readonly Category[]>([]);
	const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const [owners, setOwners] = useState<ReadonlyMap<string, string>>(
		new Map(),
	);

	useEffect(() => {
		const getEntity = async (): Promise<void> => {
			try {
				setOwners(await getSectorCategoryOwners(database));
				setCategories(
					(await getCategories(database))
						.slice()
						.sort((a, b) => a.name.localeCompare(b.name)),
				);
				if (entityId) {
					const loaded = await getSector(database, entityId);
					if (loaded) {
						setName(loaded.sector.name);
						setSelectedIds(new Set(loaded.categoryIds));
					}
				}
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getEntity();
	}, [database, entityId]);

	const groupedCategories = useMemo(() => {
		const groups = new Map<string, Category[]>();
		for (const category of categories) {
			const label = CATEGORY_KIND_LABELS[category.kind];
			groups.set(label, [...(groups.get(label) ?? []), category]);
		}
		return [...groups.entries()];
	}, [categories]);

	const toggleCategory = (id: string): void => {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleSave = async (): Promise<void> => {
		setIsSaving(true);
		setError("");
		try {
			await saveSector(database, entityId, name, [...selectedIds]);
			refreshData();
			await new Promise<void>((resolve) => setTimeout(resolve, 0));
			navigation.goBack();
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<ScreenContainer>
			<GlassCard>
				<View style={styles.form}>
					<CustomText style={styles.heading}>
						{entityId
							? MESSAGES.RELATION_FORMS.EDIT_SECTOR
							: MESSAGES.RELATION_FORMS.NEW_SECTOR}
					</CustomText>
					<TextField
						label={MESSAGES.COMPONENTS.NAME}
						onChangeText={setName}
						placeholder={MESSAGES.RELATION_FORMS.SECTOR_NAME}
						value={name}
					/>
					<View style={styles.picker}>
						<CustomText style={styles.pickerTitle}>
							{MESSAGES.RELATION_FORMS.SECTOR_CATEGORIES}
						</CustomText>
						{groupedCategories.map(([kindLabel, rows]) => (
							<View key={kindLabel} style={styles.group}>
								<CustomText style={styles.groupLabel}>
									{kindLabel}
								</CustomText>
								{rows.map((category) => {
									const selected = selectedIds.has(
										category.id,
									);
									const ownerName = owners.get(category.id);
									const taken = !!ownerName && !selected;
									return (
										<Pressable
											key={category.id}
											accessibilityRole="button"
											accessibilityState={{
												disabled: taken,
												selected,
											}}
											disabled={taken}
											onPress={() =>
												toggleCategory(category.id)
											}
											style={[
												styles.categoryRow,
												selected &&
													styles.categoryRowSelected,
												taken &&
													styles.categoryRowTaken,
											]}
										>
											<Ionicons
												color={
													selected || taken
														? COLORS.primary
														: COLORS.textMuted
												}
												name={
													selected || taken
														? "checkbox"
														: "square-outline"
												}
												size={20}
											/>
											<CustomText
												style={[
													styles.categoryName,
													taken &&
														styles.categoryNameTaken,
												]}
											>
												{category.name}
											</CustomText>
											{taken ? (
												<CustomText
													style={styles.ownerLabel}
												>
													{ownerName}
												</CustomText>
											) : null}
										</Pressable>
									);
								})}
							</View>
						))}
					</View>
					{error ? <Notice message={error} tone="danger" /> : null}
					<AppButton
						isLoading={isSaving}
						label={MESSAGES.COMMON.SAVE}
						onPress={() => void handleSave()}
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
	OPACITY,
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
		picker: {
			gap: SPACING.S12,
		},
		pickerTitle: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			fontWeight: FONT_WEIGHT.HEAVY,
		},
		group: {
			gap: SPACING.S4,
		},
		groupLabel: {
			color: COLORS.textMuted,
			fontSize: FONT_SIZE.S12,
			fontWeight: FONT_WEIGHT.BOLD,
		},
		categoryRow: {
			flexDirection: FLEX.ROW,
			alignItems: ALIGN.CENTER,
			gap: SPACING.S10,
			paddingVertical: SPACING.S8,
			paddingHorizontal: SPACING.S10,
			borderRadius: RADIUS.S12,
			borderWidth: BORDER.THIN,
			borderColor: COLORS.border,
		},
		categoryRowSelected: {
			borderColor: COLORS.primary,
			backgroundColor: COLORS.surfaceRaised,
		},
		categoryRowTaken: {
			opacity: OPACITY.MUTED,
		},
		categoryNameTaken: {
			color: COLORS.textMuted,
		},
		ownerLabel: {
			color: COLORS.textDim,
			fontSize: FONT_SIZE.S12,
		},
		categoryName: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S15,
			flex: FLEX.FILL,
		},
	}),
);

export default SectorFormScreen;
