import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { useLocale } from "@/hooks/useLocale";
import { track } from "@/lib/analytics";

function QuebecFlag() {
  const fleur =
    "M0 -4.2C1.2 -2.8 1.8 -1.6 1.6 -0.4C2.4 -1.2 3.3 -1.3 4 -0.4C3.4 0.5 2.5 0.9 1.4 0.7C1.6 1.7 1 2.4 0 3.4C-1 2.4 -1.6 1.7 -1.4 0.7C-2.5 0.9 -3.4 0.5 -4 -0.4C-3.3 -1.3 -2.4 -1.2 -1.6 -0.4C-1.8 -1.6 -1.2 -2.8 0 -4.2Z";
  return (
    <svg
      className="h-[14px] w-[20px] shrink-0"
      viewBox="0 0 20 14"
      fill="none"
      aria-hidden="true"
    >
      <rect width="20" height="14" fill="#003DA5" />
      <rect x="8" width="4" height="14" fill="white" />
      <rect y="5" width="20" height="4" fill="white" />
      <path d={fleur} fill="white" transform="translate(4 2.8) scale(0.42)" />
      <path d={fleur} fill="white" transform="translate(16 2.8) scale(0.42)" />
      <path d={fleur} fill="white" transform="translate(4 11.2) scale(0.42)" />
      <path d={fleur} fill="white" transform="translate(16 11.2) scale(0.42)" />
    </svg>
  );
}

function CanadaFlag() {
  return (
    <svg
      className="h-[14px] w-[20px] shrink-0 overflow-hidden rounded-[1px]"
      viewBox="0 0 640 480"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path fill="#fff" d="M150.1 0h339.7v480H150z" />
      <path
        fill="#d52b1e"
        d="M-19.7 0h169.8v480H-19.7zm509.5 0h169.8v480H489.9zM201 232l-13.3 4.4 61.4 54c4.7 13.7-1.6 17.8-5.6 25l66.6-8.4-1.6 67 13.9-.3-3.1-66.6 66.7 8c-4.1-8.7-7.8-13.3-4-27.2l61.3-51-10.7-4c-8.8-6.8 3.8-32.6 5.6-48.9 0 0-35.7 12.3-38 5.8l-9.2-17.5-32.6 35.8c-3.5.9-5-.5-5.9-3.5l15-74.8-23.8 13.4q-3.2 1.3-5.2-2.2l-23-46-23.6 47.8q-2.8 2.5-5 .7L264 130.8l13.7 74.1c-1.1 3-3.7 3.8-6.7 2.2l-31.2-35.3c-4 6.5-6.8 17.1-12.2 19.5s-23.5-4.5-35.6-7c4.2 14.8 17 39.6 9 47.7"
      />
    </svg>
  );
}

export function LanguageToggle() {
  const { t } = useTranslation();
  const activeLocale = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const nextLocale = activeLocale === "fr" ? "en" : "fr";
  const label = activeLocale === "fr" ? "EN" : "FR";

  function handleSwitch() {
    track.languageSwitch(nextLocale);
    const localePrefix = new RegExp(`^/(${SUPPORTED_LOCALES.join("|")})`);
    const rest = location.pathname.replace(localePrefix, "");
    navigate(`/${nextLocale}${rest}${location.search}${location.hash}`);
  }

  return (
    <motion.button
      type="button"
      onClick={handleSwitch}
      aria-label={t(`language.${nextLocale}`)}
      whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.03 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      className="flex h-[38px] touch-manipulation items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors hover:bg-white/10"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={nextLocale}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.15 }}
          className="flex items-center"
        >
          {nextLocale === "fr" ? <QuebecFlag /> : <CanadaFlag />}
        </motion.span>
      </AnimatePresence>
      <span>{label}</span>
    </motion.button>
  );
}
