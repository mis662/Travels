import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/config/site";
import { serviceSlugs } from "@/config/services";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const routes = await prisma.route.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });
  const staticPages = ["", "/fleet", "/routes", "/track", "/about", "/contact", "/terms", "/cancellation-policy", "/privacy-policy"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...serviceSlugs.map((s) => ({ url: `${base}/services/${s}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...routes.map((r) => ({ url: `${base}/routes/${r.slug}`, lastModified: r.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
