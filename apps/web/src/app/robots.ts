import type { MetadataRoute } from "next";

// Keep the admin out of search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/adminqrcode",
    },
  };
}
