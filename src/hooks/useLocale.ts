import { useParams } from "react-router-dom";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export function useLocale(): Locale {
  const { locale } = useParams();
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}
