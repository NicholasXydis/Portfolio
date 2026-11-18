import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";
import { KoiMark } from "./KoiMark";

export interface BrandProps {
  compact?: boolean;
  onScene?: boolean;
  plate?: boolean;
  name?: string | false;
  className?: string;
}

export function Brand({
  compact = false,
  onScene = false,
  plate = false,
  name,
  className,
}: BrandProps) {
  const { t } = useTranslation();
  const short = compact || name === false;
  return (
    <span
      className={cx(
        "koi-brand",
        onScene && "koi-brand--scene",
        plate && "koi-brand--plate",
        className,
      )}
    >
      <KoiMark size={26} />
      <span className="koi-brand__koi">{t("koi.brand").toLowerCase()}</span>
      {!short && <em className="koi-brand__by">{t("koi.by")}</em>}
    </span>
  );
}

export interface HeaderBarProps {
  brand: ReactNode;
  nav?: ReactNode;
  controls?: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function HeaderBar({
  brand,
  nav,
  controls,
  sticky = true,
  className,
}: HeaderBarProps) {
  return (
    <header
      className={cx("koi-header", sticky && "koi-header--sticky", className)}
    >
      <div className="koi-header__grid">
        <div className="koi-header__brand">{brand}</div>
        {nav && <div className="koi-header__nav">{nav}</div>}
        {controls && <div className="koi-header__controls">{controls}</div>}
      </div>
    </header>
  );
}
