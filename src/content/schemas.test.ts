import { describe, expect, it } from "vitest";
import {
  ProjectSchema,
  ExperienceSchema,
  EducationSchema,
  StackGroupSchema,
} from "./schemas";

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

  it("rejects a non-url website", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      website: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-url repo", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      repo: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an image missing an alt locale variant", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      images: [{ src: "/x.jpg", alt: { en: "Only English" } }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an image with a zero or negative width", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      images: [
        {
          src: "/x.jpg",
          alt: { en: "x", fr: "x" },
          width: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an image with a non-integer height", () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      images: [
        {
          src: "/x.jpg",
          alt: { en: "x", fr: "x" },
          height: 100.5,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a project with no startDate/endDate at all", () => {
    const rest: Record<string, unknown> = { ...validProject };
    delete rest.startDate;
    delete rest.endDate;
    const result = ProjectSchema.safeParse(rest);
    expect(result.success).toBe(true);
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

describe("EducationSchema", () => {
  const validEducation = {
    slug: "some-university",
    institution: "Some University",
    credential: { en: "B.Sc. Computer Science", fr: "B.Sc. Informatique" },
    startDate: "2022-09-01",
    endDate: null,
  };

  it("parses a valid education entry", () => {
    expect(EducationSchema.safeParse(validEducation).success).toBe(true);
  });

  it("rejects a non-kebab-case slug", () => {
    const result = EducationSchema.safeParse({
      ...validEducation,
      slug: "Some University",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid institutionUrl", () => {
    const result = EducationSchema.safeParse({
      ...validEducation,
      institutionUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing credential locale variant", () => {
    const result = EducationSchema.safeParse({
      ...validEducation,
      credential: { en: "Only English" },
    });
    expect(result.success).toBe(false);
  });
});

describe("StackGroupSchema", () => {
  it("parses a valid stack group", () => {
    const result = StackGroupSchema.safeParse({
      label: { en: "Languages", fr: "Langages" },
      items: ["TypeScript", "C#"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty items array", () => {
    const result = StackGroupSchema.safeParse({
      label: { en: "Languages", fr: "Langages" },
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing label locale variant", () => {
    const result = StackGroupSchema.safeParse({
      label: { en: "Languages" },
      items: ["TypeScript"],
    });
    expect(result.success).toBe(false);
  });
});
