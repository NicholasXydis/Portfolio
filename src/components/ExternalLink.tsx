import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { tapPress } from "@/lib/motion";

export interface ExternalLinkProps extends HTMLMotionProps<"a"> {
  href: string;
  children: ReactNode;
}

export function ExternalLink({ href, children, ...rest }: ExternalLinkProps) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={tapPress}
      {...rest}
    >
      {children}
    </motion.a>
  );
}
