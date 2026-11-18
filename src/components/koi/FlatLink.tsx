import { Link } from "react-router";
import { cx } from "./cx";
import { GridIcon } from "./icons";

export interface FlatLinkProps {
  to: string;
  label: string;
  compact?: boolean;
  glyph?: string;
  className?: string;
}

export function FlatLink({
  to,
  label,
  compact = false,
  glyph,
  className,
}: FlatLinkProps) {
  return (
    <Link
      to={to}
      className={cx(
        "koi-flatlink",
        compact && "koi-flatlink--compact",
        className,
      )}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
    >
      {compact && glyph ? (
        <span className="koi-flatlink__glyph" aria-hidden="true">
          {glyph}
        </span>
      ) : (
        <GridIcon size={15} />
      )}
      {!compact && <span>{label}</span>}
    </Link>
  );
}
