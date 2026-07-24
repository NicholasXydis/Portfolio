import { motion } from "framer-motion";
import type { StackGroup } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { pickLocalized } from "@/lib/localized";
import {
  buttonHover,
  staggerContainer,
  staggerItem,
  tapPress,
} from "@/lib/motion";
import { TechIcon } from "@/components";

export interface TechStackProps {
  groups: StackGroup[];
}

export function TechStack({ groups }: TechStackProps) {
  const locale = useLocale();

  return (
    <dl className="space-y-5">
      {groups.map((group) => (
        <div key={group.label.en}>
          <dt className="mb-2 font-mono text-xs uppercase tracking-wide text-white/60">
            {pickLocalized(group.label, locale)}
          </dt>
          <dd>
            <motion.ul
              className="flex flex-wrap gap-2"
              variants={staggerContainer}
            >
              {group.items.map((item) => (
                <motion.li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-sm text-white/75 transition-colors hover:border-white/20 hover:text-white"
                  variants={staggerItem}
                  whileHover={buttonHover}
                  whileTap={tapPress}
                >
                  <TechIcon name={item} />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
