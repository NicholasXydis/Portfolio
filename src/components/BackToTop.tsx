import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowUpIcon } from "@/components";
import { buttonHover, staggerItem, tapPress } from "@/lib/motion";

export function BackToTop({ className = "" }: { className?: string }) {
  const { t } = useTranslation();

  const scrollToTop = () => {
    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <motion.div
      variants={staggerItem}
      className={`flex justify-start pt-4 ${className}`}
    >
      <motion.button
        type="button"
        onClick={scrollToTop}
        aria-label={t("nav.backToTop")}
        className="inline-flex h-[38px] items-center gap-2 rounded-md border border-white/20 bg-white/[0.06] px-3.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors hover:bg-white/10"
        whileHover={buttonHover}
        whileTap={tapPress}
      >
        <ArrowUpIcon size={16} />
        {t("nav.backToTop")}
      </motion.button>
    </motion.div>
  );
}
