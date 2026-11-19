import { useTranslation } from "react-i18next";
import { LoadingScene } from "@/components/koi";
import { localizedPath } from "@/lib/localized";
import { SITE_NAME } from "@/lib/site";
import { useLocale } from "@/hooks/useLocale";

export interface LoadingScreenProps {
  progress: number;
  ready: boolean;
  leaving: boolean;
  fadeMs?: number;
  onEnter: () => void;
  onPress?: () => void;
}

export function LoadingScreen({
  progress,
  ready,
  leaving,
  fadeMs = 700,
  onEnter,
  onPress,
}: LoadingScreenProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <div
      data-nosnippet=""
      data-testid="loading-screen"
      className={`absolute inset-0 z-30 overflow-y-auto transition-opacity ease-[var(--koi-ease)] motion-reduce:transition-opacity ${
        leaving
          ? "opacity-0 [&_*]:![animation-play-state:paused]"
          : "opacity-100"
      }`}
      style={{
        transitionDuration: `${fadeMs}ms`,
        background:
          "radial-gradient(ellipse at 50% 40%, var(--koi-surface-2), var(--koi-bg) 68%)",
      }}
    >
      <LoadingScene
        progress={progress}
        ready={ready}
        onEnter={onEnter}
        onPress={onPress}
        liteHref={localizedPath(locale, "lite")}
        strings={{
          brand: t("koi.brand").toLowerCase(),
          by: t("koi.by"),
          flat: t("koi.flat2d"),
          loadingTitle: t("koi.filling"),
          progressLabel: t("world.progressLabel"),
          readyTitle: t("koi.pondReady"),
          readyLine: t("koi.stepInside"),
          enter: t("koi.toWorld"),
        }}
        name={SITE_NAME}
        role={t("world.role")}
      />
    </div>
  );
}
