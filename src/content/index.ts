import {
  EducationsFileSchema,
  ExperiencesFileSchema,
  ProjectsFileSchema,
  StackFileSchema,
  type Education,
  type Experience,
  type Project,
  type StackGroup,
} from "./schemas";
import { parseOrThrow } from "@/lib/parseContent";
import projectsData from "./projects.json";
import experiencesData from "./experiences.json";
import educationsData from "./educations.json";
import stackData from "./stack.json";

export const projects: Project[] = parseOrThrow(
  ProjectsFileSchema,
  projectsData,
  "projects",
);

export const experiences: Experience[] = parseOrThrow(
  ExperiencesFileSchema,
  experiencesData,
  "experiences",
);

export const educations: Education[] = parseOrThrow(
  EducationsFileSchema,
  educationsData,
  "educations",
);

export const stack: StackGroup[] = parseOrThrow(
  StackFileSchema,
  stackData,
  "stack",
);

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}

export * from "./schemas";
