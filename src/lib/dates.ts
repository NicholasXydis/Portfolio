import type { Locale } from "@/lib/i18n";

const INTL_LOCALE: Record<Locale, string> = {
  en: "en-CA",
  fr: "fr-CA",
};

export function formatMonthYear(isoDate: string, locale: Locale): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateRange(
  startDate: string,
  endDate: string | null,
  locale: Locale,
  presentLabel: string,
): string {
  const start = formatMonthYear(startDate, locale);
  const end = endDate ? formatMonthYear(endDate, locale) : presentLabel;
  return `${start} — ${end}`;
}
