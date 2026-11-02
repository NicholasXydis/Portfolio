import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  certifications,
  experiences,
  extracurriculars,
  projects,
  stack,
} from "@/content";
import { TECH_ICON_FILES } from "@/lib/techIcons";

const projectCount = projects.length;
const experienceCount = experiences.length;
const stackGroupCount = stack.length;

const slugs = projects.map((project) => project.slug);
const duplicateSlug = slugs.find(
  (slug, index) => slugs.indexOf(slug) !== index,
);
if (duplicateSlug) {
  throw new Error(`Duplicate project slug: ${duplicateSlug}`);
}

const missingIcon = Object.entries(TECH_ICON_FILES).find(
  ([, file]) =>
    !existsSync(resolve(process.cwd(), "public/tech-icons", `${file}.svg`)),
);
if (missingIcon) {
  throw new Error(
    `Tech icon file missing: "${missingIcon[0]}" -> public/tech-icons/${missingIcon[1]}.svg`,
  );
}

const bulletSources = [
  ...experiences,
  ...extracurriculars,
  ...certifications,
].flatMap((entry) =>
  entry.description ? [{ slug: entry.slug, text: entry.description }] : [],
);
bulletSources.push(
  ...projects.map((project) => ({ slug: project.slug, text: project.body })),
);

for (const locale of ["en", "fr"] as const) {
  const seen = new Map<string, string>();
  for (const { slug, text } of bulletSources) {
    for (const bullet of text[locale].split("\n")) {
      const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase();
      if (!firstWord) continue;
      const stem = firstWord.slice(0, 7);
      const previous = seen.get(stem);
      if (previous) {
        throw new Error(
          `Repeated first word "${firstWord}" (${locale}) in ${previous} and ${slug}`,
        );
      }
      seen.set(stem, slug);
    }
  }
}

console.log(
  `Content valid: ${projectCount} project(s), ${experienceCount} experience(s), ${stackGroupCount} stack group(s).`,
);
