import type { TechKey } from "./schema";

// Presentation for each technology badge. Solid brand background + an
// auto-contrast monogram keeps the grid legible in light and dark without any
// CDN icons — a clean, cohesive lettermark system rather than ten mismatched
// logos. `bg` = brand colour, `fg` = readable ink on that colour.
export type Tech = { name: string; mono: string; bg: string; fg: string };

export const TECHS: Record<TechKey, Tech> = {
  react: { name: "React", mono: "Re", bg: "#0a7ea4", fg: "#ffffff" },
  nextjs: { name: "Next.js", mono: "N", bg: "#111111", fg: "#ffffff" },
  typescript: { name: "TypeScript", mono: "TS", bg: "#3178c6", fg: "#ffffff" },
  node: { name: "Node.js", mono: "No", bg: "#417e38", fg: "#ffffff" },
  postgresql: { name: "PostgreSQL", mono: "Pg", bg: "#31648c", fg: "#ffffff" },
  supabase: { name: "Supabase", mono: "Sb", bg: "#3ecf8e", fg: "#06281f" },
  expo: { name: "Expo", mono: "Ex", bg: "#1b1f23", fg: "#ffffff" },
  python: { name: "Python", mono: "Py", bg: "#3776ab", fg: "#ffd94a" },
  figma: { name: "Figma", mono: "Fi", bg: "#7a3ff2", fg: "#ffffff" },
  photoshop: { name: "Photoshop", mono: "Ps", bg: "#001e36", fg: "#31a8ff" },
};
