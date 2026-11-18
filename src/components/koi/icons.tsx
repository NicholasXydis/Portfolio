import type { ReactNode } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

function line(className?: string): string {
  return className ? `koi-icon ${className}` : "koi-icon";
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

export function GridIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      className={line(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function MoonIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      className={line(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
    >
      <path d="M19.6 14.3A8 8 0 1 1 9.7 4.4a6.4 6.4 0 0 0 9.9 9.9Z" />
    </svg>
  );
}

export function SunIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      className={line(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
    >
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.800 12H21M5.6 5.6l1.600 1.600M16.800 16.800l1.600 1.600M5.600 18.400l1.600-1.600M16.800 7.200l1.600-1.600" />
    </svg>
  );
}

export function SpeakerIcon({
  size = 18,
  muted = false,
  className,
}: IconProps & { muted?: boolean }) {
  return (
    <svg
      className={line(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
    >
      <path d="M4 9.600v4.800h3.200L11.600 18V6L7.200 9.600H4Z" />
      {muted ? (
        <path d="m15.400 9.600 4.600 4.800M20 9.600l-4.600 4.800" />
      ) : (
        <path d="M15 9.300a4 4 0 0 1 0 5.400M17.500 6.800a7.400 7.400 0 0 1 0 10.400" />
      )}
    </svg>
  );
}

export function RadioIcon({ size = 13, className }: IconProps) {
  return (
    <svg
      className={line(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
    >
      <path d="M8 8.500 16.500 4M4.500 8.500h15a1.500 1.500 0 0 1 1.500 1.500v8a1.500 1.500 0 0 1-1.500 1.500h-15A1.500 1.500 0 0 1 3 18v-8a1.500 1.500 0 0 1 1.500-1.500Z" />
      <circle cx="8.500" cy="14" r="2.400" />
      <path d="M14 12.500h4M14 15.500h4" />
    </svg>
  );
}

export function FilmIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      className={line(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
    >
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M8 5v14M16 5v14M3.5 9.700H8M3.5 14.300H8M16 9.700h4.500M16 14.300h4.500" />
    </svg>
  );
}

export function LayersIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      className={line(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
    >
      <path d="M12 4 20.500 8.500 12 13 3.500 8.500 12 4Z" />
      <path d="M3.500 12.500 12 17l8.500-4.500M3.500 16.500 12 21l8.500-4.500" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      className={line(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...base}
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function FishIcon({ size = 22, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        transform="matrix(-1 0 0 1 32 0)"
        d="M1.5 13.2c3.4-5.6 8.6-8.3 14-7.6 3 .4 5.6 1.900 7.700 4.100 1.700-2.300 4-3.900 7.300-4.700-1.300 2.500-1.700 4.700-1.300 6.700.300 1.700 1.100 3.300 2.300 4.900-3.500-.300-6.100-1.500-8-3.500-2.300 2.700-5.300 4.200-8.900 4.300-4.900.200-9.300-1.300-13.100-4.200Zm6.700-2.400a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

export interface FlagProps {
  tone?: "color" | "ink";
  className?: string;
}

const FLAG = { blue: "#27408b", red: "#c5283a", white: "#f8f6f1" } as const;

function FlagFrame({
  tone = "color",
  className,
  children,
}: FlagProps & { children: ReactNode }) {
  const classes = ["koi-flag", tone === "ink" && "koi-flag--ink", className]
    .filter(Boolean)
    .join(" ");
  return (
    <svg
      className={classes}
      width="24"
      height="16"
      viewBox="0 0 24 16"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

const US_STRIPE = 16 / 13;
const US_RED_STRIPES = [0, 2, 4, 6, 8, 10, 12];
const US_CANTON = { width: 9.6, height: US_STRIPE * 7 };
const US_STARS = [1.6, 4.8, 8]
  .flatMap((x) => [1.5, 4.3, 7.1].map((y) => [x, y] as const))
  .concat([3.2, 6.4].flatMap((x) => [2.9, 5.7].map((y) => [x, y] as const)));

export function FlagUS(props: FlagProps) {
  return (
    <FlagFrame {...props}>
      <rect width="24" height="16" fill={FLAG.white} />
      {US_RED_STRIPES.map((n) => (
        <rect
          key={n}
          y={(n * US_STRIPE).toFixed(3)}
          width="24"
          height={US_STRIPE.toFixed(3)}
          fill={FLAG.red}
        />
      ))}
      <rect
        width={US_CANTON.width}
        height={US_CANTON.height.toFixed(3)}
        fill={FLAG.blue}
      />
      {US_STARS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.62" fill={FLAG.white} />
      ))}
    </FlagFrame>
  );
}

export function FlagFrance(props: FlagProps) {
  return (
    <FlagFrame {...props}>
      <rect width="8" height="16" fill={FLAG.blue} />
      <rect x="8" width="8" height="16" fill={FLAG.white} />
      <rect x="16" width="8" height="16" fill={FLAG.red} />
    </FlagFrame>
  );
}
