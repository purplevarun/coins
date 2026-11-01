import GlassCard from "@/components/GlassCard";
import ScreenContainer from "@/components/ScreenContainer";
import SimpleEntityForm from "@/components/SimpleEntityForm";
import useDatabaseContext from "@/hooks/useDatabaseContext";
import tripTypeService from "@/services/tripTypeService";
import type RootStackParamList from "@/types/RootStackParamList";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

const TripTypesScreen = ({
	navigation,
	route,
}: NativeStackScreenProps<
	RootStackParamList,
	"TripTypes"
>): React.JSX.Element => {
	const { database, refreshData } = useDatabaseContext();
	const entityId = route.params?.entityId;
	return (
		<ScreenContainer>
			<GlassCard>
				<SimpleEntityForm
					initialName={route.params?.entityName}
					onSave={async (name) => {
						await tripTypeService.saveTripType(
							database,
							entityId,
							name,
						);
						refreshData();
						if (entityId)
							navigation.popTo("RelationDetails", {
								kind: "TRIP_TYPE",
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

export default TripTypesScreen;
