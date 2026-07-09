import Link from "next/link";
import QrHeader from "./QrHeader";
import BentoGrid from "./BentoGrid";

// Public bento dashboard behind the printed QR codes (cenacrew.com/qrcode).
// Reads widgets from Supabase at request time (falls back to the local phase-2
// config when Supabase isn't configured), with live updates via Realtime.
export const dynamic = "force-dynamic";

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
