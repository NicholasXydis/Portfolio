import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n";
import { normalizeSiteUrl } from "@/lib/site";
import { localizedPath } from "@/lib/localized";

const baseUrl = normalizeSiteUrl(process.env.VITE_SITE_URL);
const outDir = resolve(process.cwd(), "dist");
const CONTENT_SOURCES = ["src/content", "src/locales"];

interface PageEntry {
  path: string;
  lastmod: string;
}

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function contentLastmod(paths: string[], fallback: string): string {
  const pending = git(["status", "--porcelain", "--", ...paths]);
  if (pending === null || pending.length > 0) return fallback;
  const committed = git(["log", "-1", "--format=%cs", "--", ...paths]);
  return committed && /^\d{4}-\d{2}-\d{2}$/.test(committed)
    ? committed
    : fallback;
}

const now = new Date();
const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
  .map((part) => String(part).padStart(2, "0"))
  .join("-");
const lastmod = contentLastmod(CONTENT_SOURCES, today);

const pages: PageEntry[] = [
  { path: "", lastmod },
  { path: "lite", lastmod },
];

function alternates(path: string): string {
  return [
    ...SUPPORTED_LOCALES.map(
      (locale) =>
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${baseUrl}${localizedPath(locale, path)}" />`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${localizedPath(DEFAULT_LOCALE, path)}" />`,
  ].join("\n");
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
  `Generated sitemap.xml (${pages.length * SUPPORTED_LOCALES.length} urls, lastmod ${lastmod}) and robots.txt for ${baseUrl}`,
);
