import { cubicBezier, type Transition, type Variants } from "framer-motion";

export const ease = cubicBezier(0.22, 1, 0.36, 1);

export const duration = {
  fast: 0.2,
  base: 0.4,
  slow: 0.6,
} as const;

const distance = 16;

export const spring = {
  soft: { type: "spring", stiffness: 170, damping: 24, mass: 1 },
  snappy: { type: "spring", stiffness: 300, damping: 26 },
  magnetic: { type: "spring", stiffness: 160, damping: 18, mass: 0.6 },
} as const satisfies Record<string, Transition>;

export const transition = {
  base: { duration: duration.base, ease },
  fast: { duration: duration.fast, ease },
} as const satisfies Record<string, Transition>;

export const fadeInUp: Variants = {
  hidden: { y: distance, filter: "blur(8px)" },
  visible: (delay = 0) => ({
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease, delay },
  }),
};

export const pageContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.28, delayChildren: 0.15 },
  },
};

export const pageContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.07 },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.14, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { y: distance, filter: "blur(6px)" },
  visible: {
    y: 0,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease },
  },
};

export const photoReveal: Variants = {
  hidden: { scale: 0.94, filter: "blur(10px)" },
  visible: {
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: duration.slow, ease },
  },
};

export const tagHover = {
  y: -2,
  scale: 1.05,
  transition: spring.snappy,
} as const;

export const tapPress = { scale: 0.97 } as const;

export const buttonHover = {
  y: -2,
  boxShadow: "0 12px 34px -12px rgba(255,255,255,0.28)",
} as const;
