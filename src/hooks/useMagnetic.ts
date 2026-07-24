import { useRef } from "react";
import type { MouseEvent } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { spring } from "@/lib/motion";

export function useMagnetic<T extends HTMLElement>(strength = 0.35) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<T>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, spring.magnetic);
  const springY = useSpring(y, spring.magnetic);

  if (reduceMotion) {
    return {
      ref,
      style: undefined,
      onMouseMove: undefined,
      onMouseLeave: undefined,
    } as const;
  }

  const onMouseMove = (event: MouseEvent<T>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { ref, style: { x: springX, y: springY }, onMouseMove, onMouseLeave };
}
