import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { localizedPath } from "@/lib/localized";

const OG_LOCALE: Record<Locale, string> = {
  en: "en_CA",
  fr: "fr_CA",
};

export interface SeoInput {
  title: string;
  description: string;
  locale: Locale;
  path?: string;
  noindex?: boolean;
}

export interface HrefLangAlternate {
  hrefLang: string;
  href: string;
}

export interface SeoMeta {
  fullTitle: string;
  description: string;
  canonical: string;
  noindex: boolean;
  ogLocale: string;
  ogLocaleAlternates: string[];
  alternates: HrefLangAlternate[];
}

export function buildSeo({
  title,
  description,
  locale,
  path = "",
  noindex = false,
}: SeoInput): SeoMeta {
  const canonical = `${SITE_URL}${localizedPath(locale, path)}`;
  const fullTitle = title.startsWith(SITE_NAME)
    ? title
    : `${title} | ${SITE_NAME}`;

  const alternates: HrefLangAlternate[] = [
    ...SUPPORTED_LOCALES.map((alt) => ({
      hrefLang: alt as string,
      href: `${SITE_URL}${localizedPath(alt, path)}`,
    })),
    { hrefLang: "x-default", href: `${SITE_URL}${localizedPath("en", path)}` },
  ];

  const ogLocaleAlternates = SUPPORTED_LOCALES.filter(
    (alt) => alt !== locale,
  ).map((alt) => OG_LOCALE[alt]);

  return {
    fullTitle,
    description,
    canonical,
    noindex,
    ogLocale: OG_LOCALE[locale],
    ogLocaleAlternates,
    alternates,
  };
}
