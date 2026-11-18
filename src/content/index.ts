import type { Education, Experience, Project, StackGroup } from "./schemas";
import projectsData from "./projects.json";
import experiencesData from "./experiences.json";
import certificationsData from "./certifications.json";
import educationsData from "./educations.json";
import extracurricularsData from "./extracurriculars.json";
import stackData from "./stack.json";

export const projects: Project[] = projectsData;
export const experiences: Experience[] = experiencesData;
export const educations: Education[] = educationsData;
export const extracurriculars: Experience[] = extracurricularsData;
export const certifications: Experience[] = certificationsData;
export const stack: StackGroup[] = stackData;
