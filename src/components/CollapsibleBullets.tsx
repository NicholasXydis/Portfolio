import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { duration, ease, transition } from "@/lib/motion";
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
  const previewPoints = points.slice(0, previewCount);
  const hiddenPoints = points.slice(previewCount);
  const hiddenCount = hiddenPoints.length;

  return (
    <div>
      <BulletList
        id={listId}
        text={previewPoints.join("\n")}
        className={className}
      />
      <AnimatePresence initial={false}>
        {expanded && hiddenPoints.length > 0 && (
          <motion.div
            key="more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: duration.base, ease }}
            className="overflow-hidden"
          >
            <BulletList text={hiddenPoints.join("\n")} className={className} />
          </motion.div>
        )}
      </AnimatePresence>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="mt-3 inline-flex items-center gap-1 font-mono text-xs font-medium text-white/70 transition-colors hover:text-white"
        >
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={transition.fast}
            className="inline-flex"
          >
            <ChevronDownIcon size={14} />
          </motion.span>
          {expanded
            ? t("projects.showLess")
            : t("projects.showMore", { count: hiddenCount })}
        </button>
      )}
    </div>
  );
}
