import { useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { vacuumDatabaseIfNeeded } from "@/database/initializeDatabase";
import DatabaseContext from "@/providers/DatabaseContext";
import type DatabaseContextValue from "@/types/DatabaseContextValue";
import type DatabaseProviderProps from "@/types/DatabaseProviderProps";

const DatabaseProvider = ({
	children,
	database,
}: DatabaseProviderProps): ReactNode => {
	const [dataVersion, setDataVersion] = useState(0);

	useEffect(() => {
		const subscription = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				void vacuumDatabaseIfNeeded(database).catch(
					(error: unknown) => {
						console.warn(
							"Daily database compaction failed.",
							error,
						);
					},
				);
			}
		});
		return () => subscription.remove();
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
		</DatabaseContext.Provider>
	);
};

export default DatabaseProvider;
