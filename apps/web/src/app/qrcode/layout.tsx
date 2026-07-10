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

const DESCRIPTION =
  "Le petit coin du web de Valentin Sourdois Pajot — liens, projets, humeur, musique et plus, en un scan.";

export const metadata: Metadata = {
  metadataBase: new URL("https://cenacrew.com"),
  title: "Valentin · Dashboard",
  description: DESCRIPTION,
  alternates: { canonical: "/qrcode" },
  // og image is provided by the sibling opengraph-image.tsx (auto-detected).
  openGraph: {
    type: "website",
    url: "https://cenacrew.com/qrcode",
    siteName: "cenacrew.com",
    title: "Valentin · Dashboard bento",
    description: DESCRIPTION,
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Valentin · Dashboard bento",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0c62",
};

export default function QrLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={`qr-page ${bricolage.variable}`}>{children}</div>;
}
