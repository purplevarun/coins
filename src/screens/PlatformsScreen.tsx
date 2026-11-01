import GlassCard from "@/components/GlassCard";
import ScreenContainer from "@/components/ScreenContainer";
import SimpleEntityForm from "@/components/SimpleEntityForm";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import platformService from "@/services/platformService";
import type RootStackParamList from "@/types/RootStackParamList";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const PlatformsScreen = ({
	navigation,
	route,
}: NativeStackScreenProps<
	RootStackParamList,
	"Platforms"
>): React.JSX.Element => {
	const { database, refreshData } = useDatabaseContext();
	const entityId = route.params?.entityId;
	return (
		<ScreenContainer>
			<GlassCard>
				<SimpleEntityForm
					initialName={route.params?.entityName}
					onSave={async (name) => {
						await platformService.savePlatform(
							database,
							entityId,
							name,
						);
						refreshData();
						if (entityId)
							navigation.popTo("RelationDetails", {
								kind: "PLATFORM",
								entityId,
								entityName: name.trim(),
							});
						else navigation.goBack();
					}}
				/>
			</GlassCard>
		</ScreenContainer>
	);
};

export default PlatformsScreen;
