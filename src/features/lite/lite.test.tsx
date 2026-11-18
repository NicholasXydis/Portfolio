import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { render } from "@testing-library/react";
import { useActiveSection } from "./useActiveSection";
import { useKeepPlace } from "./useKeepPlace";
import { revealWithin, useReveal } from "./useReveal";

const frames = () => new Promise((resolve) => setTimeout(resolve, 80));

function placeSection(id: string, top: number) {
  const element = document.createElement("section");
  element.id = id;
  element.getBoundingClientRect = () => ({ top }) as DOMRect;
  document.body.appendChild(element);
  return element;
}

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { value, configurable: true });
}

afterEach(() => {
  document.body.innerHTML = "";
  setScrollY(0);
  window.history.replaceState(null, "", "/en/lite");
});

describe("useActiveSection", () => {
  const ids = ["about", "experience", "projects"] as const;

  it("follows the section that crossed the line and mirrors it in the hash", async () => {
    placeSection("about", -900);
    placeSection("experience", 100);
    placeSection("projects", 900);
    const { result } = renderHook(() => useActiveSection(ids, "about"));
    expect(result.current.active).toBe("about");

    setScrollY(800);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    await act(frames);
    expect(result.current.active).toBe("experience");
    expect(window.location.hash).toBe("#experience");
  });

  it("keeps a clicked section lit until the visitor scrolls by hand", async () => {
    placeSection("about", -900);
    placeSection("experience", 100);
    placeSection("projects", 900);
    setScrollY(800);
    const { result } = renderHook(() => useActiveSection(ids, "about"));
    act(() => result.current.lockTo("projects"));
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    await act(frames);
    expect(result.current.active).toBe("projects");

    act(() => {
      window.dispatchEvent(new Event("wheel"));
      window.dispatchEvent(new Event("scroll"));
    });
    await act(frames);
    expect(result.current.active).toBe("experience");
  });
});

describe("useReveal", () => {
  const original = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = original;
  });

  function Page() {
    const ref = useRef<HTMLDivElement>(null);
    useReveal(ref);
    return (
      <div ref={ref}>
        <section id="one">
          <div data-reveal="">one</div>
        </section>
        <section id="two">
          <div data-reveal="">
            <article id="card">two</article>
          </div>
        </section>
      </div>
    );
  }

  it("marks the root ready and reveals what the observer reports", () => {
    const { container } = render(<Page />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.revealReady).toBe("true");
    container
      .querySelectorAll("[data-reveal]")
      .forEach((target) => expect(target).toHaveAttribute("data-visible"));
  });

  it("reveals a #hash target at once, without its transition", () => {
    window.history.replaceState(null, "", "/en/lite#card");
    const { container } = render(<Page />);
    const owner = container.querySelector("#two [data-reveal]");
    expect(owner).toHaveAttribute("data-instant", "true");
    expect(owner).toHaveAttribute("data-visible", "true");
  });

  it("revealWithin reveals the parts inside a section", () => {
    const section = document.createElement("section");
    section.innerHTML = '<div data-reveal=""></div>';
    revealWithin(section);
    expect(section.firstElementChild).toHaveAttribute("data-visible", "true");
    expect(section.firstElementChild).not.toHaveAttribute("data-instant");
  });
});

describe("useKeepPlace", () => {
  it("goes back to the same place in the section after a language switch", async () => {
    const section = placeSection("projects", -120);
    setScrollY(2000);
    const scrollTo = vi.spyOn(window, "scrollTo");
    const { rerender } = renderHook(
      ({ locale }) => useKeepPlace(locale, "projects"),
      { initialProps: { locale: "en" } },
    );
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    section.getBoundingClientRect = () => ({ top: -60 }) as DOMRect;
    rerender({ locale: "fr" });
    await act(frames);
    expect(scrollTo).toHaveBeenCalledWith({
      top: 2000 + 60,
      behavior: "instant",
    });
    scrollTo.mockRestore();
  });

  it("keeps the line under the header when the switch replaces it", async () => {
    const main = document.createElement("main");
    main.id = "main-content";
    main.getBoundingClientRect = () =>
      ({ top: -1500, left: 0, width: 390, height: 4000 }) as DOMRect;
    const card = document.createElement("article");
    const line = document.createElement("p");
    line.getBoundingClientRect = () => ({ top: 120, height: 40 }) as DOMRect;
    card.appendChild(document.createElement("h3"));
    card.appendChild(line);
    main.appendChild(card);
    document.body.appendChild(main);
    placeSection("projects", -300);
    setScrollY(2000);
    const original = document.elementFromPoint;
    document.elementFromPoint = () => line;
    const scrollTo = vi.spyOn(window, "scrollTo");
    const { rerender } = renderHook(
      ({ locale }) => useKeepPlace(locale, "projects"),
      { initialProps: { locale: "en" } },
    );
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    const twin = document.createElement("p");
    twin.getBoundingClientRect = () => ({ top: 150, height: 60 }) as DOMRect;
    card.replaceChild(twin, line);
    rerender({ locale: "fr" });
    await act(frames);
    expect(scrollTo).toHaveBeenCalledWith({ top: 2030, behavior: "instant" });
    document.elementFromPoint = original;
    scrollTo.mockRestore();
  });

  it("does nothing on the first render or at the top", async () => {
    placeSection("about", 0);
    const scrollTo = vi.spyOn(window, "scrollTo");
    const { rerender } = renderHook(
      ({ locale }) => useKeepPlace(locale, "about"),
      { initialProps: { locale: "en" } },
    );
    rerender({ locale: "fr" });
    await act(frames);
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });
});
