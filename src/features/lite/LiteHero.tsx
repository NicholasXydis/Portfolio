import { preload } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  DownloadIcon,
  ExternalLink,
  HeroPhoto,
  MapPinIcon,
} from "@/components";
import { ContactLinks } from "@/features/contact";
import { useLocale } from "@/hooks/useLocale";
import { track } from "@/lib/analytics";
import { SITE_NAME } from "@/lib/site";
import { WorldPill } from "./WorldPill";

export function LiteHero() {
  const { t } = useTranslation();
  const locale = useLocale();
  const paragraphs = t("home.aboutBody").split("\n\n");
  preload("/portrait.webp", {
    as: "image",
    type: "image/webp",
    fetchPriority: "high",
  });

  return (
    <section
      id="about"
      aria-label={t("home.about")}
      className="lite-hero"
      tabIndex={-1}
    >
      <div className="lite-hero-text">
        <p className="lite-kicker">
          <ExternalLink
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t("home.location"))}`}
            aria-label={t("home.viewOnMap")}
            className="lite-kicker-link"
          >
            <MapPinIcon size={14} />
            {t("home.location")}
          </ExternalLink>
        </p>
        <h1 className="lite-h1">{SITE_NAME}</h1>
        <div className="lite-lede">
          {paragraphs.map((paragraph, index) => (
            <p
              key={paragraph}
              className={
                index === paragraphs.length - 1 ? "lite-lede-strong" : undefined
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
        <div className="lite-hero-actions">
          <ContactLinks />
          <ExternalLink
            href={`/cv-${locale}.html`}
            onClick={() => track.resumeDownload()}
            className="lite-cv-pill"
          >
            <DownloadIcon size={16} />
            {t("home.resume")}
          </ExternalLink>
          <WorldPill className="lite-world-pill--hero" short />
        </div>
      </div>
      <div className="lite-hero-art">
        <HeroPhoto />
      </div>
    </section>
  );
}
