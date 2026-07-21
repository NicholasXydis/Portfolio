import type { Locale, LocalizedText } from "@/content/schemas";

export function pickLocalized(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

export function localizedPath(locale: Locale, path = ""): string {
  const suffix = path.replace(/^\/+/, "");
  return `/${locale}${suffix ? `/${suffix}` : ""}`;
}
