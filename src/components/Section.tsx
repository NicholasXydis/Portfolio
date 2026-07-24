import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { staggerItem } from "@/lib/motion";

export interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function Section({ id, title, children }: SectionProps) {
  return (
    <motion.section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="grid scroll-mt-24 gap-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-8"
      variants={staggerItem}
    >
      <h2
        id={`${id}-heading`}
        className="text-sm font-semibold uppercase tracking-wide text-white/50"
      >
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </motion.section>
  );
}
