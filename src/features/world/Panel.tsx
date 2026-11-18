import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  certifications,
  educations,
  experiences,
  extracurriculars,
  projects,
  stack,
} from "@/content";
import {
  DownloadIcon,
  EntryLogo,
  ExternalLink,
  MapPinIcon,
} from "@/components";
import {
  FilmIcon,
  LayersIcon,
  PanelSkin,
  Portrait,
  Tabs,
} from "@/components/koi";
import { SITE_NAME } from "@/lib/site";
import { pickUrl } from "@/lib/localized";
import { formatDateRange, formatMonthYear, futureYear } from "@/lib/dates";
import { ContactLinks } from "@/features/contact";
import { EducationList } from "@/features/education-list";
import { ExperienceList } from "@/features/experience-list";
import { ProjectCard } from "@/features/project-list";
import { TechStack } from "@/features/tech-stack";
import { useLocale } from "@/hooks/useLocale";
import { track } from "@/lib/analytics";
import { staggerContainer } from "@/lib/motion";
import { focusRing } from "./chrome";
import { placeLabelKey, placeNameKey } from "./places";
import { prefersReducedMotion, type Layout } from "./useLayout";
import type { Place } from "./types";

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-4 mt-9 flex items-center gap-3 text-[12px] uppercase tracking-[0.12em] text-[var(--koi-ink-dim)] after:h-px after:flex-1 after:bg-[var(--koi-line)]">
      {children}
    </h3>
  );
}

function Stagger({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={false} animate="visible" variants={staggerContainer}>
      {children}
    </motion.div>
  );
}

interface Highlight {
  key: string;
  title: string;
  detail: string;
  note: string;
  logo?: string;
  href?: string;
}

function useHighlights(): Highlight[] {
  const { t } = useTranslation();
  const locale = useLocale();
  const out: Highlight[] = [];
  const school =
    educations.find((e) => e.slug === "concordia-university") ?? educations[0];
  if (school)
    out.push({
      key: school.slug,
      title: school.institution[locale],
      detail: t("world.studyField"),
      note: school.endDate
        ? futureYear(school.endDate)
          ? t("education.expected", {
              date: formatMonthYear(school.endDate, locale),
            })
          : formatMonthYear(school.endDate, locale)
        : "",
      logo: school.logo,
      href: school.institutionUrl && pickUrl(school.institutionUrl, locale),
    });
  const job = experiences.find((e) => e.slug === "centre-auto-allard-it");
  if (job)
    out.push({
      key: job.slug,
      title: job.company[locale],
      detail: job.role[locale],
      note: formatDateRange(
        job.startDate,
        job.endDate ?? null,
        locale,
        t("projects.present"),
      ),
      logo: job.logo,
      href: job.companyUrl && pickUrl(job.companyUrl, locale),
    });
  for (const [slug, noteKey, detailKey] of [
    ["mcgill-fiam-hackathon", "world.noteFinalist", "world.hackathonName"],
    ["stage", "world.noteInstalls", null],
  ] as const) {
    const project = projects.find((p) => p.slug === slug);
    if (project)
      out.push({
        key: project.slug,
        title: project.title[locale],
        detail: detailKey ? t(detailKey) : (project.subtitle?.[locale] ?? ""),
        note: t(noteKey),
        logo: project.icon,
        href: project.website && pickUrl(project.website, locale),
      });
  }
  return out;
}

function Highlights() {
  const { t } = useTranslation();
  const items = useHighlights();
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="koi-highlights">
      <h3
        id="koi-highlights"
        className="mb-3 text-[12px] uppercase tracking-[0.12em] text-[var(--koi-ink-dim)]"
      >
        {t("world.highlights")}
      </h3>
      <ul
        aria-labelledby="koi-highlights"
        className="grid auto-rows-fr grid-cols-2 gap-2.5"
      >
        {items.map((item) => (
          <li
            key={item.key}
            className="flex min-w-0 flex-col gap-2 rounded-[10px] border border-[var(--koi-line)] bg-[var(--koi-surface-2)] p-3"
          >
            <EntryLogo src={item.logo} />
            <p className="break-words text-[13px] font-semibold leading-snug text-[var(--koi-ink)]">
              {item.href ? (
                <ExternalLink
                  href={item.href}
                  className="koi-textlink hover:underline"
                >
                  {item.title}
                </ExternalLink>
              ) : (
                item.title
              )}
            </p>
            <p className="break-words text-[12px] leading-snug text-[var(--koi-ink-dim)]">
              {item.detail}
            </p>
            {item.note && (
              <p className="mt-auto break-words pt-1 text-[12px] font-medium leading-snug tabular-nums text-[var(--koi-ink)]">
                {item.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AboutContent() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [first, ...rest] = t("home.aboutBody").split("\n\n");
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Portrait
          alt={SITE_NAME}
          size={72}
          shape="round"
          tone="color"
          className="shrink-0"
        />
        <div className="min-w-0 space-y-2">
          <p className="inline-flex items-center gap-1.5 text-[13px] text-[var(--koi-ink-dim)]">
            <MapPinIcon size={15} />
            {t("home.location")}
          </p>
          {first && (
            <p className="text-[14px] leading-[1.8] text-[var(--koi-ink-dim)]">
              {first}
            </p>
          )}
        </div>
      </div>
      {rest.length > 0 && (
        <div className="space-y-3 text-[14px] leading-[1.8] text-[var(--koi-ink)]">
          {rest.map((paragraph, index) => (
            <p
              key={paragraph}
              className={
                index === rest.length - 1
                  ? "font-semibold"
                  : "text-[var(--koi-ink-dim)]"
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}
      <Highlights />
      <div className="flex flex-wrap items-center gap-3">
        <ContactLinks />
        <ExternalLink
          href={`/cv-${locale}.html`}
          onClick={() => track.resumeDownload()}
          className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--koi-radius-pill)] bg-[var(--koi-glow)] px-4 text-[13px] font-medium text-[var(--koi-on-glow)] transition-shadow hover:shadow-[var(--koi-halo-strong)] ${focusRing}`}
        >
          <DownloadIcon size={15} />
          {t("home.resume")}
        </ExternalLink>
      </div>
    </div>
  );
}

function ExperienceContent() {
  const { t } = useTranslation();
  return (
    <Stagger>
      <ExperienceList experiences={experiences} />
      {extracurriculars.length > 0 && (
        <>
          <SubHeading>{t("home.activities")}</SubHeading>
          <ExperienceList experiences={extracurriculars} showActions={false} />
        </>
      )}
      {certifications.length > 0 && (
        <>
          <SubHeading>{t("home.certifications")}</SubHeading>
          <ExperienceList experiences={certifications} showActions={false} />
        </>
      )}
    </Stagger>
  );
}

function EducationContent() {
  return (
    <Stagger>
      <EducationList educations={educations} />
    </Stagger>
  );
}

const SLIDE_DEBOUNCE_MS = 220;

function ProjectsList({
  onCurrent,
  picture,
}: {
  onCurrent?: (slug: string | null) => void;
  picture: "top" | "end";
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !onCurrent) return;
    const scroller = list.closest<HTMLElement>(".koi-panel__body");
    const ratios = new Map<string, number>();
    const slugOf = (target: EventTarget | null) =>
      (target as Element | null)
        ?.closest?.('[id^="project-"]')
        ?.id.replace(/^project-/, "") ?? null;
    let pinned: string | null = null;
    let last: string | null | undefined;
    let timer = 0;
    const emit = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        let best = pinned;
        if (!best) {
          let top = 0;
          ratios.forEach((ratio, slug) => {
            if (ratio > top) {
              top = ratio;
              best = slug;
            }
          });
        }
        if (best !== last) {
          last = best;
          onCurrent(best);
        }
      }, SLIDE_DEBOUNCE_MS);
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                const slug = slugOf(entry.target);
                if (slug) ratios.set(slug, entry.intersectionRatio || 0);
              }
              emit();
            },
            { root: scroller, threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
          );
    list
      .querySelectorAll<HTMLElement>('[id^="project-"]')
      .forEach((card) => observer?.observe(card));
    const onOver = (event: Event) => {
      pinned = slugOf(event.target);
      emit();
    };
    const onLeave = () => {
      pinned = null;
      emit();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!list.contains(event.relatedTarget as Node | null)) onLeave();
    };
    list.addEventListener("pointerover", onOver);
    list.addEventListener("pointerleave", onLeave);
    list.addEventListener("focusin", onOver);
    list.addEventListener("focusout", onFocusOut);
    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
      list.removeEventListener("pointerover", onOver);
      list.removeEventListener("pointerleave", onLeave);
      list.removeEventListener("focusin", onOver);
      list.removeEventListener("focusout", onFocusOut);
      onCurrent(null);
    };
  }, [onCurrent]);

  return (
    <Stagger>
      <div ref={listRef} className="grid gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} picture={picture} />
        ))}
      </div>
    </Stagger>
  );
}

function ProjectsContent({
  tab,
  onCurrent,
  picture = "top",
}: {
  tab: "projects" | "skills";
  onCurrent?: (slug: string | null) => void;
  picture?: "top" | "end";
}) {
  const { t } = useTranslation();
  if (tab === "skills") {
    return (
      <Stagger>
        <TechStack groups={stack} />
      </Stagger>
    );
  }
  return projects.length === 0 ? (
    <p className="text-[var(--koi-ink-dim)]">{t("projects.empty")}</p>
  ) : (
    <ProjectsList onCurrent={onCurrent} picture={picture} />
  );
}

type CloseReason = "button" | "drag";

const MATERIAL: Record<Place, "paper" | "ink" | "water"> = {
  about: "paper",
  experience: "paper",
  projects: "paper",
  education: "paper",
};

export interface PanelProps {
  place: Place;
  layout: Layout;
  onClose: (reason: CloseReason) => void;
  onSlide?: (slug: string | null) => void;
  onCover?: (px: number) => void;
}

const SHEET_BOTTOM = 87;

const KOI_EASE = [0.22, 0.61, 0.36, 1] as const;
const PANEL_ENTER = { duration: 0.35, ease: KOI_EASE };
const PANEL_EXIT = { duration: 0.25, ease: KOI_EASE };
const SHEET_REST = 0.56;
const SHEET_FULL = 0.86;
const SHEET_GAP = 12;
const SHEET_TOP = 72;

export const Panel = forwardRef<HTMLHeadingElement, PanelProps>(function Panel(
  { place, layout, onClose, onSlide, onCover },
  headingRef,
) {
  const { t } = useTranslation();
  const id = useId();
  const headingId = `${id}-title`;
  const [tab, setTab] = useState<"projects" | "skills">("projects");
  const [switched, setSwitched] = useState(false);
  const chooseTab = (next: "projects" | "skills") => {
    setSwitched(true);
    setTab(next);
  };
  const tabIn = switched ? "koi-tabpanel-in" : undefined;

  const sheet = layout === "narrow";
  const [expanded, setExpanded] = useState(false);
  const [canGrow, setCanGrow] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef(-1);
  const coverCb = useRef(onCover);
  useEffect(() => {
    coverCb.current = onCover;
  }, [onCover]);

  useEffect(() => {
    const body =
      sectionRef.current?.querySelector<HTMLElement>(".koi-panel__body");
    if (!body) return;
    body.tabIndex = 0;
    body.setAttribute("aria-label", t("world.scrollable"));
  }, [t]);

  useEffect(() => {
    if (!sheet) setExpanded(false);
  }, [sheet]);

  useEffect(() => {
    const content = contentRef.current;
    const skin = sectionRef.current?.querySelector<HTMLElement>(".koi-panel");
    const body =
      sectionRef.current?.querySelector<HTMLElement>(".koi-panel__body");
    if (!sheet || !content || !skin || !body) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const more = body.scrollHeight - body.scrollTop - body.clientHeight > 2;
        if (more !== body.hasAttribute("data-more"))
          body.toggleAttribute("data-more", more);
        const cs = getComputedStyle(body);
        const head =
          body.getBoundingClientRect().top - skin.getBoundingClientRect().top;
        const natural =
          head +
          content.offsetHeight +
          parseFloat(cs.paddingTop) +
          parseFloat(cs.paddingBottom) +
          parseFloat(cs.marginBottom || "0") +
          2;
        const h = window.innerHeight;
        const cap = Math.min(h * SHEET_REST, h - SHEET_BOTTOM - SHEET_GAP);
        setCanGrow(natural > cap + 8);
        const px = Math.round(Math.min(natural, cap)) + SHEET_BOTTOM;
        if (Math.abs(px - coverRef.current) < 2) return;
        coverRef.current = px;
        coverCb.current?.(px);
      });
    };
    measure();
    const onScroll = () => {
      const more = body.scrollHeight - body.scrollTop - body.clientHeight > 2;
      if (more !== body.hasAttribute("data-more"))
        body.toggleAttribute("data-more", more);
    };
    body.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(content);
    observer?.observe(body);
    return () => {
      cancelAnimationFrame(raf);
      body.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [sheet]);

  useEffect(() => {
    const body =
      sectionRef.current?.querySelector<HTMLElement>(".koi-panel__body");
    if (body) body.scrollTop = 0;
  }, [tab]);

  const restCap = `min(${SHEET_REST * 100}dvh, calc(100dvh - ${SHEET_BOTTOM + SHEET_GAP}px))`;
  const sheetStyle = sheet
    ? {
        maxHeight: expanded
          ? `min(${SHEET_FULL * 100}dvh, calc(100dvh - ${SHEET_BOTTOM + SHEET_TOP}px))`
          : restCap,
        transition: prefersReducedMotion()
          ? undefined
          : "max-height var(--koi-dur) var(--koi-ease)",
      }
    : undefined;

  const frame =
    layout === "wide"
      ? "absolute inset-y-[81px] right-[4.5%] z-[6] flex w-[43%] max-w-[560px] items-center pointer-events-none"
      : layout === "short"
        ? "absolute bottom-3 right-3 top-[64px] z-[9] flex w-[43%] min-w-[280px] max-w-[560px] pointer-events-none"
        : "absolute inset-x-4 bottom-[87px] z-[9] flex items-end pointer-events-none [overflow-y:clip] [overflow-x:visible] max-[440px]:inset-x-3";

  const motionProps = sheet
    ? {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 12, transition: PANEL_EXIT },
      }
    : {
        initial: { opacity: 0, x: 22 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 22, transition: PANEL_EXIT },
      };

  const tabs =
    place === "projects" ? (
      <Tabs
        idBase={id}
        label={t("world.panelTabs")}
        active={tab}
        onChange={chooseTab}
        items={[
          {
            id: "projects",
            label: t("home.projects"),
            icon: <FilmIcon size={13} />,
          },
          {
            id: "skills",
            label: t("world.skills"),
            icon: <LayersIcon size={13} />,
          },
        ]}
      />
    ) : undefined;

  return (
    <div className={frame}>
      <motion.div
        ref={sectionRef}
        data-panel={place}
        data-layout={layout}
        {...motionProps}
        transition={PANEL_ENTER}
        className={`pointer-events-auto relative flex w-full flex-col ${
          layout === "wide"
            ? place === "projects"
              ? "h-full"
              : "max-h-full"
            : layout === "short"
              ? "h-full"
              : ""
        }`}
      >
        <div
          data-sheet={sheet || undefined}
          data-expanded={(sheet && expanded) || undefined}
          style={sheetStyle}
          className={`relative flex w-full flex-col ${
            layout === "wide"
              ? place === "projects"
                ? "h-full min-h-0"
                : "max-h-full min-h-0"
              : layout === "short"
                ? "h-full"
                : ""
          }`}
        >
          <PanelSkin
            role="region"
            material={MATERIAL[place]}
            label={t(placeNameKey[place])}
            title={t(placeLabelKey[place])}
            titleId={headingId}
            titleRef={headingRef}
            here={layout === "wide"}
            onClose={() => onClose("button")}
            closeLabel={t("world.close")}
            tabs={tabs}
            tabsBeside={layout !== "wide"}
            className={`min-h-0 w-full flex-1 [font-family:var(--koi-font-body)] max-[759px]:px-5 [@media(max-height:500px)_and_(orientation:landscape)]:pt-4 ${
              sheet ? "pt-4" : layout === "short" ? "h-full" : ""
            }`}
          >
            <div ref={contentRef}>
              {place === "about" && <AboutContent />}
              {place === "experience" && <ExperienceContent />}
              {place === "projects" && (
                <div
                  role="tabpanel"
                  id={`${id}-tabpanel`}
                  aria-labelledby={`${id}-tab-${tab}`}
                >
                  <div hidden={tab !== "projects"} className={tabIn}>
                    <ProjectsContent
                      tab="projects"
                      onCurrent={onSlide}
                      picture={layout === "wide" ? "top" : "end"}
                    />
                  </div>
                  <div hidden={tab !== "skills"} className={tabIn}>
                    <ProjectsContent tab="skills" />
                  </div>
                </div>
              )}
              {place === "education" && <EducationContent />}
            </div>
          </PanelSkin>
          {sheet && (canGrow || expanded) && (
            <button
              type="button"
              data-sheet-grow
              onClick={() => setExpanded((v) => !v)}
              aria-label={t("world.resize")}
              aria-expanded={expanded}
              className={`absolute right-[58px] top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full text-[var(--koi-ink-dim)] transition-colors hover:text-[var(--koi-ink)] ${focusRing}`}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-[var(--koi-dur)] ${expanded ? "rotate-180" : ""}`}
              >
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
});
