import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";

type GlassCardProps = PropsWithChildren<
	Readonly<{
		accent?: "default" | "success" | "danger" | "warning";
		style?: StyleProp<ViewStyle>;
	}>
>;

export type { GlassCardProps as default };
