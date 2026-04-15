import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studylens.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/lp", "/privacy", "/terms"],
        disallow: ["/", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
