import { useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/localized";
import { LanguageToggle, SkipToContent, WaveBackground } from "@/components";
import { usePageViews } from "@/hooks/usePageViews";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

export function LocaleLayout() {
  const { locale } = useParams();
  const { i18n } = useTranslation();

  usePageViews();
  useScrollRestoration();

  useEffect(() => {
    if (isLocale(locale)) {
      void i18n.changeLanguage(locale);
      document.documentElement.lang = locale;
    }
  }, [locale, i18n]);

  if (!isLocale(locale)) {
    return <Navigate to={localizedPath(DEFAULT_LOCALE)} replace />;
  }

  return (
    <div className="min-h-screen text-white">
      <WaveBackground />
      <SkipToContent />
      <header className="mx-auto flex max-w-3xl items-center justify-end px-6 py-6">
        <LanguageToggle />
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
