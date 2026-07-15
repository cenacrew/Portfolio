import Link from "next/link";
import { notFound } from "next/navigation";
import QrHeader from "./QrHeader";
import BentoGrid from "./BentoGrid";
import { resolveDashboardScope } from "./dashboard";

// Shared render for a dashboard version. `/qrcode` and `/qrcode/[slug]` both use
// this; an unknown slug 404s. Factored out so the default and versioned pages
// stay pixel-identical.
export default async function QrcodeView({ slug }: { slug: string }) {
  const scope = await resolveDashboardScope(slug);
  if (!scope) notFound();

  return (
    <main className="qr-main">
      <QrHeader scope={scope} />
      <BentoGrid scope={scope} />
      <footer className="qr-foot">
        <Link href="/">← Retour au portfolio</Link>
        <span>© {new Date().getFullYear()} Valentin Sourdois Pajot</span>
      </footer>
    </main>
  );
}
