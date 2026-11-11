import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://noir.in";
  const now = new Date();

  const staticRoutes = [
    "",
    "/men",
    "/women",
    "/kids",
    "/new-arrivals",
    "/shipping",
    "/returns",
    "/contact",
    "/faq",
    "/privacy-policy",
    "/terms",
  ];

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route.startsWith("/men") || route.startsWith("/women") || route.startsWith("/kids") ? "daily" : "monthly",
    priority: route === "" ? 1.0 : route.startsWith("/men") || route.startsWith("/women") ? 0.8 : 0.5,
  }));
}

