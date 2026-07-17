import type { NextConfig } from "next";

// Multi-zone hub. The portfolio (/, /files/*, 404) is served locally; every
// MosaLink path (/qrcode, /adminqrcode, /api, zone assets, /qa-gallery) is
// proxied to the qrcode zone at mosalink.cenacrew.com so the printed QR codes
// (cenacrew.com/qrcode) keep working from a single public domain.
// Rewrites returned as a plain array run *after* the local filesystem, so the
// portfolio routes always win; only the paths below (none of which exist
// locally) fall through to the zone.
const ZONE = "https://mosalink.cenacrew.com";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      { source: "/qrcode", destination: `${ZONE}/qrcode` },
      { source: "/qrcode/:path*", destination: `${ZONE}/qrcode/:path*` },
      { source: "/adminqrcode", destination: `${ZONE}/adminqrcode` },
      { source: "/adminqrcode/:path*", destination: `${ZONE}/adminqrcode/:path*` },
      { source: "/api/:path*", destination: `${ZONE}/api/:path*` },
      { source: "/mosalink-zone/:path*", destination: `${ZONE}/mosalink-zone/:path*` },
      { source: "/qa-gallery", destination: `${ZONE}/qa-gallery` },
    ];
  },
};

export default nextConfig;
