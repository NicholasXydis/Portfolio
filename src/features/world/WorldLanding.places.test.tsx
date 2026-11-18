import { act, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  enter,
  harness,
  renderLanding,
  setUpWorldLanding,
  wait,
} from "@/test/worldLanding";

describe("WorldLanding", { timeout: 20000 }, () => {
  setUpWorldLanding();

  it("lets Escape close only an enlarged project picture, then the card on the next Escape", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(screen.getByRole("button", { name: /^Projects/ }));
    const region = await screen.findByRole("region", { name: "Projects" });
    const picture = within(region).getAllByRole("button", {
      name: /^Open the picture of/,
    })[0] as HTMLElement;
    await user.click(picture);
    const dialog = document.querySelector("dialog[open]") as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(h.world.setView).toHaveBeenLastCalledWith("projects");
    expect(
      screen.getByRole("region", { name: "Projects" }),
    ).toBeInTheDocument();
    act(() => {
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    });
    await waitFor(() => expect(picture).toHaveFocus());
    expect(document.querySelector("dialog[open]")).toBeNull();
    await user.keyboard("{Escape}");
    expect(h.world.setView).toHaveBeenLastCalledWith("explore");
  });

  it("opens a place from a tag, focuses the panel heading, and Escape goes to explore", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(screen.getByRole("button", { name: /^Experience/ }));
    expect(h.world.setView).toHaveBeenLastCalledWith("experience");
    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Experience",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(
      await screen.findByRole("heading", { name: "Activities" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Certifications" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(h.world.setView).toHaveBeenLastCalledWith("explore");
    const toolbar = screen.getByRole("button", { name: "Ask the tea master" });
    await waitFor(() => expect(toolbar).toHaveFocus());
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { level: 2, name: "Experience" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("brings the host's question back from the toolbar", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(
      screen.getByRole("button", { name: "Just looking around" }),
    );
    expect(h.world.setView).toHaveBeenLastCalledWith("explore");
    await user.click(
      screen.getByRole("button", { name: "Ask the tea master" }),
    );
    expect(h.world.setView).toHaveBeenLastCalledWith("welcome");
    const question = await screen.findByRole("heading", {
      name: /what brings you in/i,
    });
    await waitFor(() => expect(question).toHaveFocus());
  });

  it("takes the visitor from a place to explore when the brand is pressed", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(screen.getByRole("button", { name: /^About/ }));
    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "About",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    await user.click(
      screen.getByRole("button", {
        name: "Koi, back to the island",
      }),
    );
    expect(h.world.setView).toHaveBeenLastCalledWith("explore");
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "About" }),
      ).not.toBeInTheDocument(),
    );
    await wait(1000);
    expect(screen.getByRole("main")).toHaveAttribute("data-view", "explore");
    expect(
      screen.queryByRole("heading", { name: /what brings you in/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the place the visitor taps in the world, and the close button returns to explore", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(
      screen.getByRole("button", { name: "Just looking around" }),
    );
    act(() => h.options().onPick?.("projects"));
    const panel = await screen.findByRole("region", { name: "Projects" });
    expect(
      within(panel).getByRole("tab", { name: "Projects" }),
    ).toHaveAttribute("aria-selected", "true");
    await user.click(within(panel).getByRole("tab", { name: "Skills" }));
    expect(within(panel).getByRole("tab", { name: "Skills" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Back to the island" }),
    );
    expect(h.world.setView).toHaveBeenLastCalledWith("explore");
  });

  it("lists the places as About, Education, Experience, Projects", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    const names = screen
      .getAllByRole("button")
      .map((b) => b.textContent ?? "")
      .filter((text) => /^(About|Education|Experience|Projects)/.test(text))
      .map((text) => text.match(/^(About|Education|Experience|Projects)/)?.[1]);
    expect(names).toEqual(["About", "Education", "Experience", "Projects"]);
  });

  it("draws one pin per place at the world's anchor: one label, one line of the given length and one dot", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    for (const place of ["about", "education", "experience", "projects"]) {
      const pin = document.querySelector(`[data-place=${place}]`);
      expect(pin?.querySelectorAll("[data-marker-label]")).toHaveLength(1);
      expect(pin?.querySelectorAll("[data-marker-line]")).toHaveLength(1);
      expect(pin?.querySelectorAll("[data-marker-tip]")).toHaveLength(1);
    }
    expect(document.querySelectorAll("[data-marker-dot]")).toHaveLength(0);
    const about = document.querySelector<HTMLElement>("[data-place=about]");
    expect(about?.parentElement?.style.transform).toBe(
      "translate(100px, 100px)",
    );
    expect(
      about?.querySelector<HTMLElement>("[data-marker-line]")?.style.height,
    ).toBe("22px");
    const projects = document.querySelector<HTMLElement>(
      "[data-place=projects]",
    );
    expect(
      projects?.querySelector<HTMLElement>("[data-marker-line]")?.style.height,
    ).toBe("14px");
  });

  it("points the cinema screen at the project in hand, and lets go when the panel closes", async () => {
    const h = harness();
    const showSlide = vi.fn();
    Object.assign(h.world, { showSlide });
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(screen.getByRole("button", { name: /^Projects/ }));
    const panel = await screen.findByRole("region", { name: "Projects" });
    await waitFor(() =>
      expect(panel.querySelector('[id^="project-"]')).not.toBeNull(),
    );
    const card = panel.querySelector<HTMLElement>('[id^="project-"]');
    await user.hover(card!);
    await waitFor(() =>
      expect(showSlide).toHaveBeenCalledWith(card!.id.replace(/^project-/, "")),
    );
    await user.click(
      within(panel).getByRole("button", { name: "Back to the island" }),
    );
    await waitFor(() => expect(showSlide).toHaveBeenLastCalledWith(null));
  });

  it("closes the panel on Back and returns to the question; Forward opens it again", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(screen.getByRole("button", { name: /^Education/ }));
    await screen.findByRole("region", { name: "Education" });
    expect(screen.getByTestId("where")).toHaveTextContent("/en");
    await user.click(screen.getByRole("button", { name: "test back" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Education" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole("heading", { name: /what brings you in/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "test forward" }));
    expect(
      await screen.findByRole("region", { name: "Education" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Education" }),
      ).not.toBeInTheDocument(),
    );
    expect(h.world.setView).toHaveBeenLastCalledWith("explore");
  });

  it("links each highlight in About to the same page as the 2D entries", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(screen.getByRole("button", { name: /^About/ }));
    const region = await screen.findByRole("region", { name: "About" });
    const list = within(region).getByRole("list", { name: /highlights/i });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual([
      "Concordia University",
      "Centre D'Auto Allard",
      "QUARCC Purple",
      "Stage",
    ]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://www.concordia.ca/academics/undergraduate/computer-science.html",
      "https://centredautoallard.ca/en/",
      "https://quarccpurple.ca",
      "https://pypi.org/project/stage-cli/",
    ]);
    for (const a of links) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
    }
  });

  it("gives each About highlight its line and its note", async () => {
    const h = harness();
    const { user } = renderLanding(h.load);
    await enter(user);
    await user.click(screen.getByRole("button", { name: /^About/ }));
    const region = await screen.findByRole("region", { name: "About" });
    const list = within(region).getByRole("list", { name: /highlights/i });
    const cards = within(list).getAllByRole("listitem");
    const lines = cards.map((card) =>
      Array.from(card.querySelectorAll("p")).map((p) => p.textContent),
    );
    expect(lines).toEqual([
      ["Concordia University", "Computer Science", "Expected Dec 2029"],
      [
        "Centre D'Auto Allard",
        "Software Developer & IT Administrator",
        "Apr 2022 – Feb 2026",
      ],
      [
        "QUARCC Purple",
        "McGill-FIAM Asset Management Hackathon",
        "Top 10 Internationally",
      ],
      [
        "Stage",
        "Open-Source CS Internship Search Engine",
        "500+ PyPI Installs",
      ],
    ]);
  });

  it("links the About highlights to the French pages in French", async () => {
    const h = harness();
    const { user } = renderLanding(h.load, "fr");
    await enter(user, {
      enter: "Entrer dans le monde",
      question: /qu'est-ce qui vous amène/i,
    });
    await user.click(screen.getByRole("button", { name: /^À propos/ }));
    const region = await screen.findByRole("region", { name: "À propos" });
    const list = within(region).getByRole("list", { name: "Faits saillants" });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual([
      "Université Concordia",
      "Centre D'Auto Allard",
      "QUARCC Purple",
      "Stage",
    ]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://www.concordia.ca/fr/etudes/programmes-de-1er-cycle/informatique.html",
      "https://centredautoallard.ca/fr/",
      "https://quarccpurple.ca",
      "https://pypi.org/project/stage-cli/",
    ]);
    const lines = within(list)
      .getAllByRole("listitem")
      .map((card) =>
        Array.from(card.querySelectorAll("p")).map((p) => p.textContent),
      );
    expect(lines).toEqual([
      ["Université Concordia", "Informatique", "Prévu en déc. 2029"],
      [
        "Centre D'Auto Allard",
        "Développeur logiciel et administrateur informatique",
        "avr. 2022 – févr. 2026",
      ],
      [
        "QUARCC Purple",
        "Hackathon en gestion d'actifs McGill-FIAM",
        "Top 10 international",
      ],
      [
        "Stage",
        "Moteur de recherche open source de stages en informatique",
        "500+ installations PyPI",
      ],
    ]);
  });
});
