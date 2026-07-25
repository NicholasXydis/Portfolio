import { Link } from "react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Project } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { formatDateRange } from "@/lib/dates";
import { localizedPath, pickLocalized } from "@/lib/localized";
import { track } from "@/lib/analytics";
import {
  buttonHover,
  duration,
  ease,
  staggerItem,
  tagHover,
  tapPress,
} from "@/lib/motion";
import { useCardHover } from "@/hooks/useCardHover";
import {
  CaseStudyIcon,
  CollapsibleBullets,
  EntryLogo,
  ExternalLink,
  GithubIcon,
  GlobeIcon,
  MotionLink,
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
  const card = useCardHover<HTMLElement>();

  return (
    <motion.article
      ref={card.ref}
      {...card.handlers}
      id={`project-${project.slug}`}
      className="relative min-w-0 scroll-mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-5 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.05]"
      variants={staggerItem}
      whileHover={{
        boxShadow:
          "0 24px 60px -30px rgba(0,0,0,0.95), 0 0 40px -14px rgba(255,255,255,0.1)",
        transition: { duration: duration.base, ease },
      }}
    >
      {card.glow}
      <div className="flex items-start gap-3">
        <EntryLogo src={project.icon} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">
            <Link to={caseStudyPath} className="hover:underline">
              {name}
            </Link>
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-white/80">{subtitle}</p>
          )}
          {project.startDate && (
            <p className="mt-1 font-mono text-xs text-white/50">
              {formatDateRange(
                project.startDate,
                project.endDate ?? null,
                locale,
                t("projects.present"),
              )}
            </p>
          )}
        </div>
      </div>

      <div>
        <CollapsibleBullets
          text={pickLocalized(project.body, locale)}
          className="mt-3 space-y-2 text-sm text-white/80"
        />

        <ul className="mt-3 flex flex-wrap gap-2" aria-label="tags">
          {project.tags.map((tag) => (
            <motion.li
              key={tag}
              className="inline-flex items-center gap-1.5 rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
              whileHover={tagHover}
              whileTap={tapPress}
            >
              <TechIcon name={tag} className="h-3.5 w-3.5" />
              {tag}
            </motion.li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.website && (
            <ExternalLink
              href={project.website}
              className={actionClass}
              aria-label={`${name} ${t("projects.viewWebsite")}`}
              onClick={() => track.projectLink(project.slug, "website", "card")}
              whileHover={buttonHover}
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
              onClick={() => track.projectLink(project.slug, "repo", "card")}
              whileHover={buttonHover}
            >
              <GithubIcon size={14} />
              {t("projects.viewRepo")}
            </ExternalLink>
          )}
          <MotionLink
            to={caseStudyPath}
            className={actionClass}
            aria-label={`${name} ${t("projects.viewCaseStudy")}`}
            onClick={() =>
              track.projectLink(project.slug, "case_study", "card")
            }
            whileHover={buttonHover}
            whileTap={tapPress}
          >
            <CaseStudyIcon size={14} />
            {t("projects.viewCaseStudy")}
          </MotionLink>
        </div>
      </div>
    </motion.article>
  );
}
