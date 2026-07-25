import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { MotionConfig } from "framer-motion";
import "@/lib/i18n";
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

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
);
