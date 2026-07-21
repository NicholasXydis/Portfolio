import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getProjectBySlug } from "@/content";
import { useLocale } from "@/hooks/useLocale";
import { localizedPath, pickLocalized } from "@/lib/localized";
import {
  ArrowLeftIcon,
  BulletList,
  ExternalLink,
  GithubIcon,
  GlobeIcon,
  Seo,
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
  const metaTitle = subtitle ? `${name} — ${subtitle}` : name;

  return (
    <article className="pt-8">
      <Seo
        title={metaTitle}
        description={pickLocalized(project.summary, locale)}
        path={`projects/${project.slug}`}
      />
      <Link
        to={localizedPath(locale, "projects")}
        className="inline-flex items-center gap-1.5 font-mono text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeftIcon size={16} />
        {t("nav.caseStudies")}
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{name}</h1>
      {subtitle && <p className="mt-2 text-lg text-white/70">{subtitle}</p>}

      <p className="mt-2 font-mono text-xs text-white/50">
        {t("projects.lastUpdated")}:{" "}
        <time dateTime={project.lastUpdated}>{project.lastUpdated}</time>
      </p>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="tags">
        {project.tags.map((tag) => (
          <li
            key={tag}
            className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-white/60"
          >
            {tag}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-lg text-white/80">
        {pickLocalized(project.summary, locale)}
      </p>

      <BulletList
        text={pickLocalized(project.body, locale)}
        className="mt-6 max-w-prose space-y-3 leading-relaxed text-white/80"
      />

      <div className="mt-8 flex flex-wrap gap-2">
        {project.website && (
          <ExternalLink href={project.website} className={actionClass}>
            <GlobeIcon size={14} />
            {t("projects.viewWebsite")}
          </ExternalLink>
        )}
        {project.repo && (
          <ExternalLink href={project.repo} className={actionClass}>
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
