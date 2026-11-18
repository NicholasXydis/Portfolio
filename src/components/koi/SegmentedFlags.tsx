import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { useLocale } from "@/hooks/useLocale";
import { track } from "@/lib/analytics";
import { cx } from "./cx";
import { FlagFrance, FlagUS } from "./icons";

export interface SegmentedFlagItem<Id extends string = string> {
  id: Id;
  label: string;
  flag: ReactNode;
}

export interface SegmentedFlagsProps<Id extends string = string> {
  items: readonly SegmentedFlagItem<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
  label: string;
  hrefFor?: (id: Id) => string;
  className?: string;
}

const plainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

export function SegmentedFlags<Id extends string = string>({
  items,
  active,
  onSelect,
  label,
  hrefFor,
  className,
}: SegmentedFlagsProps<Id>) {
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === active),
  );
  return (
    <div
      className={cx("koi-seg", className)}
      role="group"
      aria-label={label}
      style={{ "--koi-seg-index": index } as CSSProperties}
    >
      <span className="koi-seg__thumb" aria-hidden="true" />
      {items.map((item) =>
        hrefFor ? (
          <a
            key={item.id}
            href={hrefFor(item.id)}
            hrefLang={item.id}
            lang={item.id}
            className="koi-seg__item"
            aria-label={item.label}
            title={item.label}
            aria-current={item.id === active ? "page" : undefined}
            onClick={(event) => {
              if (!plainClick(event)) return;
              event.preventDefault();
              if (item.id !== active) onSelect(item.id);
            }}
          >
            {item.flag}
          </a>
        ) : (
          <button
            key={item.id}
            type="button"
            className="koi-seg__item"
            lang={item.id}
            aria-label={item.label}
            title={item.label}
            aria-pressed={item.id === active}
            onClick={() => {
              if (item.id !== active) onSelect(item.id);
            }}
          >
            {item.flag}
          </button>
        ),
      )}
    </div>
  );
}

export interface LanguagePillProps {
  onSelect?: (locale: Locale) => void;
  tone?: "color" | "ink";
  className?: string;
}

export function LanguagePill({
  onSelect,
  tone = "color",
  className,
}: LanguagePillProps) {
  const { t } = useTranslation();
  const active = useLocale();
  const navigate = useNavigate();
  const location = useLocation();

  const items: SegmentedFlagItem<Locale>[] = [
    { id: "en", label: t("language.en"), flag: <FlagUS tone={tone} /> },
    { id: "fr", label: t("language.fr"), flag: <FlagFrance tone={tone} /> },
  ];

  const prefix = new RegExp(`^/(${SUPPORTED_LOCALES.join("|")})(?=/|$)`);
  const hrefFor = (next: Locale) =>
    `/${next}${location.pathname.replace(prefix, "")}${location.search}${location.hash}`;

  function swap(next: Locale) {
    if (onSelect) {
      onSelect(next);
      return;
    }
    track.languageSwitch(next);
    void navigate(hrefFor(next));
  }

  return (
    <SegmentedFlags
      items={items}
      active={active}
      onSelect={swap}
      hrefFor={hrefFor}
      label={t("koi.language")}
      className={className}
    />
  );
}
