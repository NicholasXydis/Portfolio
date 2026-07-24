import { useRef } from "react";
import type { MouseEvent, ReactNode, RefObject } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

const BORDER_MASK =
  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";

interface CardHover<T> {
  ref: RefObject<T | null>;
  handlers: {
    onMouseMove?: (event: MouseEvent<T>) => void;
    onMouseLeave?: () => void;
  };
  glow: ReactNode;
}

export function useCardHover<
  T extends HTMLElement = HTMLDivElement,
>(): CardHover<T> {
  const reduceMotion = useReducedMotion();
  const ref = useRef<T>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 30, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 220, damping: 30, mass: 0.6 });
  const springOpacity = useSpring(opacity, { stiffness: 160, damping: 26 });
  const background = useMotionTemplate`radial-gradient(180px circle at ${springX}px ${springY}px, rgba(255,255,255,0.6), transparent 65%)`;

  if (reduceMotion) {
    return { ref, handlers: {}, glow: null };
  }

  const onMouseMove = (event: MouseEvent<T>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
    opacity.set(1);
  };

  const onMouseLeave = () => opacity.set(0);

  const glow = (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] p-px"
      style={{
        background,
        opacity: springOpacity,
        WebkitMask: BORDER_MASK,
        mask: BORDER_MASK,
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    />
  );

  return { ref, handlers: { onMouseMove, onMouseLeave }, glow };
}
