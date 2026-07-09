import { useColorScheme } from "react-native";

// Design tokens for QRCodeAdmin. Same personality as the web dashboard:
// navy (#0d0c62) + cream (#EBE3E0), rounded tiles, one warm amber accent used
// sparingly for the active/interactive state. Light and dark are both first
// class and driven by the system theme.

const NAVY = "#0d0c62";
const CREAM = "#EBE3E0";
const AMBER = "#E9A23B";

export type Palette = {
  scheme: "light" | "dark";
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  brand: string;
  onBrand: string;
  accent: string;
  onAccent: string;
  danger: string;
  success: string;
  overlay: string;
};

const light: Palette = {
  scheme: "light",
  bg: CREAM,
  bgElevated: "#F5EFEC",
  surface: "#FFFFFF",
  surfaceAlt: "#F3ECE8",
  border: "rgba(13,12,98,0.12)",
  text: NAVY,
  textMuted: "rgba(13,12,98,0.62)",
  textFaint: "rgba(13,12,98,0.40)",
  brand: NAVY,
  onBrand: CREAM,
  accent: AMBER,
  onAccent: "#2A1A00",
  danger: "#C6432E",
  success: "#2E8B57",
  overlay: "rgba(13,12,98,0.45)",
};

const dark: Palette = {
  scheme: "dark",
  bg: "#070630",
  bgElevated: "#0d0c50",
  surface: "#15145f",
  surfaceAlt: "#1d1c72",
  border: "rgba(235,227,224,0.14)",
  text: CREAM,
  textMuted: "rgba(235,227,224,0.66)",
  textFaint: "rgba(235,227,224,0.42)",
  brand: CREAM,
  onBrand: NAVY,
  accent: AMBER,
  onAccent: "#2A1A00",
  danger: "#F0846F",
  success: "#7FD1A3",
  overlay: "rgba(0,0,0,0.6)",
};

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 36 } as const;

// Note tones (mirrors the web note widget palette) reused in previews.
export const NOTE_TONES: Record<string, { bg: string; fg: string }> = {
  cream: { bg: "#F3E9CF", fg: "#5b4a1e" },
  blue: { bg: "#D9E2FF", fg: "#1f2d63" },
  amber: { bg: "#FBE3B8", fg: "#6b4a12" },
  rose: { bg: "#F7D9E3", fg: "#6b1f3c" },
};
