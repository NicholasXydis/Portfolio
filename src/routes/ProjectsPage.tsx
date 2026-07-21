import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { projects } from "@/content";
import { ArrowLeftIcon, Seo } from "@/components";
import { useLocale } from "@/hooks/useLocale";
import { localizedPath } from "@/lib/localized";
import { ProjectCard } from "@/features/project-list";

export function ProjectsPage() {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <div className="pt-8">
      <Seo
        title={t("meta.projects.title")}
        description={t("meta.projects.description")}
        path="projects"
      />
      <Link
        to={localizedPath(locale)}
        className="inline-flex items-center gap-1.5 font-mono text-sm text-white/60 transition-colors hover:text-white"
      >
        <ArrowLeftIcon size={16} />
        {t("nav.home")}
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-bold">{t("projects.title")}</h1>
      {projects.length === 0 ? (
        <p className="text-white/60">{t("projects.empty")}</p>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
