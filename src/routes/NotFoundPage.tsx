import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  KoiLoader,
  LanguagePill,
  buttonClass,
  useKoiTheme,
} from "@/components/koi";
import { Seo, SkipToContent } from "@/components";
import { useLocale } from "@/hooks/useLocale";
import { localizedPath } from "@/lib/localized";
import { pageCopy } from "@/lib/meta";

export function NotFoundPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  useKoiTheme();

  return (
    <div
      className="grid min-h-screen-dyn place-items-center bg-koi-bg p-6 font-koi-body text-koi-ink"
      style={{
        backgroundImage:
          "radial-gradient(900px 620px at 50% -8%, var(--koi-surface-2), transparent 70%)",
      }}
    >
      <Seo {...pageCopy("notFound", locale)} noindex />
      <SkipToContent />
      <div className="fixed right-[clamp(20px,5vw,56px)] top-4 z-10">
        <LanguagePill />
      </div>
      <main
        id="main-content"
        aria-labelledby="not-found-title"
        className="grid w-full max-w-[420px] justify-items-center text-center"
      >
        <KoiLoader progress={1} decorative showValue={false} size={136} />
        <p className="koi-label mt-8">{t("notFound.code")}</p>
        <h1
          id="not-found-title"
          className="mt-2 font-koi-display text-[30px] font-normal leading-[1.15] tracking-[-0.4px]"
        >
          {t("notFound.title")}
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-koi-ink-dim">
          {t("notFound.description")}
        </p>
        <div className="mt-[26px] flex flex-wrap justify-center gap-3">
          <Link to={localizedPath(locale)} className={buttonClass("solid")}>
            {t("notFound.toWorld")}
          </Link>
          <Link
            to={localizedPath(locale, "lite")}
            className={buttonClass("outline")}
          >
            {t("notFound.toLite")}
          </Link>
        </div>
      </main>
    </div>
  );
}
