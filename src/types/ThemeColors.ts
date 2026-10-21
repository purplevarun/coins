import type COLORS from "@/constants/colors";

type ThemeColors = { readonly [Key in keyof typeof COLORS]: string };

export default ThemeColors;
