import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import { localizedPath } from "@/lib/localized";

export interface WorldPillProps {
  className?: string;
  short?: boolean;
}

export function WorldPill({ className, short = false }: WorldPillProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const label = t("lite.openWorld");

  return (
    <Link
      to={localizedPath(locale)}
      aria-label={short ? label : undefined}
      title={short ? label : undefined}
      className={`koi-flatlink lite-world-pill${className ? ` ${className}` : ""}`}
    >
      <svg
        className="lite-world-pill-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4z" />
        <path d="M4 7.4 12 12l8-4.6M12 12v9.2" />
      </svg>
      {short ? "3D" : label}
    </Link>
  );
}
