import { Fragment } from "react";
import { motion } from "framer-motion";
import { duration, ease } from "@/lib/motion";

export interface RevealTextProps {
  text: string;
  delay?: number;
  className?: string;
}

const letter = {
  hidden: { y: "0.5em", filter: "blur(12px)", rotateX: -80 },
  visible: { y: "0em", filter: "blur(0px)", rotateX: 0 },
};

export function RevealText({ text, delay = 0, className }: RevealTextProps) {
  const words = text.split(" ");
  let index = -1;

  return (
    <span className={className} style={{ perspective: 600 }} aria-hidden="true">
      {words.map((word, wordIndex) => (
        <Fragment key={`${word}-${wordIndex}`}>
          <span className="inline-block whitespace-nowrap">
            {[...word].map((char) => {
              index += 1;
              return (
                <motion.span
                  key={index}
                  className="inline-block will-change-transform"
                  variants={letter}
                  initial="hidden"
                  animate="visible"
                  transition={{
                    duration: duration.slow,
                    ease,
                    delay: delay + index * 0.05,
                  }}
                >
                  {char}
                </motion.span>
              );
            })}
          </span>
          {wordIndex < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
