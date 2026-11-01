import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, View } from "react-native";

import CustomText from "@/components/CustomText";
import appConstants from "@/constants/appConstants";
import COLORS from "@/constants/colors";
import MESSAGES from "@/constants/messageConstants";
import styleConstants from "@/constants/styleConstants";
import { vacuumDatabaseIfNeeded } from "@/database/initializeDatabase";
import DatabaseContext from "@/providers/DatabaseContext";
import type DatabaseContextValue from "@/types/DatabaseContextValue";
import type DatabaseProviderProps from "@/types/DatabaseProviderProps";

const { VACUUM_NOTICE_MS } = appConstants;

const DatabaseProvider = ({
	children,
	database,
}: DatabaseProviderProps): ReactNode => {
	const [dataVersion, setDataVersion] = useState(0);
	const [vacuumNoticeVisible, setVacuumNoticeVisible] = useState(false);
	const vacuumNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	useEffect(() => {
		const runVacuum = (): void => {
			void vacuumDatabaseIfNeeded(database)
				.then((didVacuum) => {
					if (!didVacuum) return;
					setVacuumNoticeVisible(true);
					if (vacuumNoticeTimer.current)
						clearTimeout(vacuumNoticeTimer.current);
					vacuumNoticeTimer.current = setTimeout(
						() => setVacuumNoticeVisible(false),
						VACUUM_NOTICE_MS,
					);
				})
				.catch((error: unknown) => {
					console.warn("Daily database compaction failed.", error);
				});
		};
		runVacuum();
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				runVacuum();
			}
		});
		return () => {
			subscription.remove();
			if (vacuumNoticeTimer.current)
				clearTimeout(vacuumNoticeTimer.current);
		};
	}, [database]);

	const refreshData = (): void => {
		setDataVersion((currentVersion) => currentVersion + 1);
	};

	const value: DatabaseContextValue = {
		database,
		dataVersion,
		refreshData,
	};

	return (
		<DatabaseContext.Provider value={value}>
			{children}
			{vacuumNoticeVisible ? (
				<View pointerEvents="none" style={styles.noticeWrap}>
					<View style={styles.notice}>
						<CustomText style={styles.noticeText}>
							{MESSAGES.COMMON.VACUUM_DONE}
						</CustomText>
					</View>
				</View>
			) : null}
		</DatabaseContext.Provider>
	);
};

const { ALIGN, BORDER, FONT_SIZE, POSITION, RADIUS, SPACING } = styleConstants;

const styles = StyleSheet.create({
	noticeWrap: {
		position: POSITION.ABSOLUTE,
		top: SPACING.S56,
		left: SPACING.S0,
		right: SPACING.S0,
		alignItems: ALIGN.CENTER,
	},
	notice: {
		backgroundColor: COLORS.surfaceSoft,
		borderColor: COLORS.border,
		borderRadius: RADIUS.PILL,
		borderWidth: BORDER.THIN,
		paddingHorizontal: SPACING.S16,
		paddingVertical: SPACING.S8,
	},
	noticeText: {
		color: COLORS.text,
		fontSize: FONT_SIZE.S13,
	},
});

export default DatabaseProvider;
