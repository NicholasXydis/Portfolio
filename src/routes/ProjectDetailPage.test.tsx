import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { ProjectDetailPage } from "./ProjectDetailPage";
import { renderWithProviders } from "@/test/render";
import type { Project } from "@/content/schemas";
import type * as ContentModule from "@/content";

describe("ProjectDetailPage", () => {
  it("renders a real project from validated content", () => {
    renderWithProviders(<ProjectDetailPage />, {
      route: "/en/projects/banklite",
      path: "/:locale/projects/:slug",
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /BankLite/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("C#")).toBeInTheDocument();
  });

  it("handles clicks on the website and repo actions", () => {
    renderWithProviders(<ProjectDetailPage />, {
      route: "/en/projects/banklite",
      path: "/:locale/projects/:slug",
    });
    fireEvent.click(screen.getByRole("link", { name: /Website/i }));
    fireEvent.click(screen.getByRole("link", { name: /GitHub/i }));
    expect(screen.getByRole("link", { name: /Website/i })).toHaveAttribute(
      "href",
      "https://banklite.ca",
    );
  });

  it("shows the 404 page for an unknown slug", () => {
    renderWithProviders(<ProjectDetailPage />, {
      route: "/en/projects/does-not-exist",
      path: "/:locale/projects/:slug",
    });
    expect(
      screen.getByRole("heading", { name: /Page not found/i }),
    ).toBeInTheDocument();
  });
});

const minimalProject: Project = {
  slug: "minimal",
  title: { en: "Minimal Project", fr: "Projet minimal" },
  lastUpdated: "2025-01-02",
  tags: ["TypeScript"],
  summary: { en: "Just a summary.", fr: "Juste un résumé." },
  body: { en: "Body", fr: "Corps" },
  links: [],
  images: [],
  featured: false,
};

vi.mock("@/content", async (importOriginal) => {
  const actual = await importOriginal<typeof ContentModule>();
  return {
    ...actual,
    getProjectBySlug: (slug: string) =>
      slug === "minimal" ? minimalProject : actual.getProjectBySlug(slug),
  };
});

describe("ProjectDetailPage with a minimal project (no website, repo, images, or case study)", () => {
  it("renders the summary and hides website/repo/image sections", () => {
    renderWithProviders(<ProjectDetailPage />, {
      route: "/en/projects/minimal",
      path: "/:locale/projects/:slug",
    });
    expect(
      screen.getByRole("heading", { level: 1, name: /Minimal Project/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Just a summary.")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Website/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /GitHub/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
