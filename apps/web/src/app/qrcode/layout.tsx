import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./qrcode.css";

// Distinctive display face for the dashboard, paired with the site's Raleway.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "Valentin · Dashboard",
  description:
    "Le petit coin du web de Valentin Sourdois Pajot — liens, projets, humeur, musique et plus, en un scan.",
};

export const viewport: Viewport = {
  themeColor: "#0d0c62",
};

export default function QrLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={`qr-page ${bricolage.variable}`}>{children}</div>;
}
