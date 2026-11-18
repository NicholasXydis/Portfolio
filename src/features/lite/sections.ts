export const LITE_SECTIONS = [
  { id: "about", labelKey: "lite.nav.about" },
  { id: "education", labelKey: "lite.nav.education" },
  { id: "experience", labelKey: "lite.nav.experience" },
  { id: "projects", labelKey: "lite.nav.projects" },
  { id: "activities", labelKey: "lite.nav.activities" },
  { id: "skills", labelKey: "lite.nav.skills" },
] as const;

export type LiteSectionId = (typeof LITE_SECTIONS)[number]["id"];

export const LITE_SECTION_IDS: readonly LiteSectionId[] = LITE_SECTIONS.map(
  (section) => section.id,
);

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
