import {
  EducationsFileSchema,
  ExperiencesFileSchema,
  ProjectsFileSchema,
  StackFileSchema,
} from "./schemas";
import { parseOrThrow } from "@/lib/parseContent";
import projectsData from "./projects.json";
import experiencesData from "./experiences.json";
import certificationsData from "./certifications.json";
import educationsData from "./educations.json";
import extracurricularsData from "./extracurriculars.json";
import stackData from "./stack.json";

export function parseAllContent() {
  return {
    projects: parseOrThrow(ProjectsFileSchema, projectsData, "projects"),
    experiences: parseOrThrow(
      ExperiencesFileSchema,
      experiencesData,
      "experiences",
    ),
    educations: parseOrThrow(
      EducationsFileSchema,
      educationsData,
      "educations",
    ),
    extracurriculars: parseOrThrow(
      ExperiencesFileSchema,
      extracurricularsData,
      "extracurriculars",
    ),
    certifications: parseOrThrow(
      ExperiencesFileSchema,
      certificationsData,
      "certifications",
    ),
    stack: parseOrThrow(StackFileSchema, stackData, "stack"),
  };
}
