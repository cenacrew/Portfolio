import type { Metadata } from "next";
import QrcodeView from "../QrcodeView";
import { resolveDashboardScope } from "../dashboard";
import { loadHeaderSettings } from "../settings";

// A versioned dashboard (cenacrew.com/qrcode/<slug>). Same render as /qrcode but
// scoped to the slug's version; an unknown slug 404s (handled in QrcodeView).
export const dynamic = "force-dynamic";

// Per-version metadata: the version's header name/tagline drive title and
// description. The OG image falls back to the default /qrcode bento card (the
// static generator isn't parameterised — not worth over-investing here).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scope = await resolveDashboardScope(slug);
  if (!scope) return { title: "Version introuvable" };

  const header = await loadHeaderSettings(scope);
  const name = scope.name || header.name;
  const title = `${name} · Dashboard`;
  const description = header.tagline;
  const url = `https://cenacrew.com/qrcode/${slug}`;
  const ogImage = "https://cenacrew.com/qrcode/opengraph-image";

  return {
    title,
    description,
    alternates: { canonical: `/qrcode/${slug}` },
    openGraph: {
      type: "website",
      url,
      siteName: "cenacrew.com",
      title,
      description,
      locale: "fr_FR",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function QrcodeSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <QrcodeView slug={slug} />;
}
