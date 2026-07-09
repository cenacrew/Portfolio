import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "../qrcode/qrcode.css";
import "./admin.css";

// The admin reuses the dashboard's design tokens (qrcode.css) so widget
// previews render identically to the public board, plus admin chrome (admin.css).
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "Console · Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={`qr-page admin ${bricolage.variable}`}>{children}</div>;
}
