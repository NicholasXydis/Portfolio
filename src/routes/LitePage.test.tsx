import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { LitePage } from "./LitePage";
import { renderWithProviders } from "@/test/render";
import { projects } from "@/content";
import tracks from "../../public/music/samples/tracks.json";

const music = vi.hoisted(() => ({
  setMuted: vi.fn(),
}));
vi.mock("@/features/music", () => ({
  useMusic: () => ({ playing: false, muted: false }),
  setMuted: music.setMuted,
  prepare: vi.fn(),
}));

const renderLite = (locale: "en" | "fr" = "en") =>
  renderWithProviders(<LitePage />, { locale, route: `/${locale}/lite` });

describe("LitePage", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.history.replaceState(null, "", "/en/lite");
  });

  it("has one h1, the owner's name, and labelled sections in order", () => {
    const { container } = renderLite();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Nicholas Xydis");

    const ids = Array.from(container.querySelectorAll("main section[id]")).map(
      (section) => section.id,
    );
    expect(ids).toEqual([
      "about",
      "education",
      "experience",
      "projects",
      "activities",
      "skills",
    ]);
    for (const name of [
      "Education",
      "Experience",
      "Projects",
      "Activities & Certifications",
      "Skills",
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("heading", { level: 3, name: "Certifications" }),
    ).toBeInTheDocument();
  });

  it("puts the six-name pill nav in the header, outside main", () => {
    renderLite();
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav.closest("header")).not.toBeNull();
    expect(nav.closest("main")).toBeNull();
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "About",
      "Education",
      "Experience",
      "Projects",
      "Activities",
      "Skills",
    ]);
    expect(links[0]).toHaveAttribute("aria-current", "true");
  });

  it("renders every project card with its anchor and no case-study link", () => {
    const { container } = renderLite();
    for (const project of projects) {
      expect(
        container.querySelector(`#project-${project.slug}`),
      ).not.toBeNull();
    }
    expect(screen.queryByText(/case study/i)).toBeNull();
    expect(container.querySelector('a[href*="/projects/"]')).toBeNull();
  });

  it("links back to the 3D world and to the CV in the page's language", () => {
    renderLite();
    const world = screen.getAllByRole("link", { name: "Open the 3D world" });
    expect(world.length).toBeGreaterThan(0);
    world.forEach((link) => expect(link).toHaveAttribute("href", "/en"));
    const cv = screen.getByRole("link", { name: /cv/i });
    expect(cv).toHaveAttribute("href", "/cv-en.html");
    fireEvent.click(cv);
  });

  it("has its own skip link, main landmark and footer", () => {
    renderLite();
    expect(
      screen.getByRole("link", { name: "Skip to content" }),
    ).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(/© \d{4} Nicholas Xydis/);
    expect(footer).not.toHaveTextContent(/All rights reserved/);
  });

  it("sets its own title", async () => {
    renderLite();
    await waitFor(() =>
      expect(document.title).toBe(
        "Nicholas Xydis | CS @ Concordia & Software Developer (2D)",
      ),
    );
  });

  it("speaks French on /fr/lite", () => {
    renderLite("fr");
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual([
      "À propos",
      "Formation",
      "Expérience",
      "Projets",
      "Activités",
      "Compétences",
    ]);
    screen
      .getAllByRole("link", { name: "Ouvrir le monde 3D" })
      .forEach((link) => expect(link).toHaveAttribute("href", "/fr"));
  });

  it("a nav click scrolls to the section, lights its name and sets the hash", () => {
    renderLite();
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const link = within(nav).getByRole("link", { name: "Projects" });
    const notPrevented = fireEvent.click(link);
    expect(notPrevented).toBe(false);
    const section = document.getElementById("projects");
    expect(section?.scrollIntoView).toHaveBeenCalled();
    expect(link).toHaveAttribute("aria-current", "true");
    expect(window.location.hash).toBe("#projects");
    expect(document.activeElement).toBe(section);
    expect(section?.querySelector("[data-reveal]")).toHaveAttribute(
      "data-visible",
      "true",
    );
  });

  it("leaves modified clicks to the browser", () => {
    renderLite();
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const link = within(nav).getByRole("link", { name: "Skills" });
    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
  });

  it("shows every section's content once revealed", () => {
    const { container } = renderLite();
    const targets = container.querySelectorAll("[data-reveal]");
    expect(targets.length).toBe(5);
    targets.forEach((target) =>
      expect(target).toHaveAttribute("data-visible", "true"),
    );
  });

  it("jumps to a card for an old project link that arrives as ?project=", async () => {
    const observed: Element[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private callback: () => void) {}
        observe(target: Element) {
          observed.push(target);
          this.callback();
        }
        disconnect() {}
      },
    );
    const { container } = renderWithProviders(<LitePage />, {
      locale: "en",
      route: "/en/lite?project=banklite",
    });
    const card = container.querySelector<HTMLElement>("#project-banklite");
    await waitFor(() => expect(card?.scrollIntoView).toHaveBeenCalled());
    expect(card?.closest("[data-reveal]")).toHaveAttribute(
      "data-instant",
      "true",
    );
    expect(observed.some((target) => target.tagName === "HEADER")).toBe(true);
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue(
        "--lite-header-h",
      ),
    ).toMatch(/px$/);
    vi.unstubAllGlobals();
  });

  it("on a short sideways screen, tucks the brand row away and keeps the section nav", () => {
    const tops = new Map([
      ["koi-header__nav", 68],
      ["koi-header__brand", 12],
    ]);
    const offsetTop = vi
      .spyOn(HTMLElement.prototype, "offsetTop", "get")
      .mockImplementation(function (this: HTMLElement) {
        for (const [name, top] of tops)
          if (this.classList.contains(name)) return top;
        return 0;
      });
    const offsetHeight = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.tagName === "HEADER" ? 120 : 0;
      });
    const { container } = renderLite();
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--lite-tuck")).toBe("62px");
    expect(root.style.getPropertyValue("--lite-header-h")).toBe("58px");
    offsetTop.mockRestore();
    offsetHeight.mockRestore();
  });

  it("plays the shared music from the header button", () => {
    renderLite();
    fireEvent.click(screen.getByRole("button", { name: "Play the music" }));
    expect(music.setMuted).toHaveBeenCalledWith(false);
  });

  it("keeps certifications inside Activities, after the activities", () => {
    renderLite();
    const activities = screen.getByRole("region", {
      name: "Activities & Certifications",
    });
    const certifications = within(activities).getByRole("heading", {
      level: 3,
      name: "Certifications",
    });
    expect(certifications).toBeInTheDocument();
    const education = screen.getByRole("region", { name: "Education" });
    expect(
      within(education).queryByRole("heading", { name: "Certifications" }),
    ).toBeNull();
  });

  it("shows no music credit on the page", () => {
    const { container } = renderLite();
    expect(tracks.length).toBeGreaterThan(0);
    for (const track of tracks) {
      expect(container).not.toHaveTextContent(track.title);
      expect(container).not.toHaveTextContent(track.artist);
    }
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent(/Music:/);
  });
});
