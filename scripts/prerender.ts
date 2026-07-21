import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { projects } from "@/content";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { localizedPath } from "@/lib/localized";
import { buildSeo, type SeoMeta } from "@/lib/meta";
import { SITE_NAME } from "@/lib/site";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

const LOCALE_MESSAGES = { en, fr };

function metaText(locale: Locale, key: string): string {
  return (LOCALE_MESSAGES[locale].meta as Record<string, string>)[key];
}

const distDir = resolve(process.cwd(), "dist");
const template = readFileSync(resolve(distDir, "index.html"), "utf8");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHead(meta: SeoMeta, locale: Locale): string {
  return [
    `<title>${escapeHtml(meta.fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    meta.noindex ? `<meta name="robots" content="noindex, follow" />` : "",
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    ...meta.alternates.map(
      (alt) =>
        `<link rel="alternate" hreflang="${alt.hrefLang}" href="${escapeHtml(alt.href)}" />`,
    ),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.fullTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:locale" content="${meta.ogLocale}" />`,
    ...meta.ogLocaleAlternates.map(
      (ogLocale) =>
        `<meta property="og:locale:alternate" content="${ogLocale}" />`,
    ),
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta http-equiv="content-language" content="${locale}" />`,
  ]
    .filter(Boolean)
    .join("\n    ");
}

function writePage(routePath: string, meta: SeoMeta, locale: Locale) {
  const html = template.replace(
    "</head>",
    `    ${renderHead(meta, locale)}\n  </head>`,
  );
  const outDir = routePath ? resolve(distDir, routePath) : distDir;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), html, "utf8");
}

function routeDir(locale: Locale, path: string): string {
  return localizedPath(locale, path).replace(/^\//, "");
}

let count = 0;

for (const locale of SUPPORTED_LOCALES) {
  writePage(
    routeDir(locale, ""),
    buildSeo({
      title: metaText(locale, "home.title"),
      description: metaText(locale, "home.description"),
      locale,
      path: "",
    }),
    locale,
  );
  count += 1;

  writePage(
    routeDir(locale, "projects"),
    buildSeo({
      title: metaText(locale, "projects.title"),
      description: metaText(locale, "projects.description"),
      locale,
      path: "projects",
    }),
    locale,
  );
  count += 1;

  for (const project of projects) {
    const name = project.title[locale];
    const subtitle = project.subtitle ? project.subtitle[locale] : "";
    writePage(
      routeDir(locale, `projects/${project.slug}`),
      buildSeo({
        title: subtitle ? `${name} — ${subtitle}` : name,
        description: project.summary[locale],
        locale,
        path: `projects/${project.slug}`,
      }),
      locale,
    );
    count += 1;
  }
}

// Root index.html (before the locale redirect) gets the default-locale home meta.
writePage(
  "",
  buildSeo({
    title: metaText("en", "home.title"),
    description: metaText("en", "home.description"),
    locale: "en",
    path: "",
  }),
  "en",
);

console.log(`Prerendered ${count + 1} route(s) with static meta.`);
