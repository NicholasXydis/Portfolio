import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { ExperienceList } from "./ExperienceList";
import { renderWithProviders } from "@/test/render";
import type { Experience } from "@/content/schemas";

const experience: Experience = {
  slug: "acme",
  role: { en: "Engineer", fr: "Ingénieur" },
  company: { en: "Acme", fr: "Acme" },
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
    expect(screen.getByText(/Present \| Montreal, QC/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Aujourd'hui/i)).toBeInTheDocument();
  });

  it("puts the role in the heading by default", () => {
    renderWithProviders(<ExperienceList experiences={[experience]} />, {
      locale: "en",
    });
    expect(
      screen.getByRole("heading", { name: "Engineer" }),
    ).toBeInTheDocument();
  });

  it("puts the company in the heading when companyFirst is set", () => {
    renderWithProviders(
      <ExperienceList experiences={[{ ...experience, companyFirst: true }]} />,
      { locale: "en" },
    );
    expect(screen.getByRole("heading", { name: "Acme" })).toBeInTheDocument();
  });

  it("keeps the name linked but hides the buttons when showActions is off", () => {
    renderWithProviders(
      <ExperienceList experiences={[experience]} showActions={false} />,
      { locale: "en" },
    );
    expect(screen.getByRole("link", { name: "Acme" })).toHaveAttribute(
      "href",
      "https://acme.example.com",
    );
    expect(screen.queryByRole("link", { name: /Website/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /GitHub/i })).toBeNull();
  });

  it("renders a single date and no bullets for an entry without a description", () => {
    renderWithProviders(
      <ExperienceList
        experiences={[
          {
            slug: "acme-course",
            role: { en: "Course", fr: "Cours" },
            company: { en: "Acme", fr: "Acme" },
            startDate: "2024-03-01",
            endDate: "2024-03-01",
          },
        ]}
      />,
      { locale: "en" },
    );
    expect(screen.getByText("Course")).toBeInTheDocument();
    expect(screen.getByText(/Mar.*2024/)).not.toHaveTextContent("—");
    expect(screen.getAllByRole("list")).toHaveLength(1);
  });
});
