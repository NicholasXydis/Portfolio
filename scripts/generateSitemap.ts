import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { projects } from "@/content";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { normalizeSiteUrl } from "@/lib/site";
import { localizedPath } from "@/lib/localized";

const baseUrl = normalizeSiteUrl(process.env.VITE_SITE_URL);
const outDir = resolve(process.cwd(), "dist");

interface PageEntry {
  path: string;
  lastmod: string;
}

const today = new Date().toISOString().slice(0, 10);

const pages: PageEntry[] = [
  { path: "", lastmod: today },
  ...projects.map((project) => ({
    path: `projects/${project.slug}`,
    lastmod: project.lastUpdated,
  })),
];

function alternates(path: string): string {
  return SUPPORTED_LOCALES.map(
    (locale) =>
      `    <xhtml:link rel="alternate" hreflang="${locale}" href="${baseUrl}${localizedPath(locale, path)}" />`,
  ).join("\n");
}

const urls = pages
  .flatMap((page) =>
    SUPPORTED_LOCALES.map((locale) =>
      [
        "  <url>",
        `    <loc>${baseUrl}${localizedPath(locale, page.path)}</loc>`,
        alternates(page.path),
        `    <lastmod>${page.lastmod}</lastmod>`,
        "  </url>",
      ].join("\n"),
    ),
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "sitemap.xml"), sitemap, "utf8");
writeFileSync(resolve(outDir, "robots.txt"), robots, "utf8");

console.log(
  `Generated sitemap.xml (${pages.length * SUPPORTED_LOCALES.length} urls) and robots.txt for ${baseUrl}`,
);
