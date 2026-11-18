import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { MotionConfig } from "framer-motion";
import i18n, { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { App } from "@/App";
import { ErrorBoundary } from "@/components";
import { initAnalytics } from "@/lib/analytics";
import { printConsoleGreeting } from "@/lib/consoleGreeting";
import "./index.css";

initAnalytics();
printConsoleGreeting();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

const first = window.location.pathname.split("/")[1];
await i18n.changeLanguage(isLocale(first) ? first : DEFAULT_LOCALE);

const app = (
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>
);

const noGraphics =
  (window as unknown as { __koiNoGL?: boolean }).__koiNoGL === true;

if (container.dataset.prerendered === window.location.pathname && !noGraphics) {
  hydrateRoot(container, app);
} else {
  let inside = false;
  for (const node of [...document.head.childNodes]) {
    const marker =
      node.nodeType === Node.COMMENT_NODE ? node.nodeValue?.trim() : undefined;
    if (marker === "prerender:head") inside = true;
    else if (marker === "/prerender:head") inside = false;
    else if (inside) node.remove();
  }
  createRoot(container).render(app);
}
