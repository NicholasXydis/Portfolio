import { useLayoutEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { localizedPath } from "@/lib/localized";
import { usePageViews } from "@/hooks/usePageViews";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

export function LocaleLayout() {
  const { locale } = useParams();
  const { i18n } = useTranslation();

  usePageViews();
  useScrollRestoration();

  useLayoutEffect(() => {
    if (isLocale(locale)) {
      void i18n.changeLanguage(locale);
      document.documentElement.lang = locale;
    }
  }, [locale, i18n]);

  if (!isLocale(locale)) {
    return <Navigate to={localizedPath(DEFAULT_LOCALE)} replace />;
  }

  return <Outlet />;
}
