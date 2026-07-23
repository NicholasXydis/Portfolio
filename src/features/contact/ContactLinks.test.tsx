import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { ContactLinks } from "./ContactLinks";
import { renderWithProviders } from "@/test/render";
import { CONTACT } from "@/lib/site";

describe("ContactLinks", () => {
  it("renders a mailto link for email without opening a new tab", () => {
    renderWithProviders(<ContactLinks />, { locale: "en" });
    const email = screen.getByRole("link", { name: /Email/i });
    expect(email).toHaveAttribute("href", `mailto:${CONTACT.email}`);
    expect(email).not.toHaveAttribute("target");
  });

  it("opens external profiles safely in a new tab", () => {
    renderWithProviders(<ContactLinks />, { locale: "en" });
    for (const name of [/GitHub/i, /LinkedIn/i]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
      expect(link).toHaveAttribute(
        "rel",
        expect.stringContaining("noreferrer"),
      );
    }
    expect(screen.getByRole("link", { name: /GitHub/i })).toHaveAttribute(
      "href",
      CONTACT.github,
    );
  });

  it("localizes the email label to French", () => {
    renderWithProviders(<ContactLinks />, { locale: "fr" });
    expect(screen.getByRole("link", { name: /Courriel/i })).toBeInTheDocument();
  });

  it("copies the email to the clipboard and confirms it on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderWithProviders(<ContactLinks />, { locale: "en" });
    fireEvent.click(screen.getByRole("link", { name: /Email/i }));

    expect(writeText).toHaveBeenCalledWith(CONTACT.email);
    expect(await screen.findByRole("status")).toBeInTheDocument();
  });

  it("handles clicks on external profiles", () => {
    renderWithProviders(<ContactLinks />, { locale: "en" });
    fireEvent.click(screen.getByRole("link", { name: /GitHub/i }));
    expect(screen.getByRole("link", { name: /GitHub/i })).toBeInTheDocument();
  });
});
