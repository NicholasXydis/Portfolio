import { useTranslation } from "react-i18next";
import type { Education } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { formatDateRange } from "@/lib/dates";
import { pickLocalized } from "@/lib/localized";
import { EntryLogo, ExternalLink } from "@/components";

export interface EducationListProps {
  educations: Education[];
}

export function EducationList({ educations }: EducationListProps) {
  const { t } = useTranslation();
  const locale = useLocale();

  if (educations.length === 0) {
    return <p className="text-white/60">{t("education.empty")}</p>;
  }

  return (
    <ul className="space-y-4">
      {educations.map((education) => (
        <li
          key={education.slug}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="flex items-start gap-3">
            <EntryLogo src={education.logo} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  {education.institutionUrl ? (
                    <ExternalLink
                      href={education.institutionUrl}
                      className="hover:underline"
                    >
                      {education.institution}
                    </ExternalLink>
                  ) : (
                    education.institution
                  )}
                </h3>
                <span className="font-mono text-xs text-white/50">
                  {formatDateRange(
                    education.startDate,
                    education.endDate,
                    locale,
                    t("projects.present"),
                  )}
                </span>
              </div>
              <p className="text-sm text-white/80">
                {pickLocalized(education.credential, locale)}
                {education.field
                  ? ` · ${pickLocalized(education.field, locale)}`
                  : ""}
              </p>
              {education.note && (
                <p className="mt-1 text-sm text-white/80">
                  <span aria-hidden="true">· </span>
                  {pickLocalized(education.note, locale)}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
