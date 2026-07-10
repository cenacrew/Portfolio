import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["@portfolio/shared"],
  images: {
    // Supabase Storage public URLs (photo/video widget uploads) served through
    // next/image. Any project ref under supabase.co is allowed so the same
    // build works across environments.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
