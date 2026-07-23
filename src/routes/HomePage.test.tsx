import { describe, expect, it } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { HomePage } from "./HomePage";
import { renderWithProviders } from "@/test/render";

describe("HomePage", () => {
  it("renders the name as the h1 and the section headings", () => {
    renderWithProviders(<HomePage />, { locale: "en" });
    expect(
      screen.getByRole("heading", { level: 1, name: "Nicholas Xydis" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Experiences" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Projects" }),
    ).toBeInTheDocument();
  });

  it("renders project cards from validated content", () => {
    renderWithProviders(<HomePage />, { locale: "en" });
    expect(screen.getByRole("link", { name: "BankLite" })).toBeInTheDocument();
  });

  it("handles a click on the resume link", () => {
    renderWithProviders(<HomePage />, { locale: "en" });
    const resume = screen.getByRole("link", { name: /resume|cv/i });
    fireEvent.click(resume);
    expect(resume).toHaveAttribute("href", "/resume.pdf");
  });
});
