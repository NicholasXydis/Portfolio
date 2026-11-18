import type { HTMLAttributes, ReactNode, Ref } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";
import { IconButton } from "./Button";
import { CloseIcon } from "./icons";
import { Seal } from "./KoiMark";

export interface SectionHeadingProps {
  label?: string;
  title: string;
  aside?: ReactNode;
  level?: 1 | 2 | 3;
  id?: string;
  className?: string;
}

export function SectionHeading({
  label,
  title,
  aside,
  level = 2,
  id,
  className,
}: SectionHeadingProps) {
  const Title = `h${level}` as "h1" | "h2" | "h3";
  return (
    <header className={cx("koi-heading", className)}>
      {label && <p className="koi-label koi-heading__label">{label}</p>}
      <div className="koi-heading__row">
        <Title id={id} className="koi-heading__title">
          {title}
        </Title>
        {aside && <div className="koi-heading__aside">{aside}</div>}
      </div>
      <span className="koi-rule koi-rule--moon" aria-hidden="true" />
    </header>
  );
}

export interface PanelSkinProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "title"
> {
  label?: string;
  title?: string;
  titleRef?: Ref<HTMLHeadingElement>;
  titleId?: string;
  here?: boolean;
  onClose?: () => void;
  closeLabel?: string;
  footer?: ReactNode;
  material?: "paper" | "ink" | "water";
  tabs?: ReactNode;
  tabsBeside?: boolean;
}

export function PanelSkin({
  label,
  title,
  titleRef,
  titleId,
  here = false,
  onClose,
  closeLabel,
  footer,
  material = "paper",
  tabs,
  tabsBeside = false,
  className,
  children,
  ...rest
}: PanelSkinProps) {
  const { t } = useTranslation();
  return (
    <section
      className={cx("koi-panel", className)}
      data-material={material}
      aria-labelledby={titleId}
      {...rest}
    >
      {(label || here || onClose) && (
        <div className="koi-panel__top">
          {(label || here) && (
            <div className="koi-panel__lead">
              {label && <p className="koi-label">{label}</p>}
              {here && (
                <p className="koi-panel__here">
                  <Seal size={16} />
                  <span>{t("koi.here")}</span>
                </p>
              )}
            </div>
          )}
          {onClose && (
            <IconButton
              className="koi-panel__close"
              label={closeLabel ?? t("koi.close")}
              onClick={onClose}
            >
              <CloseIcon />
            </IconButton>
          )}
        </div>
      )}
      {(title || tabs) && (
        <div
          className="koi-panel__head"
          data-tabs={tabs ? (tabsBeside ? "beside" : "under") : undefined}
        >
          {title && (
            <h2
              id={titleId}
              ref={titleRef}
              tabIndex={-1}
              className="koi-panel__title"
            >
              {title}
            </h2>
          )}
          {title && (
            <span className="koi-rule koi-rule--moon" aria-hidden="true" />
          )}
          {tabs && <div className="koi-panel__tabs">{tabs}</div>}
        </div>
      )}
      <div className="koi-panel__body">{children}</div>
      {footer && <div className="koi-panel__foot">{footer}</div>}
    </section>
  );
}
