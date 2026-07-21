import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";

vi.mock("@/content", () => ({ projects: [] }));

const { ProjectsPage } = await import("./ProjectsPage");

describe("ProjectsPage (empty state)", () => {
  it("shows the empty message when there are no projects", () => {
    renderWithProviders(<ProjectsPage />, { locale: "en" });
    expect(
      screen.getByRole("heading", { level: 1, name: "Projects" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No projects to show yet.")).toBeInTheDocument();
  });

  it("localizes the empty message to French", () => {
    renderWithProviders(<ProjectsPage />, { locale: "fr" });
    expect(
      screen.getByText("Aucun projet à afficher pour le moment."),
    ).toBeInTheDocument();
  });
});
