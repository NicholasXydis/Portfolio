import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Footer } from "./Footer";
import { renderWithProviders } from "@/test/render";
import { SITE_NAME } from "@/lib/site";

describe("Footer", () => {
  it("shows the copyright with the current year and site name", () => {
    renderWithProviders(<Footer />, { locale: "en" });
    const year = new Date().getFullYear().toString();
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent(`© ${year}`);
    expect(footer).toHaveTextContent(SITE_NAME);
    expect(footer).toHaveTextContent("All rights reserved");
  });

  it("localizes the rights text in French", () => {
    renderWithProviders(<Footer />, { locale: "fr" });
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Tous droits réservés",
    );
  });
});
