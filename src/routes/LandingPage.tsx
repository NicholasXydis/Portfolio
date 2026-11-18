import { useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Seo } from "@/components";
import { WorldLanding, type WorldFailure } from "@/features/world";
import { useLocale } from "@/hooks/useLocale";
import { pageCopy } from "@/lib/meta";
import { LitePage } from "@/routes/LitePage";

const noop = () => () => {};

function noGraphics(): boolean {
  return (window as unknown as { __koiNoGL?: boolean }).__koiNoGL === true;
}

function useNoGraphics(): boolean {
  return useSyncExternalStore(noop, noGraphics, () => false);
}

export function LandingPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const flatByDevice = useNoGraphics();
  const [failure, setFailure] = useState<WorldFailure | null>(null);
  const flat = flatByDevice || failure !== null;
  const loadFailed = !flatByDevice && failure === "load";
  return (
    <>
      <Seo {...pageCopy("home", locale)} path="" />
      {flat ? (
        <div data-no-graphics className="[&_.lite-world-pill]:!hidden">
          <p
            role="note"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-[var(--koi-line)] bg-[var(--koi-surface)] px-4 py-2.5 text-center text-[13px] text-[var(--koi-ink-dim)] [font-family:var(--koi-font-body)]"
          >
            <span>
              {loadFailed ? t("world.loadFailed") : t("world.noGraphics")}
            </span>
            {loadFailed && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-10 rounded-[var(--koi-radius-pill)] border border-[var(--koi-line-strong)] px-4 text-[13px] text-[var(--koi-ink)] outline-none hover:bg-[var(--koi-glow-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--koi-glow)]"
              >
                {t("world.tryAgain")}
              </button>
            )}
          </p>
          <LitePage embedded />
        </div>
      ) : (
        <WorldLanding onFail={setFailure} />
      )}
    </>
  );
}
