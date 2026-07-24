import { useState } from "react";
import { motion } from "framer-motion";
import { photoReveal, spring } from "@/lib/motion";

export function HeroPhoto() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <motion.div
      className="shrink-0 rounded-2xl bg-gradient-to-b from-white/12 via-white/10 to-white/35 p-px shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)]"
      variants={photoReveal}
      whileHover={{ scale: 1.02, y: -2, transition: spring.soft }}
      whileTap={{ scale: 0.99, transition: spring.snappy }}
    >
      <picture>
        <source srcSet="/portrait.webp" type="image/webp" />
        <img
          src="/portrait.jpg"
          alt="Nicholas Xydis"
          width={208}
          height={208}
          onError={() => setFailed(true)}
          className="h-44 w-44 rounded-2xl object-cover sm:h-52 sm:w-52"
        />
      </picture>
    </motion.div>
  );
}
