import { cubicBezier, type Transition, type Variants } from "framer-motion";

export const ease = cubicBezier(0.22, 0.61, 0.36, 1);

export const duration = {
  fast: 0.16,
  base: 0.32,
  slow: 0.56,
} as const;

const distance = 12;

export const spring = {
  soft: { duration: 0.16, ease },
  snappy: { duration: 0.16, ease },
  magnetic: { duration: 0.16, ease },
} as const satisfies Record<string, Transition>;

export const transition = {
  base: { duration: duration.base, ease },
  fast: { duration: duration.fast, ease },
} as const satisfies Record<string, Transition>;

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease },
  },
};

export const photoReveal: Variants = {
  hidden: { opacity: 0, y: distance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease },
  },
};

export const tagHover = {
  y: -2,
  transition: { duration: 0.16, ease },
} as const;

export const tapPress = { scale: 0.97 } as const;

export const buttonHover = {
  y: -2,
  boxShadow: "0 12px 34px -12px rgba(255,255,255,0.28)",
  transition: { duration: 0.16, ease },
} as const;
