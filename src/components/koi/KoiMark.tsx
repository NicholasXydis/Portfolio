import type { CSSProperties } from "react";
import { cx } from "./cx";

const KOI_BODY =
  "M24.2 13.1A45 45 0 0 0 27.5 88.97Q37.4 96.4 51.5 100.6Q40.2 92.6 30.12 84.44" +
  "A24 24 0 0 1 50 47A19 19 0 0 0 50 9C40 9 31.6 7.9 24.2 13.1Z";
const KOI_BODY_SMALL =
  "M50 5A45 45 0 0 0 50 95A24 24 0 0 1 50 47A21 21 0 0 0 50 5Z";
const KOI_FIN = "M12.26 26.42Q-0.75 26.33-4.87 46.16Q2.26 44.98 6.18 42.27Z";

export interface KoiMarkProps {
  size?: number;
  title?: string;
  className?: string;
}

export function KoiMark({ size = 32, title, className }: KoiMarkProps) {
  const detailed = size >= 40;
  const line = size >= 96 ? 1.75 : size >= 48 ? 1.35 : 1;
  const eye = detailed ? (
    <circle className="koi-mark__eye" cx="56.5" cy="24.5" r="3.1" />
  ) : (
    <circle className="koi-mark__eye" cx="51" cy="28" r="5.6" />
  );
  return (
    <svg
      className={cx("koi-mark", className)}
      style={{ "--koi-mark-line": `${line}px` } as CSSProperties}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g
        transform={
          detailed
            ? "translate(5.5 5.5) scale(0.89)"
            : "translate(1 1) scale(0.98)"
        }
      >
        <g className="koi-mark__yin" transform="rotate(180 50 50)">
          {detailed && <path d={KOI_FIN} />}
          <path d={detailed ? KOI_BODY : KOI_BODY_SMALL} />
          {eye}
        </g>
        <g className="koi-mark__yang">
          {detailed && <path d={KOI_FIN} />}
          <path d={detailed ? KOI_BODY : KOI_BODY_SMALL} />
          {eye}
        </g>
      </g>
    </svg>
  );
}

export interface SealProps {
  size?: number;
  title?: string;
  className?: string;
}

export function Seal({ size = 18, title, className }: SealProps) {
  return (
    <svg
      className={cx("koi-seal", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <rect
        className="koi-seal__block"
        x="1"
        y="1"
        width="22"
        height="22"
        rx="3.2"
      />
      <g className="koi-seal__fish" transform="translate(4.9 4.9) scale(0.142)">
        <path d={KOI_BODY_SMALL} />
        <path d={KOI_BODY_SMALL} transform="rotate(180 50 50)" />
      </g>
    </svg>
  );
}
