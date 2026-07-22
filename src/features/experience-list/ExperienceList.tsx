import { useTranslation } from "react-i18next";
import type { Experience } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { formatDateRange } from "@/lib/dates";
import { pickLocalized } from "@/lib/localized";
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
}

export function ExperienceList({ experiences }: ExperienceListProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  if (experiences.length === 0) {
    return <p className="text-white/60">{t("experience.empty")}</p>;
  }

  return (
    <ul className="space-y-4">
      {experiences.map((experience) => (
        <li
          key={experience.slug}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="flex items-start gap-3">
            <EntryLogo src={experience.logo} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  {experience.companyUrl ? (
                    <ExternalLink
                      href={experience.companyUrl}
                      className="hover:underline"
                    >
                      {experience.company}
                    </ExternalLink>
                  ) : (
                    experience.company
                  )}
                </h3>
                <span className="font-mono text-xs text-white/50">
                  {formatDateRange(
                    experience.startDate,
                    experience.endDate,
                    locale,
                    t("projects.present"),
                  )}
                </span>
              </div>
              <p className="text-sm text-white/80">
                {pickLocalized(experience.role, locale)}
              </p>
              {experience.location && (
                <p className="mt-1 font-mono text-xs text-white/50">
                  {pickLocalized(experience.location, locale)}
                </p>
              )}
            </div>
          </div>
          <CollapsibleBullets
            text={pickLocalized(experience.description, locale)}
            className="mt-3 space-y-2 text-sm text-white/80"
          />
          {(experience.companyUrl || experience.repo) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {experience.companyUrl && (
                <ExternalLink
                  href={experience.companyUrl}
                  className={actionClass}
                  aria-label={`${experience.company} ${t("projects.viewWebsite")}`}
                >
                  <GlobeIcon size={14} />
                  {t("projects.viewWebsite")}
                </ExternalLink>
              )}
              {experience.repo && (
                <ExternalLink
                  href={experience.repo}
                  className={actionClass}
                  aria-label={`${experience.company} ${t("projects.viewRepo")}`}
                >
                  <GithubIcon size={14} />
                  {t("projects.viewRepo")}
                </ExternalLink>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
