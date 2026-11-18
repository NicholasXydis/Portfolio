import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Education } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { useCardHover } from "@/hooks/useCardHover";
import { formatMonthYear, formatYearRange, futureYear } from "@/lib/dates";
import { pickLocalized, pickUrl } from "@/lib/localized";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { EntryLogo, ExternalLink } from "@/components";

export interface EducationListProps {
  educations: Education[];
}

function EducationCard({ education }: { education: Education }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const card = useCardHover<HTMLLIElement>();
  const institution = pickLocalized(education.institution, locale);
  const expectedDate =
    education.endDate && futureYear(education.endDate)
      ? formatMonthYear(education.endDate, locale)
      : null;

  return (
    <motion.li
      ref={card.ref}
      {...card.handlers}
      className="relative rounded-lg border border-koi-line bg-koi-surface p-5 transition-colors duration-[var(--koi-dur)] hover:border-koi-line-strong hover:bg-koi-surface-2"
      variants={staggerItem}
    >
      {card.glow}
      <div className="flex items-start gap-3">
        <EntryLogo src={education.logo} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">
            {education.institutionUrl ? (
              <ExternalLink
                href={pickUrl(education.institutionUrl, locale)}
                className="koi-textlink hover:underline"
              >
                {institution}
              </ExternalLink>
            ) : (
              institution
            )}
          </h3>
          <p className="text-sm text-koi-ink-dim">
            {pickLocalized(education.credential, locale)}
            {education.field
              ? ` · ${pickLocalized(education.field, locale)}`
              : ""}
          </p>
          <p className="mt-1 font-mono text-xs text-koi-ink-faint">
            {expectedDate
              ? t("education.expected", { date: expectedDate })
              : formatYearRange(
                  education.startDate,
                  education.endDate,
                  t("projects.present"),
                )}
            {education.location &&
              ` | ${pickLocalized(education.location, locale)}`}
          </p>
        </div>
      </div>

      {education.note && (
        <p className="mt-3 text-sm text-koi-ink-dim">
          <span aria-hidden="true">· </span>
          {pickLocalized(education.note, locale)}
        </p>
      )}
    </motion.li>
  );
}

export function EducationList({ educations }: EducationListProps) {
  const { t } = useTranslation();

  if (educations.length === 0) {
    return <p className="text-koi-ink-faint">{t("education.empty")}</p>;
  }

  return (
    <motion.ul className="space-y-4" variants={staggerContainer}>
      {educations.map((education) => (
        <EducationCard key={education.slug} education={education} />
      ))}
    </motion.ul>
  );
}
