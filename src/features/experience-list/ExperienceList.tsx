import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Experience } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { useCardHover } from "@/hooks/useCardHover";
import { formatDateRange } from "@/lib/dates";
import { pickLocalized } from "@/lib/localized";
import {
  buttonHover,
  duration,
  ease,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";
import {
  CollapsibleBullets,
  EntryLogo,
  ExternalLink,
  GithubIcon,
  GlobeIcon,
} from "@/components";
import { actionClass } from "@/features/project-list";

export interface ExperienceListProps {
  experiences: Experience[];
  showActions?: boolean;
}

function ExperienceCard({
  experience,
  showActions,
}: {
  experience: Experience;
  showActions: boolean;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const card = useCardHover<HTMLLIElement>();
  const company = pickLocalized(experience.company, locale);
  const role = pickLocalized(experience.role, locale);
  const companyName = experience.companyUrl ? (
    <ExternalLink href={experience.companyUrl} className="hover:underline">
      {company}
    </ExternalLink>
  ) : (
    company
  );

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
        <EntryLogo src={experience.logo} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">
            {experience.companyFirst ? companyName : role}
          </h3>
          <p className="text-sm text-white/80">
            {experience.companyFirst ? role : companyName}
          </p>
          <p className="mt-1 font-mono text-xs text-white/50">
            {formatDateRange(
              experience.startDate,
              experience.endDate,
              locale,
              t("projects.present"),
            )}
            {experience.location &&
              ` | ${pickLocalized(experience.location, locale)}`}
          </p>
        </div>
      </div>

      <div>
        {experience.description && (
          <CollapsibleBullets
            text={pickLocalized(experience.description, locale)}
            className="mt-3 space-y-2 text-sm text-white/80"
          />
        )}
        {showActions && (experience.companyUrl || experience.repo) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {experience.companyUrl && (
              <ExternalLink
                href={experience.companyUrl}
                className={actionClass}
                aria-label={`${company} ${t("projects.viewWebsite")}`}
                whileHover={buttonHover}
              >
                <GlobeIcon size={14} />
                {t("projects.viewWebsite")}
              </ExternalLink>
            )}
            {experience.repo && (
              <ExternalLink
                href={experience.repo}
                className={actionClass}
                aria-label={`${company} ${t("projects.viewRepo")}`}
                whileHover={buttonHover}
              >
                <GithubIcon size={14} />
                {t("projects.viewRepo")}
              </ExternalLink>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}

export function ExperienceList({
  experiences,
  showActions = true,
}: ExperienceListProps) {
  const { t } = useTranslation();

  if (experiences.length === 0) {
    return <p className="text-white/60">{t("experience.empty")}</p>;
  }

  return (
    <motion.ul className="space-y-4" variants={staggerContainer}>
      {experiences.map((experience) => (
        <ExperienceCard
          key={experience.slug}
          experience={experience}
          showActions={showActions}
        />
      ))}
    </motion.ul>
  );
}
