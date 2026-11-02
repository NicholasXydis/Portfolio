import type { Locale, LocalizedText, LocalizedUrl } from "@/content/schemas";

export function pickLocalized(text: LocalizedText, locale: Locale): string {
  return text[locale];
}

export function pickUrl(url: LocalizedUrl, locale: Locale): string {
  return typeof url === "string" ? url : url[locale];
}

export function localizedPath(locale: Locale, path = ""): string {
  const suffix = path.replace(/^\/+/, "");
  return `/${locale}${suffix ? `/${suffix}` : ""}`;
}
