import { cx } from "./cx";

export type ButtonVariant = "outline" | "solid";
export type ButtonSize = "md" | "lg";

export function buttonClass(
  variant: ButtonVariant = "outline",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cx(
    "koi-btn",
    `koi-btn--${variant}`,
    size === "lg" && "koi-btn--lg",
    className,
  );
}
