import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/localized";
import { LanguageToggle, SkipToContent, WaveBackground } from "@/components";

export function LocaleLayout() {
  const { locale } = useParams();
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (isLocale(locale)) {
      void i18n.changeLanguage(locale);
      document.documentElement.lang = locale;
    }
  }, [locale, i18n]);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      target.scrollIntoView({ block: "start" });
    }
  }, [location.hash, location.pathname]);

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
