import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  certifications,
  educations,
  experiences,
  extracurriculars,
  projects,
  stack,
} from "@/content";
import { Seo, SkipToContent } from "@/components";
import { ProjectCard } from "@/features/project-list";
import { ExperienceList } from "@/features/experience-list";
import { EducationList } from "@/features/education-list";
import { TechStack } from "@/features/tech-stack";
import {
  LITE_SECTION_IDS,
  LiteHeader,
  SIDEWAYS_QUERY,
  headerTuck,
  LiteHero,
  LiteSection,
  LiteSubheading,
  prefersReducedMotion,
  revealWithin,
  useActiveSection,
  useKeepPlace,
  useReveal,
  type LiteSectionId,
  type NavClick,
} from "@/features/lite";
import { useLocale } from "@/hooks/useLocale";
import { SITE_NAME } from "@/lib/site";
import { pageCopy } from "@/lib/meta";
import "@/features/lite/lite.css";

export function LitePage({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [searchParams] = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const { active, lockTo } = useActiveSection(LITE_SECTION_IDS, "about");

  useReveal(rootRef);
  useKeepPlace(locale, active);

  useEffect(() => {
    const root = rootRef.current;
    const header = root?.querySelector<HTMLElement>(":scope > header");
    if (!root || !header) return;
    const sideways = window.matchMedia?.(SIDEWAYS_QUERY);
    const apply = () => {
      const nav = header.querySelector<HTMLElement>(".koi-header__nav");
      const brand = header.querySelector<HTMLElement>(".koi-header__brand");
      const tuck = headerTuck(
        nav?.offsetTop ?? 0,
        brand?.offsetTop ?? 0,
        sideways?.matches === true,
      );
      root.style.setProperty("--lite-tuck", `${tuck}px`);
      root.style.setProperty(
        "--lite-header-h",
        `${header.offsetHeight - tuck}px`,
      );
    };
    apply();
    sideways?.addEventListener?.("change", apply);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    observer?.observe(header);
    return () => {
      observer?.disconnect();
      sideways?.removeEventListener?.("change", apply);
    };
  }, []);

  const projectParam = searchParams.get("project");
  useEffect(() => {
    if (!projectParam) return;
    const card = document.getElementById(`project-${projectParam}`);
    if (!card) return;
    revealWithin(card, true);
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() =>
          card.scrollIntoView({ block: "start", behavior: "instant" }),
        );
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [projectParam]);

  const navigate = useCallback(
    (id: LiteSectionId, event: NavClick) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      revealWithin(target);
      lockTo(id);
      target.scrollIntoView({
        block: "start",
        behavior: prefersReducedMotion() ? "instant" : "smooth",
      });
      const { pathname, search } = window.location;
      window.history.replaceState(
        window.history.state,
        "",
        `${pathname}${search}#${id}`,
      );
      target.focus({ preventScroll: true });
    },
    [lockTo],
  );

  const year = new Date().getFullYear();

  return (
    <div ref={rootRef} className="koi-lite">
      {!embedded && <Seo {...pageCopy("lite", locale)} path="lite" />}
      <SkipToContent />
      <LiteHeader active={active} onNavigate={navigate} />

      <main id="main-content" className="lite-page" tabIndex={-1}>
        <LiteHero />

        <LiteSection id="education" title={t("home.education")}>
          <div className="lite-rows">
            <EducationList educations={educations} />
          </div>
        </LiteSection>

        <LiteSection id="experience" title={t("home.experiences")}>
          <div className="lite-rows">
            <ExperienceList experiences={experiences} />
          </div>
        </LiteSection>

        <LiteSection id="projects" title={t("home.projects")}>
          {projects.length === 0 ? (
            <p className="lite-empty">{t("projects.empty")}</p>
          ) : (
            <div className="lite-projects lite-stagger">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          )}
        </LiteSection>

        <LiteSection id="activities" title={t("lite.activitiesTitle")}>
          <div className="lite-rows">
            <ExperienceList
              experiences={extracurriculars}
              showActions={false}
            />
          </div>
          {certifications.length > 0 && (
            <div
              className="lite-group"
              role="group"
              aria-labelledby="certifications-heading"
            >
              <LiteSubheading id="certifications-heading">
                {t("home.certifications")}
              </LiteSubheading>
              <div className="lite-rows">
                <ExperienceList
                  experiences={certifications}
                  showActions={false}
                />
              </div>
            </div>
          )}
        </LiteSection>

        <LiteSection id="skills" title={t("home.stack")}>
          <div className="lite-skills lite-stagger">
            <TechStack groups={stack} />
          </div>
        </LiteSection>
      </main>

      <footer className="lite-page lite-footer">
        <p>
          © {year} {SITE_NAME}
        </p>
      </footer>
    </div>
  );
}
