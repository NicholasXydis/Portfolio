import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Education } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { useCardHover } from "@/hooks/useCardHover";
import { formatDateRange } from "@/lib/dates";
import { pickLocalized } from "@/lib/localized";
import { duration, ease, staggerContainer, staggerItem } from "@/lib/motion";
import { EntryLogo, ExternalLink } from "@/components";

export interface EducationListProps {
  educations: Education[];
}

function EducationCard({ education }: { education: Education }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const card = useCardHover<HTMLLIElement>();

  return (
    <motion.li
      ref={card.ref}
      {...card.handlers}
      className="relative rounded-lg border border-white/10 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.05]"
      variants={staggerItem}
      whileHover={{
        boxShadow:
          "0 24px 60px -30px rgba(0,0,0,0.95), 0 0 40px -14px rgba(255,255,255,0.1)",
        transition: { duration: duration.base, ease },
      }}
    >
      {card.glow}
      <div className="flex items-start gap-3">
        <EntryLogo src={education.logo} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">
              {education.institutionUrl ? (
                <ExternalLink
                  href={education.institutionUrl}
                  className="hover:underline"
                >
                  {education.institution}
                </ExternalLink>
              ) : (
                education.institution
              )}
            </h3>
            <span className="font-mono text-xs text-white/50">
              {formatDateRange(
                education.startDate,
                education.endDate,
                locale,
                t("projects.present"),
              )}
            </span>
          </div>
          <p className="text-sm text-white/80">
            {pickLocalized(education.credential, locale)}
            {education.field
              ? ` · ${pickLocalized(education.field, locale)}`
              : ""}
          </p>
          {education.note && (
            <p className="mt-1 text-sm text-white/80">
              <span aria-hidden="true">· </span>
              {pickLocalized(education.note, locale)}
            </p>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function EducationList({ educations }: EducationListProps) {
  const { t } = useTranslation();

  if (educations.length === 0) {
    return <p className="text-white/60">{t("education.empty")}</p>;
  }

  return (
    <motion.ul className="space-y-4" variants={staggerContainer}>
      {educations.map((education) => (
        <EducationCard key={education.slug} education={education} />
      ))}
    </motion.ul>
  );
}
