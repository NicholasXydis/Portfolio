import { cx } from "./cx";

export interface PortraitProps {
  alt: string;
  size?: number;
  shape?: "round";
  tone?: "color" | "ink";
  src?: string;
  fallbackSrc?: string;
  eager?: boolean;
  className?: string;
}

export function Portrait({
  alt,
  size = 72,
  shape = "round",
  tone = "color",
  src = "/portrait.webp",
  fallbackSrc = "/portrait.jpg",
  eager = false,
  className,
}: PortraitProps) {
  return (
    <span
      className={cx(
        "koi-portrait",
        `koi-portrait--${shape}`,
        tone === "ink" && "koi-portrait--ink",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <picture>
        <source srcSet={src} type="image/webp" />
        <img
          src={fallbackSrc}
          alt={alt}
          width={size}
          height={size}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      </picture>
    </span>
  );
}
