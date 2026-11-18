import { buildSeo, buildSiteJsonLd, serializeJsonLd } from "@/lib/meta";
import { useLocale } from "@/hooks/useLocale";

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
  const meta = buildSeo({ title, description, locale, path, noindex });

  return (
    <>
      <title>{meta.fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      {!noindex && <link rel="canonical" href={meta.canonical} />}

      {!noindex &&
        meta.alternates.map((alt) => (
          <link
            key={alt.hrefLang}
            rel="alternate"
            hrefLang={alt.hrefLang}
            href={alt.href}
          />
        ))}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={meta.siteName} />
      <meta property="og:title" content={meta.fullTitle} />
      <meta property="og:description" content={description} />
      {!noindex && <meta property="og:url" content={meta.canonical} />}
      <meta property="og:image" content={meta.image.url} />
      <meta property="og:image:type" content={meta.image.type} />
      <meta property="og:image:width" content={String(meta.image.width)} />
      <meta property="og:image:height" content={String(meta.image.height)} />
      <meta property="og:image:alt" content={meta.image.alt} />
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
      <meta name="twitter:image" content={meta.image.url} />
      <meta name="twitter:image:alt" content={meta.image.alt} />

      {!noindex && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildSiteJsonLd(locale)),
          }}
        />
      )}
    </>
  );
}
