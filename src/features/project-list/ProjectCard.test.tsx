import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
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
  featured: true,
};

describe("ProjectCard", () => {
  it("shows the picture on top, sized and lazy, named after the project", () => {
    renderWithProviders(
      <ProjectCard project={{ ...project, image: "/projects/banklite.jpg" }} />,
      { locale: "fr" },
    );
    const picture = screen.getByRole("img", { name: "BankLite FR" });
    expect(picture).toHaveAttribute("src", "/projects/banklite.jpg");
    expect(picture).toHaveAttribute("width", "960");
    expect(picture).toHaveAttribute("height", "600");
    expect(picture).toHaveAttribute("loading", "lazy");
  });

  it("keeps the subtitle link on the part after the bar", () => {
    renderWithProviders(
      <ProjectCard
        project={{
          ...project,
          subtitle: {
            en: "International Finalist | McGill-FIAM Asset Management Hackathon",
            fr: "Finaliste international | Hackathon en gestion d'actifs McGill-FIAM",
          },
          subtitleUrl: "https://hackathonfiam-ia.com/",
        }}
      />,
      { locale: "en" },
    );
    const link = screen.getByRole("link", {
      name: "McGill-FIAM Asset Management Hackathon",
    });
    expect(link).toHaveAttribute("href", "https://hackathonfiam-ia.com/");
    expect(link.closest("p")).toHaveTextContent(
      "International Finalist | McGill-FIAM Asset Management Hackathon",
    );
    expect(
      screen.queryByRole("link", { name: /International Finalist/ }),
    ).toBeNull();
  });

  it("opens the picture large and gives focus back when it closes", () => {
    const { container } = renderWithProviders(
      <ProjectCard project={{ ...project, image: "/projects/banklite.jpg" }} />,
      { locale: "en" },
    );
    const opener = screen.getByRole("button", {
      name: "Open the picture of BankLite",
    });
    fireEvent.click(opener);
    const dialog = container.querySelector("dialog");
    expect(dialog).toHaveAttribute("open");
    const large = dialog?.querySelector("img");
    expect(large).toHaveAttribute("src", "/projects/banklite-large.jpg");
    fireEvent.error(large as HTMLImageElement);
    expect(dialog?.querySelector("img")).toHaveAttribute(
      "src",
      "/projects/banklite.jpg",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(document.activeElement).toBe(opener);
  });

  it("closes the picture with Escape and with a click outside it", () => {
    const { container } = renderWithProviders(
      <ProjectCard project={{ ...project, image: "/projects/banklite.jpg" }} />,
      { locale: "en" },
    );
    const opener = screen.getByRole("button", {
      name: "Open the picture of BankLite",
    });
    const dialog = container.querySelector("dialog") as HTMLDialogElement;
    fireEvent.click(opener);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(dialog).not.toHaveAttribute("open");
    fireEvent.click(opener);
    fireEvent.click(dialog);
    expect(dialog).not.toHaveAttribute("open");
  });

  it("has no picture when the project has none", () => {
    renderWithProviders(<ProjectCard project={project} />, { locale: "en" });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the localized title as text, with the card as an anchor target", () => {
    const { container } = renderWithProviders(
      <ProjectCard project={project} />,
      { locale: "en" },
    );
    const heading = screen.getByRole("heading", { name: "BankLite" });
    expect(heading).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "BankLite" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector("#project-banklite")).toBeInTheDocument();
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

  it("handles clicks on the website and repo actions, with no case study link", () => {
    renderWithProviders(<ProjectCard project={project} />, { locale: "en" });
    fireEvent.click(screen.getByRole("link", { name: /Website/i }));
    fireEvent.click(screen.getByRole("link", { name: /GitHub/i }));
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders without website, repo, subtitle, or icon when they are absent", () => {
    const minimalProject: Project = {
      ...project,
      subtitle: undefined,
      website: undefined,
      repo: undefined,
      icon: undefined,
    };
    renderWithProviders(<ProjectCard project={minimalProject} />, {
      locale: "en",
    });
    expect(
      screen.queryByRole("link", { name: /Website/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /GitHub/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
