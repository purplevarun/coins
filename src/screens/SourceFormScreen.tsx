import CustomText from "@/components/CustomText";

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import GlassCard from "@/components/GlassCard";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import TextField from "@/components/TextField";
import appConstants from "@/constants/appConstants";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useThemedStyles from "@/hooks/useThemedStyles";
import sourceService from "@/services/sourceService";
import type SourceFormScreenProps from "@/types/SourceFormScreenProps";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
const { DEFAULT_CURRENCY_CODE } = appConstants;
const { createSource, getSource, updateSourceName } = sourceService;

const SourceFormScreen = ({
	navigation,
	route,
}: SourceFormScreenProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	const { database, refreshData } = useDatabaseContext();
	const entityId = route.params?.entityId;
	const [name, setName] = useState("");
	const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY_CODE);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const getEntity = async (): Promise<void> => {
			if (!entityId) {
				return;
			}
			try {
				const source = await getSource(database, entityId);
				if (source) {
					setName(source.name);
					setCurrencyCode(source.currencyCode);
				}
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getEntity();
	}, [database, entityId]);

	const handleSave = async (): Promise<void> => {
		setIsSaving(true);
		setError("");
		try {
			if (entityId) {
				await updateSourceName(database, entityId, name);
			} else {
				await createSource(database, name, currencyCode);
			}
			// Bump dataVersion first so SourcesScreen reloads when we pop back
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

	return (
		<ScreenContainer>
			<GlassCard>
				<View style={styles.form}>
					<CustomText style={styles.heading}>
						{entityId
							? MESSAGES.RELATION_FORMS.EDIT_SOURCE
							: MESSAGES.RELATION_FORMS.NEW_SOURCE}
					</CustomText>
					<TextField
						label={MESSAGES.COMPONENTS.NAME}
						onChangeText={setName}
						placeholder={MESSAGES.RELATION_FORMS.SOURCE_NAME}
						value={name}
					/>
					<TextField
						autoCapitalize="characters"
						isEditable={!entityId}
						label={MESSAGES.COMPONENTS.CURRENCY}
						onChangeText={setCurrencyCode}
						placeholder={appConstants.DEFAULT_CURRENCY_CODE}
						value={currencyCode}
					/>
					{entityId ? (
						<Notice
							message={MESSAGES.RELATION_FORMS.CURRENCY_LOCKED}
						/>
					) : null}
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

const { FONT_SIZE, FONT_WEIGHT, LETTER_SPACING, SPACING } = styleConstants;

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
	}),
);

export default SourceFormScreen;
