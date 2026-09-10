import { useColorScheme } from "react-native";

// Single source of truth for spacing/type/color — screens consume this
// instead of hand-rolling StyleSheet literals per screen (spec §9).
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radii = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  title: { fontSize: 28, fontWeight: "800" as const },
  heading: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
};

const light = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  border: "#E4E7EB",
  text: "#0F172A",
  textMuted: "#5B6472",
  primary: "#16A34A",
  primaryText: "#FFFFFF",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  warning: "#B45309",
  warningBg: "#FFFBEB",
  success: "#15803D",
  successBg: "#F0FDF4",
  track: "#E9ECEF",
};

const dark = {
  background: "#0B0D10",
  surface: "#15181D",
  border: "#262B33",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  primary: "#22C55E",
  primaryText: "#052E12",
  danger: "#F87171",
  dangerBg: "#2A1315",
  warning: "#FBBF24",
  warningBg: "#2A2211",
  success: "#4ADE80",
  successBg: "#0F2A18",
  track: "#242A31",
};

export type Palette = typeof light;

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}
