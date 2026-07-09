import Link from "next/link";
import QrHeader from "./QrHeader";
import BentoGrid from "./BentoGrid";

// Public bento dashboard behind the printed QR codes (cenacrew.com/qrcode).
// Rendered from a typed local config (packages/shared model); phase 3 swaps
// the data source for Supabase without touching the widgets.

export default function QrcodePage() {
  return (
    <main className="qr-main">
      <QrHeader />
      <BentoGrid />
      <footer className="qr-foot">
        <Link href="/">← Retour au portfolio</Link>
        <span>© {new Date().getFullYear()} Valentin Sourdois Pajot</span>
      </footer>
    </main>
  );
}
