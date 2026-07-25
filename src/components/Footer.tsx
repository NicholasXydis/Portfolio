import { useTranslation } from "react-i18next";
import { SITE_NAME } from "@/lib/site";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto max-w-3xl px-6 pb-10 text-center font-mono text-xs text-white/40">
      © {year} {SITE_NAME} · {t("footer.rights")}
    </footer>
  );
}
