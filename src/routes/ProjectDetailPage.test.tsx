import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { ProjectDetailPage } from "./ProjectDetailPage";
import { renderWithProviders } from "@/test/render";

describe("ProjectDetailPage", () => {
  it("renders a real project from validated content", () => {
    renderWithProviders(<ProjectDetailPage />, {
      route: "/en/projects/banklite",
      path: "/:locale/projects/:slug",
    });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /BankLite/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("C#")).toBeInTheDocument();
  });

  it("shows the 404 page for an unknown slug", () => {
    renderWithProviders(<ProjectDetailPage />, {
      route: "/en/projects/does-not-exist",
      path: "/:locale/projects/:slug",
    });
    expect(
      screen.getByRole("heading", { name: /Page not found/i }),
    ).toBeInTheDocument();
  });
});
