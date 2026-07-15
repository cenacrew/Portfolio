import QrcodeView from "./QrcodeView";
import { DEFAULT_SLUG } from "./dashboard";

// Public bento dashboard behind the printed QR codes (cenacrew.com/qrcode).
// Renders the DEFAULT version. Reads widgets from Supabase at request time
// (falls back to the local phase-2 config when Supabase isn't configured or the
// dashboards table isn't migrated yet), with live updates via Realtime.
export const dynamic = "force-dynamic";

export default function QrcodePage() {
  return <QrcodeView slug={DEFAULT_SLUG} />;
}
