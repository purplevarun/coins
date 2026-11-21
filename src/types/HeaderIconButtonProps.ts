import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

type HeaderIconButtonProps = Readonly<{
	icon: ComponentProps<typeof Ionicons>["name"];
	onPress: () => void;
	isActive?: boolean;
	isDisabled?: boolean;
	accessibilityLabel: string;
}>;

export type { HeaderIconButtonProps as default };
