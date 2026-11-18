import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";
import { koiShape } from "./koiShape";

const C = 100;
const RING = 75;

const KOI = {
  cx: C,
  cy: C,
  ring: RING,
  width: 11,
  span: 100,
  swing: 0.2,
  finOuter: 0.8,
  finInner: 0.55,
};
const WAKE = {
  cx: C,
  cy: C,
  ring: RING + 2.6,
  width: 2.8,
  span: 62,
  swing: 0,
  tail: 0.08,
  finOuter: 0,
  finInner: 0,
};
const YANG = koiShape({ ...KOI, head: -70 });
const YIN = koiShape({ ...KOI, head: 110 });
const YANG_WAKE = koiShape({ ...WAKE, head: -70 - KOI.span - 4 });
const YIN_WAKE = koiShape({ ...WAKE, head: 110 - KOI.span - 4 });

const COMMA =
  "M50 5A45 45 0 0 0 50 95A22.5 22.5 0 0 1 50 50A22.5 22.5 0 0 0 50 5Z";

function headOrigin(shape: typeof YANG): CSSProperties {
  return {
    transformOrigin: `${(shape.eye.x / 2).toFixed(1)}% ${(shape.eye.y / 2).toFixed(1)}%`,
  };
}

export interface KoiLoaderProps {
  progress: number;
  size?: number | string;
  label?: string;
  showValue?: boolean;
  still?: boolean;
  decorative?: boolean;
  driven?: boolean;
  className?: string;
}

export function KoiLoader({
  progress,
  size = 200,
  label,
  showValue = true,
  still = false,
  decorative = false,
  driven = false,
  className,
}: KoiLoaderProps) {
  const { t } = useTranslation();
  const value = Math.min(
    1,
    Math.max(0, Number.isFinite(progress) ? progress : 0),
  );
  const percent = Math.round(value * 100);

  const moving = driven ? undefined : ({ "--koi-p": value } as CSSProperties);

  const bar = decorative
    ? ({ "aria-hidden": true } as const)
    : ({
        role: "progressbar",
        "aria-label": label ?? t("koi.loading"),
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": percent,
      } as const);

  return (
    <div
      className={cx(
        "koi-loader",
        driven && "koi-loader--driven",
        still && "koi-loader--still",
        value >= 1 && "koi-loader--full",
        className,
      )}
      {...bar}
      style={moving}
    >
      <div className="koi-loader__stage" style={{ width: size, height: size }}>
        <div className="koi-loader__art" aria-hidden="true">
          <div className="koi-loader__water" />
          <div className="koi-loader__ripple" />
          <div className="koi-loader__swirl">
            <div className="koi-loader__breathe">
              <svg
                className="koi-loader__symbol"
                viewBox="0 0 100 100"
                focusable="false"
              >
                <circle
                  className="koi-loader__yin-half"
                  cx="50"
                  cy="50"
                  r="45"
                />
                <path className="koi-loader__yang-half" d={COMMA} />
              </svg>
              <svg
                className="koi-loader__dots"
                viewBox="0 0 100 100"
                focusable="false"
              >
                <circle
                  className="koi-loader__yin-half"
                  cx="50"
                  cy="27.5"
                  r="6.4"
                />
                <circle
                  className="koi-loader__yang-half"
                  cx="50"
                  cy="72.5"
                  r="6.4"
                />
              </svg>
            </div>
          </div>
          <div className="koi-loader__school">
            <div className="koi-loader__swim">
              <div
                className="koi-loader__koi koi-loader__koi--yang"
                style={headOrigin(YANG)}
              >
                <svg viewBox="0 0 200 200" focusable="false">
                  <path className="koi-loader__wake" d={YANG_WAKE.body} />
                  <path d={YANG.fins} />
                  <path d={YANG.body} />
                  <circle
                    className="koi-loader__eye"
                    cx={YANG.eye.x}
                    cy={YANG.eye.y}
                    r={YANG.eye.r}
                  />
                </svg>
              </div>
              <div
                className="koi-loader__koi koi-loader__koi--yin"
                style={headOrigin(YIN)}
              >
                <svg viewBox="0 0 200 200" focusable="false">
                  <path className="koi-loader__wake" d={YIN_WAKE.body} />
                  <path d={YIN.fins} />
                  <path d={YIN.body} />
                  <circle
                    className="koi-loader__eye"
                    cx={YIN.eye.x}
                    cy={YIN.eye.y}
                    r={YIN.eye.r}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showValue && (
        <p
          className="koi-loader__value"
          aria-hidden="true"
          style={{ "--koi-n": percent } as CSSProperties}
        >
          <span>%</span>
        </p>
      )}
    </div>
  );
}
