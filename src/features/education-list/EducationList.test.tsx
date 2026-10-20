import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { EducationList } from "./EducationList";
import { renderWithProviders } from "@/test/render";
import type { Education } from "@/content/schemas";

const education: Education = {
  slug: "mcgill",
  institution: { en: "McGill University", fr: "Université McGill" },
  institutionUrl: "https://www.mcgill.ca",
  credential: { en: "B.Sc. Computer Science", fr: "B.Sc. Informatique" },
  field: { en: "Software", fr: "Logiciel" },
  startDate: "2020-09-01",
  endDate: "2024-05-01",
};

describe("EducationList", () => {
  it("renders the empty state when there is no education", () => {
    renderWithProviders(<EducationList educations={[]} />, { locale: "en" });
    expect(screen.getByText(/No education to show/i)).toBeInTheDocument();
  });

  it("renders the institution link and localized credential", () => {
    renderWithProviders(<EducationList educations={[education]} />, {
      locale: "en",
    });
    expect(
      screen.getByRole("link", { name: "McGill University" }),
    ).toHaveAttribute("href", "https://www.mcgill.ca");
    expect(
      screen.getByText(/B\.Sc\. Computer Science · Software/),
    ).toBeInTheDocument();
  });

  it("localizes the credential to French", () => {
    renderWithProviders(<EducationList educations={[education]} />, {
      locale: "fr",
    });
    expect(
      screen.getByText(/B\.Sc\. Informatique · Logiciel/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Université McGill" }),
    ).toBeInTheDocument();
  });

  it("shows the expected graduation year for a future end date", () => {
    const upcoming = { ...education, endDate: "2099-05-01" };
    renderWithProviders(<EducationList educations={[upcoming]} />, {
      locale: "en",
    });
    expect(screen.getByText(/Expected 2099/)).toBeInTheDocument();
  });

  it("localizes the expected graduation year to French", () => {
    const upcoming = { ...education, endDate: "2099-05-01" };
    renderWithProviders(<EducationList educations={[upcoming]} />, {
      locale: "fr",
    });
    expect(screen.getByText(/Prévu en 2099/)).toBeInTheDocument();
  });
});
