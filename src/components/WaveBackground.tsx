import { motion } from "framer-motion";
import { Waves } from "@/components/ui/wave-background";
import { duration, ease } from "@/lib/motion";

export function WaveBackground() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: duration.slow * 2, ease }}
    >
      <Waves
        strokeColor="rgba(255,255,255,0.12)"
        backgroundColor="transparent"
      />
    </motion.div>
  );
}
