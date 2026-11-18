import { StrictMode } from "react";
import { prerender } from "react-dom/static";
import { StaticRouter } from "react-router";
import { MotionConfig } from "framer-motion";
import i18n, { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { App } from "@/App";
import { ErrorBoundary } from "@/components";

export function localeOf(url: string): Locale {
  const first = url.split("/")[1];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export async function render(url: string): Promise<string> {
  await i18n.changeLanguage(localeOf(url));
  const errors: unknown[] = [];
  const { prelude } = await prerender(
    <StrictMode>
      <ErrorBoundary>
        <MotionConfig reducedMotion="user">
          <StaticRouter location={url}>
            <App />
          </StaticRouter>
        </MotionConfig>
      </ErrorBoundary>
    </StrictMode>,
    {
      onError(error) {
        errors.push(error);
      },
    },
  );
  const html = await new Response(prelude).text();
  if (errors.length > 0) throw errors[0];
  return html;
}
