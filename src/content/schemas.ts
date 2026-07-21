import { z } from "zod";

const LocalizedTextSchema = z.object({
  en: z.string().min(1),
  fr: z.string().min(1),
});

const ImageSchema = z.object({
  src: z.string().min(1),
  alt: LocalizedTextSchema,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const LinkSchema = z.object({
  label: LocalizedTextSchema,
  href: z.string().url(),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const ProjectSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
  title: LocalizedTextSchema,
  subtitle: LocalizedTextSchema.optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.nullable().optional(),
  lastUpdated: isoDate,
  tags: z.array(z.string().min(1)).min(1),
  summary: LocalizedTextSchema,
  body: LocalizedTextSchema,
  website: z.string().url().optional(),
  repo: z.string().url().optional(),
  icon: z.string().optional(),
  links: z.array(LinkSchema).default([]),
  images: z.array(ImageSchema).default([]),
  featured: z.boolean().default(false),
});

export const ExperienceSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
  role: LocalizedTextSchema,
  company: z.string().min(1),
  companyUrl: z.string().url().optional(),
  location: LocalizedTextSchema.optional(),
  repo: z.string().url().optional(),
  logo: z.string().optional(),
  startDate: isoDate,
  endDate: isoDate.nullable(),
  description: LocalizedTextSchema,
});

export const EducationSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case"),
  institution: z.string().min(1),
  institutionUrl: z.string().url().optional(),
  logo: z.string().optional(),
  credential: LocalizedTextSchema,
  field: LocalizedTextSchema.optional(),
  note: LocalizedTextSchema.optional(),
  startDate: isoDate,
  endDate: isoDate.nullable(),
});

export const StackGroupSchema = z.object({
  label: LocalizedTextSchema,
  items: z.array(z.string().min(1)).min(1),
});

export const ProjectsFileSchema = z.array(ProjectSchema);
export const ExperiencesFileSchema = z.array(ExperienceSchema);
export const EducationsFileSchema = z.array(EducationSchema);
export const StackFileSchema = z.array(StackGroupSchema);

export type { Locale } from "@/lib/i18n";
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type ProjectLink = z.infer<typeof LinkSchema>;
export type ProjectImage = z.infer<typeof ImageSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type StackGroup = z.infer<typeof StackGroupSchema>;
