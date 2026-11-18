import type { ReactNode } from "react";
import { cx } from "./cx";
import { KoiMark } from "./KoiMark";

export interface CornerCreditProps {
  label: string;
  children?: ReactNode;
  className?: string;
}

export function CornerCredit({
  label,
  children,
  className,
}: CornerCreditProps) {
  const line = (
    <>
      <KoiMark size={12} />
      <span>{label}</span>
    </>
  );
  if (!children) {
    return <p className={cx("koi-credit", className)}>{line}</p>;
  }
  return (
    <details className={cx("koi-credit koi-credit--opens", className)}>
      <summary className="koi-credit__line">{line}</summary>
      <div className="koi-credit__card">{children}</div>
    </details>
  );
}
