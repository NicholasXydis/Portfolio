import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageToggle } from "./LanguageToggle";
import { renderWithProviders } from "@/test/render";

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
});
