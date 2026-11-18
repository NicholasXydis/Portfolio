import { motion } from "framer-motion";
import type { StackGroup } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { pickLocalized } from "@/lib/localized";
import {
  buttonHover,
  staggerContainer,
  staggerContainerFast,
  staggerItem,
} from "@/lib/motion";
import { TechIcon } from "@/components";

export interface TechStackProps {
  groups: StackGroup[];
}

export function TechStack({ groups }: TechStackProps) {
  const locale = useLocale();

  return (
    <motion.dl className="space-y-5" variants={staggerContainer}>
      {groups.map((group) => (
        <motion.div key={group.label.en} variants={staggerContainer}>
          <motion.dt
            className="mb-2 font-mono text-xs uppercase tracking-wide text-koi-ink-faint"
            variants={staggerItem}
          >
            {pickLocalized(group.label, locale)}
          </motion.dt>
          <dd>
            <motion.ul
              className="flex flex-wrap gap-2"
              variants={staggerContainerFast}
            >
              {group.items.map((item) => (
                <motion.li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-md border border-koi-line bg-koi-surface px-3 py-1.5 font-mono text-sm text-koi-ink-dim transition-colors hover:border-koi-line-strong hover:text-koi-ink"
                  variants={staggerItem}
                  whileHover={buttonHover}
                >
                  <TechIcon name={item} />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          </dd>
        </motion.div>
      ))}
    </motion.dl>
  );
}
