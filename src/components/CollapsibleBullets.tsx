import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { BulletList } from "./BulletList";
import { ChevronDownIcon } from "./icons";

export interface CollapsibleBulletsProps {
  text: string;
  previewCount?: number;
  className?: string;
}

export function CollapsibleBullets({
  text,
  previewCount = 2,
  className,
}: CollapsibleBulletsProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  const points = text.split("\n").filter((point) => point.trim().length > 0);
  const hasMore = points.length > previewCount;
  const visiblePoints = expanded ? points : points.slice(0, previewCount);
  const hiddenCount = points.length - previewCount;

  return (
    <div>
      <BulletList
        id={listId}
        text={visiblePoints.join("\n")}
        className={className}
      />
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="mt-3 inline-flex items-center gap-1 font-mono text-xs font-medium text-white/70 transition-colors hover:text-white"
        >
          <ChevronDownIcon
            size={14}
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
          {expanded
            ? t("projects.showLess")
            : t("projects.showMore", { count: hiddenCount })}
        </button>
      )}
    </div>
  );
}
