import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { CONTACT, SITE_NAME, SITE_URL } from "@/lib/site";
import { localizedPath } from "@/lib/localized";

const OG_LOCALE: Record<Locale, string> = {
  en: "en_CA",
  fr: "fr_CA",
};

const SITE_BRAND: Record<Locale, string> = {
  en: "Koi",
  fr: "Koi",
};

const OG_IMAGE = {
  path: "/og-koi.jpg",
  type: "image/jpeg",
  width: 2400,
  height: 1260,
  alt: {
    en: "A quiet tea house on a moonlit koi pond.",
    fr: "Une paisible maison de thé sur un étang à koïs au clair de lune.",
  } satisfies Record<Locale, string>,
} as const;

export type SeoPage = "home" | "lite" | "notFound";

export interface PageCopy {
  title: string;
  description: string;
}

const PAGE_COPY: Record<SeoPage, Record<Locale, PageCopy>> = {
  home: {
    en: {
      title: "Nicholas Xydis | CS @ Concordia & Software Developer (3D)",
      description:
        "The 3D portfolio of Nicholas Xydis, set in a quiet tea house on a moonlit koi pond.",
    },
    fr: {
      title:
        "Nicholas Xydis | Informatique @ Concordia et développeur logiciel (3D)",
      description:
        "Le portfolio 3D de Nicholas Xydis, niché dans une paisible maison de thé sur un étang à koïs au clair de lune.",
    },
  },
  lite: {
    en: {
      title: "Nicholas Xydis | CS @ Concordia & Software Developer (2D)",
      description:
        "The 2D portfolio of Nicholas Xydis, with experience, projects, education and skills on one page.",
    },
    fr: {
      title:
        "Nicholas Xydis | Informatique @ Concordia et développeur logiciel (2D)",
      description:
        "Le portfolio 2D de Nicholas Xydis, avec expérience, projets, formation et compétences sur une seule page.",
    },
  },
  notFound: {
    en: {
      title: "Nicholas Xydis | Page not found",
      description:
        "This page swam away. Go back to the 3D or 2D portfolio of Nicholas Xydis.",
    },
    fr: {
      title: "Nicholas Xydis | Page introuvable",
      description:
        "Cette page s'est éloignée à la nage. Revenez au portfolio 3D ou 2D de Nicholas Xydis.",
    },
  },
};

export function pageCopy(page: SeoPage, locale: Locale): PageCopy {
  return PAGE_COPY[page][locale];
}

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
  siteName: string;
  ogLocale: string;
  ogLocaleAlternates: string[];
  alternates: HrefLangAlternate[];
  image: {
    url: string;
    type: string;
    width: number;
    height: number;
    alt: string;
  };
}

export function buildSeo({
  title,
  description,
  locale,
  path = "",
  noindex = false,
}: SeoInput): SeoMeta {
  const canonical = `${SITE_URL}${localizedPath(locale, path)}`;
  const siteName = SITE_BRAND[locale];
  const fullTitle =
    title.includes(SITE_NAME) || title.includes(siteName)
      ? title
      : `${title} | ${siteName}`;

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
    siteName,
    ogLocale: OG_LOCALE[locale],
    ogLocaleAlternates,
    alternates,
    image: {
      url: `${SITE_URL}${OG_IMAGE.path}`,
      type: OG_IMAGE.type,
      width: OG_IMAGE.width,
      height: OG_IMAGE.height,
      alt: OG_IMAGE.alt[locale],
    },
  };
}

const JOB_TITLE: Record<Locale, string> = {
  en: "Software Developer",
  fr: "Développeur logiciel",
};

const LANGUAGE_TAG: Record<Locale, string> = {
  en: "en-CA",
  fr: "fr-CA",
};

export function buildPersonJsonLd(locale: Locale): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE_NAME,
    url: `${SITE_URL}${localizedPath(locale)}`,
    jobTitle: JOB_TITLE[locale],
    sameAs: [CONTACT.github, CONTACT.linkedin],
  };
}

export function buildSiteJsonLd(locale: Locale): Record<string, unknown> {
  const { "@context": context, ...person } = buildPersonJsonLd(locale);
  const personId = `${SITE_URL}/#person`;
  return {
    "@context": context,
    "@graph": [
      {
        ...person,
        "@id": personId,
        image: `${SITE_URL}/portrait.jpg`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}${localizedPath(locale)}#website`,
        name: SITE_BRAND[locale],
        alternateName: SITE_NAME,
        url: `${SITE_URL}${localizedPath(locale)}`,
        inLanguage: LANGUAGE_TAG[locale],
        author: { "@id": personId },
      },
    ],
  };
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
