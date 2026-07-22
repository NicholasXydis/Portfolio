import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getProjectBySlug } from "@/content";
import { useLocale } from "@/hooks/useLocale";
import { formatDateRange } from "@/lib/dates";
import { localizedPath, pickLocalized } from "@/lib/localized";
import {
  ArrowLeftIcon,
  ExternalLink,
  GithubIcon,
  GlobeIcon,
  Seo,
  TechIcon,
} from "@/components";
import { actionClass } from "@/features/project-list";
import { NotFoundPage } from "./NotFoundPage";

export function ProjectDetailPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const locale = useLocale();
  const project = slug ? getProjectBySlug(slug) : undefined;

  if (!project) {
    return <NotFoundPage />;
  }

  const name = pickLocalized(project.title, locale);
  const subtitle = project.subtitle
    ? pickLocalized(project.subtitle, locale)
    : "";
  const metaTitle = subtitle ? `${name} | ${subtitle}` : name;

  return (
    <article className="pt-8">
      <Seo
        title={metaTitle}
        description={pickLocalized(project.summary, locale)}
        path={`projects/${project.slug}`}
      />
      <Link
        to={localizedPath(locale)}
        className="inline-flex items-center gap-1.5 font-mono text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeftIcon size={16} />
        {t("nav.home")}
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{name}</h1>
      {subtitle && <p className="mt-2 text-lg text-white/70">{subtitle}</p>}

      {project.startDate && (
        <p className="mt-2 font-mono text-xs text-white/50">
          {formatDateRange(
            project.startDate,
            project.endDate ?? null,
            locale,
            t("projects.present"),
          )}
        </p>
      )}

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="tags">
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

      {project.images[0] && (
        <img
          src={project.images[0].src}
          alt={pickLocalized(project.images[0].alt, locale)}
          width={project.images[0].width}
          height={project.images[0].height}
          className="mt-6 w-full rounded-lg border border-white/10"
        />
      )}

      <p className="mt-6 text-lg text-white/80">
        {pickLocalized(project.summary, locale)}
      </p>

      {project.caseStudy && (
        <div className="mt-6 max-w-prose space-y-4 leading-relaxed text-white/80">
          {pickLocalized(project.caseStudy, locale)
            .split("\n\n")
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
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
        {project.links.map((link) => (
          <ExternalLink
            key={link.href}
            href={link.href}
            className={actionClass}
          >
            {pickLocalized(link.label, locale)} ↗
          </ExternalLink>
        ))}
      </div>
    </article>
  );
}
