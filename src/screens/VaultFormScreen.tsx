import CustomText from "@/components/CustomText";

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import AppButton from "@/components/AppButton";
import GlassCard from "@/components/GlassCard";
import Notice from "@/components/Notice";
import ScreenContainer from "@/components/ScreenContainer";
import SelectField from "@/components/SelectField";
import TextField from "@/components/TextField";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import useAppDialog from "@/hooks/useAppDialog";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import useThemedStyles from "@/hooks/useThemedStyles";
import cardService from "@/services/cardService";
import passwordService from "@/services/passwordService";
import type VaultFormScreenProps from "@/types/VaultFormScreenProps";
import createThemedStyles from "@/utils/createThemedStyles";
import getErrorMessage from "@/utils/error";
const { deleteCard, getCard, saveCard } = cardService;
const { deletePassword, getPassword, savePassword } = passwordService;

const VaultFormScreen = ({
	navigation,
	route,
}: VaultFormScreenProps): React.JSX.Element => {
	const styles = useThemedStyles(themedStyles);
	const { kind, entryId } = route.params;
	const { database, refreshData } = useDatabaseContext();
	const dialog = useAppDialog();
	const [title, setTitle] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [cardNumber, setCardNumber] = useState("");
	const [cardType, setCardType] = useState<"CREDIT_CARD" | "DEBIT_CARD">(
		"CREDIT_CARD",
	);
	const [expiry, setExpiry] = useState("");
	const [cvv, setCvv] = useState("");
	const [pin, setPin] = useState("");
	const [network, setNetwork] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const getEntry = async (): Promise<void> => {
			if (!entryId) {
				return;
			}
			try {
				if (kind === "PASSWORD") {
					const entry = await getPassword(database, entryId);
					if (entry) {
						setTitle(entry.title);
						setUsername(entry.username);
						setPassword(entry.password);
					}
					return;
				}
				if (kind === "CARD") {
					const entry = await getCard(database, entryId);
					if (entry) {
						setTitle(entry.name);
						setCardNumber(entry.cardNumber);
						setCardType(entry.cardType);
						setExpiry(entry.expiry);
						setCvv(entry.cvv);
						setPin(entry.pin);
						setNetwork(entry.network);
					}
					return;
				}
			} catch (caughtError: unknown) {
				setError(getErrorMessage(caughtError));
			}
		};
		void getEntry();
	}, [database, entryId, kind]);

	const handleSave = async (): Promise<void> => {
		setIsSaving(true);
		setError("");
		try {
			if (kind === "PASSWORD") {
				await savePassword(database, {
					id: entryId,
					title,
					username,
					password,
				});
			} else {
				await saveCard(database, {
					id: entryId,
					name: title,
					cardType,
					cardNumber,
					expiry,
					cvv,
					pin,
					network,
				});
			}
			refreshData();
			navigation.goBack();
		} catch (caughtError: unknown) {
			setError(getErrorMessage(caughtError));
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = (targetEntryId: string): void => {
		dialog.confirm({
			title: MESSAGES.VAULT_FORM.DELETE_TITLE,
			message: MESSAGES.COMMON.IRREVERSIBLE,
			confirmLabel: MESSAGES.COMMON.DELETE,
			variant: "danger",
			onConfirm: () => {
				const processDelete = async (): Promise<void> => {
					try {
						if (kind === "PASSWORD") {
							await deletePassword(database, targetEntryId);
						} else {
							await deleteCard(database, targetEntryId);
						}
						refreshData();
						navigation.goBack();
					} catch (caughtError: unknown) {
						setError(getErrorMessage(caughtError));
					}
				};
				void processDelete();
			},
		});
	};

	return (
		<ScreenContainer>
			<GlassCard>
				<View style={styles.form}>
					<CustomText style={styles.heading}>
						{entryId ? MESSAGES.COMMON.EDIT : MESSAGES.COMMON.NEW}{" "}
						{kind.toLowerCase()}
					</CustomText>
					<TextField
						label={
							kind === "CARD"
								? MESSAGES.VAULT_FORM.CARD_NAME
								: "Title"
						}
						onChangeText={setTitle}
						placeholder={
							kind === "CARD"
								? MESSAGES.VAULT_FORM.CARD_NAME_PLACEHOLDER
								: MESSAGES.VAULT_FORM.ENTRY_TITLE
						}
						value={title}
					/>
					{kind === "PASSWORD" ? (
						<>
							<TextField
								autoCapitalize="none"
								label={MESSAGES.VAULT_FORM.USERNAME}
								onChangeText={setUsername}
								placeholder={
									MESSAGES.VAULT_FORM.USERNAME_PLACEHOLDER
								}
								value={username}
							/>
							<TextField
								autoCapitalize="none"
								isSecure
								label={MESSAGES.VAULT_FORM.PASSWORD}
								onChangeText={setPassword}
								placeholder={
									MESSAGES.VAULT_FORM.PASSWORD_PLACEHOLDER
								}
								value={password}
							/>
						</>
					) : null}
					{kind === "CARD" ? (
						<>
							<SelectField
								label={MESSAGES.VAULT_FORM.CARD_TYPE}
								onChange={(v) =>
									setCardType(
										v as "CREDIT_CARD" | "DEBIT_CARD",
									)
								}
								options={[
									{
										label: MESSAGES.VAULT.CREDIT_CARD,
										value: "CREDIT_CARD",
									},
									{
										label: MESSAGES.VAULT.DEBIT_CARD,
										value: "DEBIT_CARD",
									},
								]}
								value={cardType}
							/>
							<TextField
								keyboardType="number-pad"
								label={MESSAGES.VAULT.CARD_NUMBER}
								onChangeText={setCardNumber}
								placeholder={
									MESSAGES.VAULT_FORM.CARD_NUMBER_PLACEHOLDER
								}
								value={cardNumber}
							/>
							<TextField
								label={MESSAGES.VAULT_FORM.NETWORK}
								onChangeText={setNetwork}
								placeholder={
									MESSAGES.VAULT_FORM.NETWORK_PLACEHOLDER
								}
								value={network}
							/>
							<TextField
								label={MESSAGES.VAULT.EXPIRY}
								onChangeText={setExpiry}
								placeholder={
									MESSAGES.VAULT_FORM.EXPIRY_PLACEHOLDER
								}
								value={expiry}
							/>
							<TextField
								isSecure
								keyboardType="number-pad"
								label={MESSAGES.COMPONENTS.CVV}
								onChangeText={setCvv}
								placeholder={MESSAGES.COMPONENTS.CVV}
								value={cvv}
							/>
							<TextField
								isSecure
								keyboardType="number-pad"
								label={MESSAGES.COMPONENTS.PIN}
								onChangeText={setPin}
								placeholder={MESSAGES.COMPONENTS.PIN}
								value={pin}
							/>
						</>
					) : null}

					{error ? <Notice message={error} tone="danger" /> : null}
					<AppButton
						isLoading={isSaving}
						label={MESSAGES.VAULT_FORM.SAVE_ACTION}
						onPress={() => void handleSave()}
					/>
					{entryId ? (
						<AppButton
							label={MESSAGES.VAULT_FORM.DELETE_ACTION}
							onPress={() => handleDelete(entryId)}
							variant="danger"
						/>
					) : null}
				</View>
			</GlassCard>
		</ScreenContainer>
	);
};

const { FONT_SIZE, FONT_WEIGHT, SPACING, TEXT_TRANSFORM } = styleConstants;

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		form: {
			gap: SPACING.S16,
		},
		heading: {
			color: COLORS.text,
			fontSize: FONT_SIZE.S24,
			fontWeight: FONT_WEIGHT.BLACK,
			textTransform: TEXT_TRANSFORM.CAPITALIZE,
		},
	}),
);

export default VaultFormScreen;
