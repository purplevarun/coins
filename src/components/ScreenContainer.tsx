import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState, type ReactNode } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";

import styleConstants from "@/constants/styleConstants";
import useTheme from "@/hooks/useTheme";
import useThemedStyles from "@/hooks/useThemedStyles";
import type ScreenContainerProps from "@/types/ScreenContainerProps";
import createThemedStyles from "@/utils/createThemedStyles";

const { FLEX, SPACING } = styleConstants;

const ScreenContainer = ({
	children,
	isScrollable = true,
	header,
	footer,
}: ScreenContainerProps): ReactNode => {
	const { colors: COLORS } = useTheme();
	const styles = useThemedStyles(themedStyles);
	const viewport = useRef<View>(null);
	const insets = useSafeAreaInsets();
	const [keyboardVerticalOffset, setKeyboardVerticalOffset] = useState(0);
	const content = isScrollable ? (
		<ScrollView
			contentContainerStyle={[
				styles.scrollContent,
				footer ? styles.scrollContentWithFooter : null,
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			{children}
		</ScrollView>
	) : (
		<View style={styles.staticContent}>{children}</View>
	);

	return (
		<LinearGradient
			colors={[
				COLORS.background,
				COLORS.backgroundMid,
				COLORS.backgroundDeep,
			]}
			style={styles.gradient}
		>
			<SafeAreaView
				ref={viewport}
				edges={["bottom"]}
				onLayout={
					footer
						? () =>
								viewport.current?.measureInWindow(
									(_left, top) =>
										setKeyboardVerticalOffset(
											top +
												(Platform.OS === "android"
													? insets.top
													: 0),
										),
								)
						: undefined
				}
				style={styles.safeArea}
			>
				<KeyboardAvoidingView
					keyboardVerticalOffset={keyboardVerticalOffset}
					behavior={
						Platform.OS === "ios"
							? "padding"
							: footer
								? "height"
								: undefined
					}
					style={styles.keyboardView}
				>
					{header}
					{content}
					{footer ? (
						<View style={styles.footer}>{footer}</View>
					) : null}
				</KeyboardAvoidingView>
			</SafeAreaView>
		</LinearGradient>
	);
};

const themedStyles = createThemedStyles((COLORS) =>
	StyleSheet.create({
		gradient: {
			flex: FLEX.FILL,
		},
		safeArea: {
			flex: FLEX.FILL,
		},
		keyboardView: {
			flex: FLEX.FILL,
		},
		scrollContent: {
			padding: SPACING.S16,
			paddingBottom: SPACING.S120,
			gap: SPACING.S14,
		},
		scrollContentWithFooter: {
			paddingBottom: SPACING.S16,
		},
		footer: {
			padding: SPACING.S16,
			borderTopWidth: 1,
			borderTopColor: COLORS.border,
			backgroundColor: COLORS.background,
		},
		staticContent: {
			flex: FLEX.FILL,
			padding: SPACING.S16,
		},
	}),
);

export default ScreenContainer;
