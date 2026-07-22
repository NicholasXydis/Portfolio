import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/lib/i18n";
import { App } from "@/App";

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
  it("redirects the bare root to the default locale home", async () => {
    renderApp("/");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Nicholas Xydis" }),
    ).toBeInTheDocument();
  });

  it("redirects an unsupported locale to the default locale", async () => {
    renderApp("/de");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Nicholas Xydis" }),
    ).toBeInTheDocument();
  });

  it("renders a project detail page directly", async () => {
    renderApp("/en/projects/banklite");
    expect(
      await screen.findByRole("heading", { level: 1, name: /BankLite/i }),
    ).toBeInTheDocument();
  });

  it("syncs the html lang attribute to the active locale", async () => {
    renderApp("/fr");
    await waitFor(() => expect(document.documentElement.lang).toBe("fr"));
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the 404 page for an unknown path under a valid locale", async () => {
    renderApp("/en/nope");
    expect(
      await screen.findByRole("heading", { name: /Page not found/i }),
    ).toBeInTheDocument();
  });

  it("exposes a skip-to-content link and a main landmark", async () => {
    renderApp("/en");
    await screen.findByRole("heading", { level: 1, name: "Nicholas Xydis" });
    expect(
      screen.getByRole("link", { name: /Skip to content/i }),
    ).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("navigates to a project detail page when a card is clicked", async () => {
    const user = userEvent.setup();
    renderApp("/en");
    const links = await screen.findAllByRole("link", {
      name: /case study/i,
    });
    await user.click(links[0]!);
    expect(await screen.findByText(/Last updated/i)).toBeInTheDocument();
  });
});
