import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Project } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { formatDateRange } from "@/lib/dates";
import { pickLocalized, pickUrl } from "@/lib/localized";
import { track } from "@/lib/analytics";
import { buttonHover, staggerItem, tagHover } from "@/lib/motion";
import { useCardHover } from "@/hooks/useCardHover";
import { PictureViewer } from "./PictureViewer";
import {
  CollapsibleBullets,
  EntryLogo,
  ExternalLink,
  GithubIcon,
  GlobeIcon,
  TechIcon,
} from "@/components";

export interface ProjectCardProps {
  project: Project;
  picture?: "top" | "end";
}

export const actionClass =
  "inline-flex items-center gap-1.5 rounded-md border border-koi-line bg-koi-surface px-3 py-1.5 font-mono text-xs text-koi-ink-dim transition-colors hover:border-koi-line-strong hover:text-koi-ink max-sm:gap-1 max-sm:px-2 max-sm:[&>svg]:h-[12px] max-sm:[&>svg]:w-[12px]";

export function ProjectCard({ project, picture = "top" }: ProjectCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const name = pickLocalized(project.title, locale);
  const subtitle = project.subtitle
    ? pickLocalized(project.subtitle, locale)
    : "";
  const bar = subtitle.indexOf(" | ");
  const subtitleLead = bar > 0 ? subtitle.slice(0, bar) : "";
  const subtitleMain = bar > 0 ? subtitle.slice(bar + 3) : subtitle;
  const card = useCardHover<HTMLElement>();
  const [viewing, setViewing] = useState(false);
  const pictureRef = useRef<HTMLButtonElement>(null);
  const wasViewing = useRef(false);

  useEffect(() => {
    if (viewing) {
      wasViewing.current = true;
      return;
    }
    if (!wasViewing.current) return;
    wasViewing.current = false;
    pictureRef.current?.focus({ preventScroll: true });
  }, [viewing]);

  const frame = project.image ? (
    <button
      ref={pictureRef}
      type="button"
      className={`koi-card-picture group/picture relative block w-full cursor-zoom-in overflow-hidden rounded-koi-card bg-koi-surface-2 p-0 text-left ${
        picture === "end" ? "mt-4" : "mb-4"
      }`}
      aria-label={t("projects.openPicture", { name })}
      aria-haspopup="dialog"
      onClick={() => setViewing(true)}
    >
      <img
        src={project.image}
        alt={name}
        width={960}
        height={600}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />
      <span
        aria-hidden="true"
        className="koi-card-picture__hint pointer-events-none absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-koi-veil text-koi-ink opacity-0 transition-opacity duration-[var(--koi-dur)] ease-koi group-hover/picture:opacity-100 group-focus-visible/picture:opacity-100"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
        </svg>
      </span>
    </button>
  ) : null;

  return (
    <motion.article
      ref={card.ref}
      {...card.handlers}
      id={`project-${project.slug}`}
      className="group relative min-w-0 scroll-mt-2 rounded-lg border border-koi-line bg-koi-surface p-5 transition-colors duration-[var(--koi-dur)] hover:border-koi-line-strong hover:bg-koi-surface-2"
      variants={staggerItem}
    >
      {card.glow}
      {picture === "top" && frame}
      {project.image && (
        <PictureViewer
          src={project.image}
          alt={name}
          open={viewing}
          onClose={() => setViewing(false)}
        />
      )}
      <div className="flex items-start gap-3">
        <EntryLogo src={project.icon} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{name}</h3>
          {subtitle && (
            <p className="mt-0.5 text-sm text-koi-ink-dim">
              {subtitleLead && (
                <>
                  <span className="inline-block">{subtitleLead} |</span>{" "}
                </>
              )}
              <span
                className={
                  subtitleLead ? "inline-block [text-wrap:balance]" : undefined
                }
              >
                {project.subtitleUrl ? (
                  <ExternalLink
                    href={pickUrl(project.subtitleUrl, locale)}
                    className="koi-textlink hover:underline"
                  >
                    {subtitleMain}
                  </ExternalLink>
                ) : (
                  subtitleMain
                )}
              </span>
            </p>
          )}
          {project.startDate && (
            <p className="mt-1 font-mono text-xs text-koi-ink-faint">
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
          className="mt-3 space-y-2 text-sm text-koi-ink-dim"
        />

        {picture === "end" && frame}

        <ul className="mt-3 flex flex-wrap gap-2" aria-label="tags">
          {project.tags.map((tag) => (
            <motion.li
              key={tag}
              className="inline-flex items-center gap-1.5 rounded bg-koi-surface-2 px-2 py-0.5 font-mono text-xs text-koi-ink-faint transition-colors hover:bg-koi-surface-2 hover:text-koi-ink"
              whileHover={tagHover}
            >
              <TechIcon name={tag} className="h-3.5 w-3.5" />
              {tag}
            </motion.li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2 max-sm:gap-1 max-sm:[&>*]:flex-auto max-sm:[&>*]:justify-center">
          {project.website && (
            <ExternalLink
              href={pickUrl(project.website, locale)}
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
        </div>
      </div>
    </motion.article>
  );
}
