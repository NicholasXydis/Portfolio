import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { duration, ease } from "@/lib/motion";

export interface PageTransitionProps {
  transitionKey: string;
  children: ReactNode;
}

export function PageTransition({
  transitionKey,
  children,
}: PageTransitionProps) {
  return (
    <motion.div
      key={transitionKey}
      initial={{ filter: "blur(10px)" }}
      animate={{ filter: "blur(0px)" }}
      transition={{ duration: duration.base, ease }}
    >
      {children}
    </motion.div>
  );
}
