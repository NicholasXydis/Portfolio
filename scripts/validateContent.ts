import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { experiences, projects, stack } from "@/content";
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

console.log(
  `Content valid: ${projectCount} project(s), ${experienceCount} experience(s), ${stackGroupCount} stack group(s).`,
);
