import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { ProjectCard } from "./ProjectCard";
import { renderWithProviders } from "@/test/render";
import type { Project } from "@/content/schemas";

const project: Project = {
  slug: "banklite",
  title: { en: "BankLite", fr: "BankLite FR" },
  startDate: "2025-01-01",
  endDate: null,
  lastUpdated: "2025-01-02",
  tags: ["ASP.NET", "PostgreSQL"],
  summary: { en: "Secure banking app", fr: "Application bancaire" },
  body: { en: "Body", fr: "Corps" },
  website: "https://banklite.ca",
  repo: "https://github.com/NicholasXydis/BankLite",
  icon: "/project-icons/banklite.ico",
  links: [],
  images: [],
  featured: true,
};

describe("ProjectCard", () => {
  it("renders the localized title and links to the detail page", () => {
    renderWithProviders(<ProjectCard project={project} />, { locale: "en" });
    const heading = screen.getByRole("heading", { name: "BankLite" });
    expect(heading).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "BankLite" });
    expect(link).toHaveAttribute("href", "/en/projects/banklite");
  });

  it("renders the French title under the fr locale", () => {
    renderWithProviders(<ProjectCard project={project} />, { locale: "fr" });
    expect(
      screen.getByRole("heading", { name: "BankLite FR" }),
    ).toBeInTheDocument();
  });

  it("renders each tag", () => {
    renderWithProviders(<ProjectCard project={project} />, { locale: "en" });
    expect(screen.getByText("ASP.NET")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
  });

  it("renders the project logo and website/repo actions with safe rel", () => {
    const { container } = renderWithProviders(
      <ProjectCard project={project} />,
      { locale: "en" },
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/project-icons/banklite.ico",
    );

    const website = screen.getByRole("link", { name: /Website/i });
    expect(website).toHaveAttribute("href", "https://banklite.ca");
    expect(website).toHaveAttribute("target", "_blank");

    const repo = screen.getByRole("link", { name: /GitHub/i });
    expect(repo).toHaveAttribute(
      "href",
      "https://github.com/NicholasXydis/BankLite",
    );
    expect(repo).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
