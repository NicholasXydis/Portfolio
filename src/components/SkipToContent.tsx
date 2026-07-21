import { useTranslation } from "react-i18next";

export function SkipToContent() {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-black"
    >
      {t("nav.skipToContent")}
    </a>
  );
}
