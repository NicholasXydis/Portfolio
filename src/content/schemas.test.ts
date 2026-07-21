import { describe, expect, it } from "vitest";
import { ProjectSchema, ExperienceSchema } from "./schemas";

const validProject = {
  slug: "example-project",
  title: { en: "Example", fr: "Exemple" },
  startDate: "2025-01-01",
  endDate: null,
  lastUpdated: "2025-01-02",
  tags: ["React"],
  summary: { en: "Summary", fr: "Résumé" },
  body: { en: "Body", fr: "Corps" },
};

describe("ProjectSchema", () => {
  it("parses a valid project and applies defaults", () => {
    const result = ProjectSchema.parse(validProject);
    expect(result.links).toEqual([]);
    expect(result.images).toEqual([]);
    expect(result.featured).toBe(false);
  });

  it("rejects a non-kebab-case slug", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      slug: "Not Kebab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      startDate: "01-01-2025",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing locale variant", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      title: { en: "Only English" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty tags array", () => {
    const result = ProjectSchema.safeParse({ ...validProject, tags: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-url link", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      links: [{ label: { en: "x", fr: "x" }, href: "not-a-url" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("ExperienceSchema", () => {
  it("parses a valid experience", () => {
    const result = ExperienceSchema.safeParse({
      slug: "acme",
      role: { en: "Engineer", fr: "Ingénieur" },
      company: "Acme",
      startDate: "2024-01-01",
      endDate: null,
      description: { en: "Did things", fr: "Fait des choses" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid company url", () => {
    const result = ExperienceSchema.safeParse({
      slug: "acme",
      role: { en: "Engineer", fr: "Ingénieur" },
      company: "Acme",
      companyUrl: "acme",
      startDate: "2024-01-01",
      endDate: null,
      description: { en: "Did things", fr: "Fait des choses" },
    });
    expect(result.success).toBe(false);
  });
});
