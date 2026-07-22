import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { ExperienceList } from "./ExperienceList";
import { renderWithProviders } from "@/test/render";
import type { Experience } from "@/content/schemas";

const experience: Experience = {
  slug: "acme",
  role: { en: "Engineer", fr: "Ingénieur" },
  company: "Acme",
  companyUrl: "https://acme.example.com",
  location: { en: "Montreal, QC", fr: "Montréal, QC" },
  repo: "https://github.com/example/acme",
  logo: "/project-icons/banklite.ico",
  startDate: "2024-01-01",
  endDate: null,
  description: { en: "Built things", fr: "A construit des choses" },
};

describe("ExperienceList", () => {
  it("renders the empty state when there are no experiences", () => {
    renderWithProviders(<ExperienceList experiences={[]} />, { locale: "en" });
    expect(screen.getByText(/No experience to show/i)).toBeInTheDocument();
  });

  it("renders a company link, localized role, and an open-ended date range", () => {
    renderWithProviders(<ExperienceList experiences={[experience]} />, {
      locale: "en",
    });
    expect(screen.getByRole("link", { name: "Acme" })).toHaveAttribute(
      "href",
      "https://acme.example.com",
    );
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Present/i)).toBeInTheDocument();
    expect(screen.getByText("Montreal, QC")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Website/i })).toHaveAttribute(
      "href",
      "https://acme.example.com",
    );
    expect(screen.getByRole("link", { name: /GitHub/i })).toHaveAttribute(
      "href",
      "https://github.com/example/acme",
    );
  });

  it("localizes role and present label to French", () => {
    renderWithProviders(<ExperienceList experiences={[experience]} />, {
      locale: "fr",
    });
    expect(screen.getByText("Ingénieur")).toBeInTheDocument();
    expect(screen.getByText(/Présent/i)).toBeInTheDocument();
  });
});
