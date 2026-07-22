import { useTranslation } from "react-i18next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildSeo } from "@/lib/meta";
import { useLocale } from "@/hooks/useLocale";

const OG_IMAGE = `${SITE_URL}/og.png`;

export interface SeoProps {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
}

export function Seo({
  title,
  description,
  path = "",
  noindex = false,
}: SeoProps) {
  const locale = useLocale();
  const { i18n } = useTranslation();
  const meta = buildSeo({ title, description, locale, path, noindex });

  return (
    <>
      <title>{meta.fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={meta.canonical} />

      {meta.alternates.map((alt) => (
        <link
          key={alt.hrefLang}
          rel="alternate"
          hrefLang={alt.hrefLang}
          href={alt.href}
        />
      ))}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={meta.fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={meta.canonical} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={SITE_NAME} />
      <meta property="og:locale" content={meta.ogLocale} />
      {meta.ogLocaleAlternates.map((ogLocale) => (
        <meta
          key={ogLocale}
          property="og:locale:alternate"
          content={ogLocale}
        />
      ))}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />

      <meta httpEquiv="content-language" content={i18n.language} />
    </>
  );
}
