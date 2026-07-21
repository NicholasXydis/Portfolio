import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { NotFoundPage } from "./NotFoundPage";
import { renderWithProviders } from "@/test/render";

describe("NotFoundPage", () => {
  it("renders the error code and a bilingual-aware link back to home", () => {
    renderWithProviders(<NotFoundPage />, { locale: "en" });
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Page not found/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to home/i })).toHaveAttribute(
      "href",
      "/en",
    );
  });

  it("localizes to French", () => {
    renderWithProviders(<NotFoundPage />, { locale: "fr" });
    expect(
      screen.getByRole("heading", { name: /Page introuvable/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Retour à l'accueil/i }),
    ).toHaveAttribute("href", "/fr");
  });
});
