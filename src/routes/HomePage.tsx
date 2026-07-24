import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { educations, experiences, projects, stack } from "@/content";
import {
  DownloadIcon,
  ExternalLink,
  HeroPhoto,
  MapPinIcon,
  RevealText,
  Section,
  Seo,
} from "@/components";
import { ProjectCard } from "@/features/project-list";
import { ExperienceList } from "@/features/experience-list";
import { EducationList } from "@/features/education-list";
import { TechStack } from "@/features/tech-stack";
import { ContactLinks } from "@/features/contact";
import { track } from "@/lib/analytics";
import {
  buttonHover,
  pageContainer,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";

export function HomePage() {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const aboutParagraphs = t("home.aboutBody").split("\n\n");
  const playIntro = !hash;

  return (
    <motion.div
      className="space-y-16 pt-8"
      variants={pageContainer}
      initial={playIntro ? "hidden" : false}
      animate="visible"
    >
      <Seo
        title={t("meta.home.title")}
        description={t("meta.home.description")}
        path=""
      />

      <motion.header
        variants={staggerItem}
        className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8"
      >
        <p className="sr-only">{t("home.about")}</p>
        <HeroPhoto />
        <motion.div variants={staggerContainer}>
          <h1 className="text-4xl font-bold" aria-label="Nicholas Xydis">
            <RevealText text="Nicholas Xydis" delay={0.1} />
          </h1>
          <motion.div
            variants={staggerItem}
            className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3"
          >
            <ExternalLink
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t("home.location"))}`}
              aria-label={t("home.viewOnMap")}
              className="inline-flex w-fit items-center gap-1.5 font-mono text-sm text-white/60 underline decoration-white/20 decoration-dotted underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
            >
              <MapPinIcon size={16} />
              {t("home.location")}
            </ExternalLink>
            <ContactLinks />
          </motion.div>
          <motion.div
            variants={staggerItem}
            className="mt-4 max-w-prose space-y-3 text-sm text-white/80"
          >
            {aboutParagraphs.map((paragraph, index) => (
              <p
                key={paragraph}
                className={
                  index === aboutParagraphs.length - 1
                    ? "font-semibold text-white"
                    : undefined
                }
              >
                {paragraph}
              </p>
            ))}
          </motion.div>
          <ExternalLink
            href="/resume.pdf"
            variants={staggerItem}
            whileHover={buttonHover}
            onClick={() => track.resumeDownload()}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-mono text-sm font-medium text-black transition-colors hover:bg-white/85"
          >
            <DownloadIcon size={16} />
            {t("home.resume")}
          </ExternalLink>
        </motion.div>
      </motion.header>

      {experiences.length > 0 && (
        <Section id="experiences" title={t("home.experiences")}>
          <ExperienceList experiences={experiences} />
        </Section>
      )}

      {educations.length > 0 && (
        <Section id="education" title={t("home.education")}>
          <EducationList educations={educations} />
        </Section>
      )}

      <Section id="projects" title={t("home.projects")}>
        {projects.length === 0 ? (
          <p className="text-white/60">{t("projects.empty")}</p>
        ) : (
          <motion.div className="grid gap-4" variants={staggerContainer}>
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </motion.div>
        )}
      </Section>

      {stack.length > 0 && (
        <Section id="stack" title={t("home.stack")}>
          <TechStack groups={stack} />
        </Section>
      )}
    </motion.div>
  );
}
