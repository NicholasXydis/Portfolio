import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { I18nextProvider } from "react-i18next";
import { render } from "@testing-library/react";
import { LanguageToggle } from "./LanguageToggle";
import { renderWithProviders } from "@/test/render";
import i18n from "@/lib/i18n";

function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location">{location.pathname + location.search}</div>
  );
}

function renderWithLocationDisplay(initialRoute: string) {
  void i18n.changeLanguage("en");
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/:locale/*"
            element={
              <>
                <LanguageToggle />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe("LanguageToggle", () => {
  it("shows a single toggle labelled with the target language and its label", () => {
    renderWithProviders(<LanguageToggle />, { locale: "en" });
    const button = screen.getByRole("button", { name: "Français" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("FR");
  });

  it("targets English when the active locale is French", () => {
    renderWithProviders(<LanguageToggle />, { locale: "fr" });
    const button = screen.getByRole("button", { name: "English" });
    expect(button).toHaveTextContent("EN");
  });

  it("switches the URL locale while preserving the path", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageToggle />, {
      route: "/en/projects",
      path: "/:locale/*",
    });

    await user.click(screen.getByRole("button", { name: "Français" }));

    expect(
      await screen.findByRole("button", { name: "English" }),
    ).toBeInTheDocument();
  });

  it("preserves the query string when switching locale", async () => {
    const user = userEvent.setup();
    renderWithLocationDisplay("/en/projects?ref=card");

    await user.click(screen.getByRole("button", { name: "Français" }));

    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/fr/projects?ref=card",
    );
  });

  it("preserves an unknown path when switching locale from a 404 route", async () => {
    const user = userEvent.setup();
    renderWithLocationDisplay("/en/this-page-does-not-exist");

    await user.click(screen.getByRole("button", { name: "Français" }));

    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/fr/this-page-does-not-exist",
    );
  });
});
