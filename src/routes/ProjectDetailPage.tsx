import { useParams } from "react-router";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { getProjectBySlug } from "@/content";
import { useLocale } from "@/hooks/useLocale";
import { formatDateRange } from "@/lib/dates";
import { localizedPath, pickLocalized } from "@/lib/localized";
import { track } from "@/lib/analytics";
import {
  buttonHover,
  pageContainerFast,
  staggerItem,
  tagHover,
  tapPress,
} from "@/lib/motion";
import {
  ArrowLeftIcon,
  ExternalLink,
  GithubIcon,
  GlobeIcon,
  MotionLink,
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
    <motion.article
      className="pt-8"
      variants={pageContainerFast}
      initial="hidden"
      animate="visible"
    >
      <Seo
        title={metaTitle}
        description={pickLocalized(project.summary, locale)}
        path={`projects/${project.slug}`}
      />
      <MotionLink
        to={`${localizedPath(locale)}#project-${project.slug}`}
        className="inline-flex h-[38px] items-center gap-2 rounded-md border border-white/20 bg-white/[0.06] px-3.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors hover:bg-white/10"
        aria-label={t("nav.home")}
        variants={staggerItem}
        whileHover={buttonHover}
        whileTap={tapPress}
      >
        <ArrowLeftIcon size={16} />
        {t("nav.home")}
      </MotionLink>
      <motion.h1 variants={staggerItem} className="mt-4 text-3xl font-bold">
        {name}
      </motion.h1>
      {subtitle && (
        <motion.p variants={staggerItem} className="mt-2 text-lg text-white/70">
          {subtitle}
        </motion.p>
      )}

      {project.startDate && (
        <motion.p
          variants={staggerItem}
          className="mt-2 font-mono text-xs text-white/50"
        >
          {formatDateRange(
            project.startDate,
            project.endDate ?? null,
            locale,
            t("projects.present"),
          )}
        </motion.p>
      )}

      <motion.ul
        variants={staggerItem}
        className="mt-4 flex flex-wrap gap-2"
        aria-label="tags"
      >
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
      </motion.ul>

      {project.images[0] && (
        <motion.img
          variants={staggerItem}
          src={project.images[0].src}
          alt={pickLocalized(project.images[0].alt, locale)}
          width={project.images[0].width}
          height={project.images[0].height}
          className="mt-6 w-full rounded-lg border border-white/10"
        />
      )}

      {!project.caseStudy && (
        <motion.p variants={staggerItem} className="mt-6 text-lg text-white/80">
          {pickLocalized(project.summary, locale)}
        </motion.p>
      )}

      {project.caseStudy && (
        <motion.div
          variants={staggerItem}
          className="mt-6 max-w-prose space-y-4 leading-relaxed text-white/80"
        >
          {pickLocalized(project.caseStudy, locale)
            .split("\n\n")
            .map((paragraph, index) => {
              const match = paragraph.match(/^([^:]{1,40}:)(\s*)([\s\S]*)$/);
              return (
                <p key={index}>
                  {match ? (
                    <>
                      <strong className="text-lg text-white">{match[1]}</strong>
                      {match[2]}
                      {match[3]}
                    </>
                  ) : (
                    paragraph
                  )}
                </p>
              );
            })}
        </motion.div>
      )}

      <motion.div variants={staggerItem} className="mt-8 flex flex-wrap gap-2">
        {project.website && (
          <ExternalLink
            href={project.website}
            className={actionClass}
            aria-label={`${name} ${t("projects.viewWebsite")}`}
            onClick={() => track.projectLink(project.slug, "website", "detail")}
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
            onClick={() => track.projectLink(project.slug, "repo", "detail")}
            whileHover={buttonHover}
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
            whileHover={buttonHover}
          >
            {pickLocalized(link.label, locale)} ↗
          </ExternalLink>
        ))}
      </motion.div>
    </motion.article>
  );
}
