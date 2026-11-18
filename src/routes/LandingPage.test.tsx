import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import i18n from "@/lib/i18n";

let failWith: string | null = null;
vi.mock("@/features/world", async () => {
  const { useEffect } = await import("react");
  return {
    WorldLanding: ({ onFail }: { onFail?: (why: string) => void }) => {
      useEffect(() => {
        if (failWith) onFail?.(failWith);
      }, [onFail]);
      return <main aria-label="3D world" />;
    },
  };
});
vi.mock("@/routes/LitePage", () => ({
  LitePage: (props: { embedded?: boolean }) => (
    <main aria-label="flat page" data-embedded={props.embedded ? "yes" : "no"}>
      <a className="lite-world-pill" href="/en">
        Open the 3D world
      </a>
    </main>
  ),
}));

const { LandingPage } = await import("./LandingPage");

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(path: string) {
  void i18n.changeLanguage("en");
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/:locale" element={<LandingPage />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("LandingPage", () => {
  afterEach(() => {
    delete (window as unknown as { __koiNoGL?: boolean }).__koiNoGL;
    failWith = null;
  });

  it("shows the 3D world when the device can draw it", () => {
    renderAt("/en");
    expect(screen.getByRole("main", { name: "3D world" })).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("shows the flat content in place, at the same address, when the device cannot", async () => {
    (window as unknown as { __koiNoGL?: boolean }).__koiNoGL = true;
    renderAt("/en");
    const flat = await screen.findByRole("main", { name: "flat page" });
    expect(flat).toHaveAttribute("data-embedded", "yes");
    expect(screen.getByRole("note")).toHaveTextContent(/3D/);
    expect(
      screen.queryByRole("main", { name: "3D world" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/en$/);
    expect(document.querySelector("[data-no-graphics]")?.className).toContain(
      "lite-world-pill",
    );
  });
  it("shows the flat content in place with a way to try again when the world cannot load", async () => {
    failWith = "load";
    renderAt("/en");
    expect(
      await screen.findByRole("main", { name: "flat page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/could not load/i);
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/en$/);
  });

  it("says the device cannot show 3D, with no retry, when the graphics are the problem", async () => {
    failWith = "graphics";
    renderAt("/en");
    expect(
      await screen.findByRole("main", { name: "flat page" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      /can.t show the 3D world/i,
    );
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });
});
