import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { renderWithProviders } from "@/test/render";
import {
  Button,
  DayNightButton,
  FlagFrance,
  FlatLink,
  FlagUS,
  KoiLoader,
  KoiMark,
  LanguagePill,
  LoadingScene,
  PanelSkin,
  PillNav,
  Portrait,
  RadioPill,
  SegmentedFlags,
  Tabs,
} from "@/components/koi";

function Where() {
  const location = useLocation();
  return (
    <output data-testid="where">{location.pathname + location.hash}</output>
  );
}

beforeEach(() => {
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Koi kit components", () => {
  it("names the mark only when it is given a title", () => {
    const { container } = renderWithProviders(
      <>
        <KoiMark title="Koi" />
        <KoiMark />
      </>,
    );
    expect(screen.getByRole("img", { name: "Koi" })).toBeInTheDocument();
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(
      1,
    );
  });

  it("renders a button, or a link when it has an href", () => {
    renderWithProviders(
      <>
        <Button>CV</Button>
        <Button href="/en/lite">Flat</Button>
        <Button disabled>Off</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "CV" })).toHaveAttribute(
      "type",
      "button",
    );
    expect(screen.getByRole("link", { name: "Flat" })).toHaveAttribute(
      "href",
      "/en/lite",
    );
    expect(screen.getByRole("button", { name: "Off" })).toBeDisabled();
  });

  it("marks the current name in the pill nav and reports a choice", async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <PillNav
        label="Sections"
        activeId="experience"
        onSelect={onSelect}
        items={[
          { id: "about", label: "About", href: "#about" },
          { id: "experience", label: "Experience", href: "#experience" },
          { id: "skills", label: "Skills" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(
      within(nav).getByRole("link", { name: "Experience" }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      within(nav).getByRole("link", { name: "About" }),
    ).not.toHaveAttribute("aria-current");
    await userEvent.click(within(nav).getByRole("button", { name: "Skills" }));
    expect(onSelect).toHaveBeenCalledWith("skills");
  });

  it("presses the active flag and selects the other", async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <SegmentedFlags
        label="Language"
        active="en"
        onSelect={onSelect}
        items={[
          { id: "en", label: "English", flag: <FlagUS /> },
          { id: "fr", label: "Français", flag: <FlagFrance /> },
        ]}
      />,
    );
    const group = screen.getByRole("group", { name: "Language" });
    expect(
      within(group).getByRole("button", { name: "English" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      within(group).getByRole("button", { name: "English" }),
    );
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(
      within(group).getByRole("button", { name: "Français" }),
    );
    expect(onSelect).toHaveBeenCalledWith("fr");
  });

  it("swaps the address prefix from the language pill and keeps the rest", async () => {
    renderWithProviders(
      <>
        <LanguagePill />
        <Where />
      </>,
      { route: "/en/lite#projects" },
    );
    const french = screen.getByRole("link", { name: "Français" });
    expect(french).toHaveAttribute("href", "/fr/lite#projects");
    expect(french).toHaveAttribute("hreflang", "fr");
    expect(french).toHaveAttribute("lang", "fr");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await userEvent.click(french);
    expect(screen.getByTestId("where")).toHaveTextContent("/fr/lite#projects");
  });

  it("reports the loader's progress and clamps it", () => {
    const { rerender } = renderWithProviders(<KoiLoader progress={0.62} />);
    const bar = screen.getByRole("progressbar", { name: "Loading" });
    expect(bar).toHaveAttribute("aria-valuenow", "62");
    rerender(<KoiLoader progress={7} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("gives the panel a focusable title, the seal's words and a close button", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <PanelSkin title="Projects" titleId="panel-title" here onClose={onClose}>
        <p>Body</p>
      </PanelSkin>,
    );
    expect(
      screen.getByRole("region", { name: "Projects" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Projects" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByText("You are here")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("pieces for the 3D page", () => {
  it("presses the day and night button at night and asks for the other theme", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <>
        <DayNightButton theme="dark" onChange={onChange} />
        <DayNightButton theme="light" onChange={onChange} />
      </>,
    );
    const [night, day] = screen.getAllByRole("button", { name: "Night" });
    expect(night).toHaveAttribute("aria-pressed", "true");
    expect(night).toHaveAttribute("title", "Bring back the daylight");
    expect(day).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(night as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith("light");
    await userEvent.click(day as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith("dark");
  });

  it("names the radio and toggles the music", async () => {
    const onToggle = vi.fn();
    renderWithProviders(<RadioPill playing={false} onToggle={onToggle} />);
    expect(screen.getByText("Koi radio")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Play the music" }),
    );
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("links to the flat page, and keeps its name when compact", () => {
    renderWithProviders(
      <>
        <FlatLink to="/en/lite" label="2D version" />
        <FlatLink to="/en/lite" label="2D version" compact />
      </>,
    );
    const links = screen.getAllByRole("link", { name: "2D version" });
    expect(links).toHaveLength(2);
    expect(links[1]).toHaveAttribute("href", "/en/lite");
  });

  it("frames the owner's photo with its text alternative", () => {
    renderWithProviders(<Portrait alt="Nicholas Xydis" />);
    const img = screen.getByRole("img", { name: "Nicholas Xydis" });
    expect(img).toHaveAttribute("src", "/portrait.jpg");
    expect(img).toHaveAttribute("width", "72");
  });
});

describe("Tabs", () => {
  function TabsHarness() {
    const [active, setActive] = useState<"projects" | "skills">("projects");
    return (
      <>
        <Tabs
          idBase="t"
          label="What to show"
          active={active}
          onChange={setActive}
          items={[
            { id: "projects", label: "Projects" },
            { id: "skills", label: "Skills" },
          ]}
        />
        <div
          role="tabpanel"
          id="t-tabpanel"
          aria-labelledby={`t-tab-${active}`}
        >
          {active}
        </div>
      </>
    );
  }

  it("is a tab list: one tab selected and tabbable, each pointing at the panel", () => {
    renderWithProviders(<TabsHarness />);
    const list = screen.getByRole("tablist", { name: "What to show" });
    const [projects, skills] = within(list).getAllByRole("tab");
    expect(projects).toHaveAttribute("aria-selected", "true");
    expect(projects).toHaveAttribute("tabindex", "0");
    expect(skills).toHaveAttribute("aria-selected", "false");
    expect(skills).toHaveAttribute("tabindex", "-1");
    expect(skills).toHaveAttribute("aria-controls", "t-tabpanel");
    expect(
      screen.getByRole("tabpanel", { name: "Projects" }),
    ).toHaveTextContent("projects");
  });

  it("moves with the arrow keys, Home and End, and the choice follows the focus", async () => {
    renderWithProviders(<TabsHarness />);
    const [projects, skills] = screen.getAllByRole("tab");
    (projects as HTMLElement).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(skills).toHaveAttribute("aria-selected", "true");
    expect(skills).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(projects).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(skills).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(projects).toHaveAttribute("aria-selected", "true");
    await userEvent.click(skills as HTMLElement);
    expect(screen.getByRole("tabpanel", { name: "Skills" })).toHaveTextContent(
      "skills",
    );
  });
});

describe("LoadingScene", () => {
  const strings = {
    brand: "koi",
    by: "by Nicholas",
    flat: "View the flat 2D version",
    loadingTitle: "Filling the pond…",
    progressLabel: "Loading the world",
    readyTitle: "The pond is ready.",
    readyLine: "Step inside. The tea master is waiting.",
    enter: "Enter the world",
  };
  const scene = (ready: boolean, progress: number, onEnter = vi.fn()) => (
    <LoadingScene
      progress={progress}
      ready={ready}
      onEnter={onEnter}
      liteHref="/en/lite"
      strings={strings}
      name="Nicholas Xydis"
      role="Software Developer"
    />
  );

  it("states the progress once, links to the flat page and keeps the owner as the h1", async () => {
    renderWithProviders(scene(false, 0.4));
    await waitFor(() =>
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "40",
      ),
    );
    expect(screen.getByText("koi")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View the flat 2D version" }),
    ).toHaveAttribute("href", "/en/lite");
    expect(
      screen.getByRole("heading", { level: 2, name: "Filling the pond…" }),
    ).toBeInTheDocument();
    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(1);
    expect(bars[0]).toHaveAttribute("aria-valuenow", "40");
    expect(bars[0]).toHaveAccessibleName("Loading the world");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Nicholas Xydis",
    );
  });

  it("when ready, says so, focuses Enter and calls back", async () => {
    const onEnter = vi.fn();
    renderWithProviders(scene(true, 1, onEnter));
    expect(screen.getByRole("status")).toHaveTextContent("The pond is ready.");
    const enter = screen.getByRole("button", { name: "Enter the world" });
    expect(enter).toHaveFocus();
    await userEvent.click(enter);
    expect(onEnter).toHaveBeenCalledOnce();
  });
});

describe("LoadingScene, one block of words at a time", () => {
  const strings = {
    brand: "koi",
    by: "by Nicholas",
    flat: "View the flat 2D version",
    loadingTitle: "Filling the pond…",
    progressLabel: "Loading the world",
    readyTitle: "The pond is ready.",
    readyLine: "Step inside. The tea master is waiting.",
    enter: "Enter the world",
  };
  function Harness() {
    const [ready, setReady] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setReady(true)}>
          world ready
        </button>
        <LoadingScene
          progress={ready ? 1 : 0.4}
          ready={ready}
          onEnter={() => undefined}
          liteHref="/en/lite"
          strings={strings}
          name="Nicholas Xydis"
          role="Software Developer"
        />
      </>
    );
  }
  const headings = () =>
    screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  const loadingBlock = () =>
    document.querySelector(".koi-scene__words--loading");
  const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  const title = () => document.querySelector(".koi-scene__title--late");
  const bar = () => screen.queryByRole("progressbar");

  it("shows the line from the first frame, and on a fast load no loading words at all", () => {
    vi.useFakeTimers();
    renderWithProviders(<Harness />);
    expect(bar()).toHaveAttribute("aria-valuenow", "0");
    tick(300);
    expect(bar()).toHaveAttribute("aria-valuenow", "40");
    expect(title()).not.toHaveClass("is-in");
    fireEvent.click(screen.getByRole("button", { name: "world ready" }));
    tick(40);
    expect(bar()).toHaveAttribute("aria-valuenow", "100");
    tick(500);
    expect(loadingBlock()).not.toBeNull();
    expect(headings()).toEqual(["Filling the pond…"]);
    expect(title()).not.toHaveClass("is-in");
    for (let elapsed = 0; elapsed < 1400; elapsed += 20) {
      tick(20);
      expect(headings().length).toBeLessThanOrEqual(1);
    }
    expect(headings()).toEqual(["The pond is ready."]);
    expect(loadingBlock()).toBeNull();
    expect(bar()).toBeNull();
  });

  it("a slow load lets the words join, holds them, takes the block out, and only then adds the ready words", () => {
    vi.useFakeTimers();
    renderWithProviders(<Harness />);
    tick(1600);
    expect(title()).toHaveClass("is-in");
    fireEvent.click(screen.getByRole("button", { name: "world ready" }));
    for (let elapsed = 0; elapsed < 2200; elapsed += 20) {
      tick(20);
      expect(headings().length).toBeLessThanOrEqual(1);
    }
    expect(headings()).toEqual(["The pond is ready."]);
    expect(
      screen.getByRole("button", { name: "Enter the world" }),
    ).toHaveFocus();
  });

  it("shows the ready words at once when the world is ready at first render", () => {
    renderWithProviders(
      <LoadingScene
        progress={1}
        ready
        onEnter={() => undefined}
        liteHref="/en/lite"
        strings={strings}
        name="Nicholas Xydis"
        role="Software Developer"
      />,
    );
    expect(headings()).toEqual(["The pond is ready."]);
    expect(loadingBlock()).toBeNull();
  });
});
