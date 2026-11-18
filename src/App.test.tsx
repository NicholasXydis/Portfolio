import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import i18n from "@/lib/i18n";
import { App } from "@/App";

vi.mock("@/routes/LandingPage", () => ({
  LandingPage: () => <main aria-label="landing page" />,
}));
vi.mock("@/routes/LitePage", () => ({
  LitePage: () => <main aria-label="lite page" />,
}));

function renderApp(route: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("App routing", () => {
  it("redirects the bare root to the default locale landing", async () => {
    renderApp("/");
    expect(
      await screen.findByRole("main", { name: "landing page" }),
    ).toBeInTheDocument();
  });

  it("redirects an unsupported locale to the default locale", async () => {
    renderApp("/de");
    expect(
      await screen.findByRole("main", { name: "landing page" }),
    ).toBeInTheDocument();
  });

  it("syncs the html lang attribute to the active locale", async () => {
    renderApp("/fr");
    await waitFor(() => expect(document.documentElement.lang).toBe("fr"));
    expect(screen.getByRole("main", { name: "landing page" })).toBeVisible();
  });

  it("renders the landing for a trailing slash on the locale root", async () => {
    renderApp("/en/");
    expect(
      await screen.findByRole("main", { name: "landing page" }),
    ).toBeInTheDocument();
  });

  it.each(["/en/lite", "/fr/lite", "/en/lite/"])(
    "renders the flat page at %s",
    async (route) => {
      renderApp(route);
      expect(
        await screen.findByRole("main", { name: "lite page" }),
      ).toBeInTheDocument();
    },
  );

  it("renders the landing and flat page without the shared layout", async () => {
    for (const route of ["/en", "/en/lite"]) {
      const { unmount } = renderApp(route);
      expect(await screen.findAllByRole("main")).toHaveLength(1);
      expect(
        screen.queryByRole("link", { name: /Skip to content/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("redirects an unsupported locale on the flat page to the default landing", async () => {
    renderApp("/de/lite");
    expect(
      await screen.findByRole("main", { name: "landing page" }),
    ).toBeInTheDocument();
  });

  it("renders the 404 page, with one skip link and main, for an unknown path", async () => {
    renderApp("/en/nope");
    expect(
      await screen.findByRole("heading", { name: /Page not found/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Skip to content/i }),
    ).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("no longer serves project detail pages", async () => {
    renderApp("/en/projects/banklite");
    expect(
      await screen.findByRole("heading", { name: /Page not found/i }),
    ).toBeInTheDocument();
  });

  it("redirects an unsupported locale on an unknown path to the default landing", async () => {
    renderApp("/de/projects/banklite");
    expect(
      await screen.findByRole("main", { name: "landing page" }),
    ).toBeInTheDocument();
  });
});
