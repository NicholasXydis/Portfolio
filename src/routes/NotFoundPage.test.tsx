import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { NotFoundPage } from "./NotFoundPage";
import { renderWithProviders } from "@/test/render";

describe("NotFoundPage", () => {
  it("shows the code, a title and two ways on, with the pond as a picture only", () => {
    renderWithProviders(<NotFoundPage />, { locale: "en" });
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open the 3D world" }),
    ).toHaveAttribute("href", "/en");
    expect(
      screen.getByRole("link", { name: "View the 2D version" }),
    ).toHaveAttribute("href", "/en/lite");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("keeps the language pill and stays out of search results", async () => {
    renderWithProviders(<NotFoundPage />, { locale: "en" });
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, follow",
      ),
    );
  });

  it("localizes to French", () => {
    renderWithProviders(<NotFoundPage />, { locale: "fr" });
    expect(
      screen.getByRole("heading", { name: "Page introuvable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ouvrir le monde 3D" }),
    ).toHaveAttribute("href", "/fr");
    expect(
      screen.getByRole("link", { name: "Voir la version 2D" }),
    ).toHaveAttribute("href", "/fr/lite");
  });
});
