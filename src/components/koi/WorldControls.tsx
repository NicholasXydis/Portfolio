import { useTranslation } from "react-i18next";
import { cx } from "./cx";
import { MoonIcon, RadioIcon, SpeakerIcon, SunIcon } from "./icons";
import type { KoiTheme } from "./theme";

export interface DayNightButtonProps {
  theme: KoiTheme;
  onChange: (next: KoiTheme) => void;
  className?: string;
}

export function DayNightButton({
  theme,
  onChange,
  className,
}: DayNightButtonProps) {
  const { t } = useTranslation();
  const night = theme === "dark";
  return (
    <button
      type="button"
      className={cx("koi-daynight", className)}
      aria-label={t("koi.night")}
      aria-pressed={night}
      title={t(night ? "koi.toDay" : "koi.toNight")}
      onClick={() => onChange(night ? "light" : "dark")}
    >
      {night ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export interface RadioPillProps {
  playing: boolean;
  onToggle: (next: boolean) => void;
  name?: string;
  className?: string;
}

export function RadioPill({
  playing,
  onToggle,
  name,
  className,
}: RadioPillProps) {
  const { t } = useTranslation();
  const label = t(playing ? "koi.musicMute" : "koi.musicPlay");
  return (
    <div className={cx("koi-radio", className)} data-playing={playing}>
      <button
        type="button"
        className="koi-radio__button"
        aria-label={label}
        title={label}
        onClick={() => onToggle(!playing)}
      >
        <SpeakerIcon muted={!playing} />
      </button>
      <span className="koi-radio__name" aria-hidden="true">
        <RadioIcon />
        {name ?? t("koi.radio")}
      </span>
    </div>
  );
}
