import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import { localizedPath } from "@/lib/localized";
import { Seo } from "@/components";

export function NotFoundPage() {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Seo
        title={t("meta.notFound.title")}
        description={t("meta.notFound.description")}
        noindex
      />
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-sm">
        <p className="font-mono text-sm font-semibold text-red-500">
          {t("notFound.code")}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{t("notFound.title")}</h1>
        <p className="mt-3 text-sm text-white/70">
          {t("notFound.description")}
        </p>
        <Link
          to={localizedPath(locale)}
          className="mt-6 inline-flex items-center rounded-md bg-white px-4 py-2 font-mono text-sm font-medium text-black transition-colors hover:bg-white/85"
        >
          {t("notFound.backHome")}
        </Link>
      </div>
    </div>
  );
}
