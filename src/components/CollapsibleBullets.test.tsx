import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollapsibleBullets } from "./CollapsibleBullets";
import { renderWithProviders } from "@/test/render";

describe("CollapsibleBullets", () => {
  it("does not render a show-more button when points fit within the preview count", () => {
    renderWithProviders(<CollapsibleBullets text={"One\nTwo"} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides extra points behind a show-more toggle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CollapsibleBullets text={"One\nTwo\nThree\nFour"} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(4),
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(screen.getAllByRole("listitem")).toHaveLength(2),
    );
  });

  it("renders nothing extra for a single-line body", () => {
    renderWithProviders(<CollapsibleBullets text="Only one point" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
