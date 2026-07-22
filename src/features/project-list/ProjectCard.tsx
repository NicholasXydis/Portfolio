import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Project } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { formatDateRange } from "@/lib/dates";
import { localizedPath, pickLocalized } from "@/lib/localized";
import {
  CaseStudyIcon,
  CollapsibleBullets,
  EntryLogo,
  ExternalLink,
  GithubIcon,
  GlobeIcon,
  TechIcon,
} from "@/components";

export interface ProjectCardProps {
  project: Project;
}

export const actionClass =
  "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-white/80 transition-colors hover:border-white/20 hover:text-white";

export function ProjectCard({ project }: ProjectCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const caseStudyPath = localizedPath(locale, `projects/${project.slug}`);
  const name = pickLocalized(project.title, locale);
  const subtitle = project.subtitle
    ? pickLocalized(project.subtitle, locale)
    : "";

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start gap-3">
        <EntryLogo src={project.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold">
                <Link to={caseStudyPath} className="hover:underline">
                  {name}
                </Link>
              </h3>
              {subtitle && (
                <p className="mt-0.5 text-sm text-white/80">{subtitle}</p>
              )}
            </div>
            {project.startDate && (
              <span className="mt-1 shrink-0 whitespace-nowrap font-mono text-xs text-white/50">
                {formatDateRange(
                  project.startDate,
                  project.endDate ?? null,
                  locale,
                  t("projects.present"),
                )}
              </span>
            )}
          </div>
          <CollapsibleBullets
            text={pickLocalized(project.body, locale)}
            className="mt-3 space-y-2 text-sm text-white/80"
          />
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label="tags">
        {project.tags.map((tag) => (
          <li
            key={tag}
            className="inline-flex items-center gap-1.5 rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60"
          >
            <TechIcon name={tag} className="h-3.5 w-3.5" />
            {tag}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.website && (
          <ExternalLink
            href={project.website}
            className={actionClass}
            aria-label={`${name} ${t("projects.viewWebsite")}`}
          >
            <GlobeIcon size={14} />
            {t("projects.viewWebsite")}
          </ExternalLink>
        )}
        {project.repo && (
          <ExternalLink
            href={project.repo}
            className={actionClass}
            aria-label={`${name} ${t("projects.viewRepo")}`}
          >
            <GithubIcon size={14} />
            {t("projects.viewRepo")}
          </ExternalLink>
        )}
        <Link
          to={caseStudyPath}
          className={`${actionClass} uppercase`}
          aria-label={`${name} ${t("projects.viewCaseStudy")}`}
        >
          <CaseStudyIcon size={14} />
          {t("projects.viewCaseStudy")}
        </Link>
      </div>
    </article>
  );
}
