import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeroPhoto } from "./HeroPhoto";

describe("HeroPhoto", () => {
  it("renders the portrait with a meaningful alt", () => {
    render(<HeroPhoto />);
    expect(screen.getByRole("img", { name: "Nicholas Xydis" })).toBeVisible();
  });

  it("removes itself if the portrait file is missing", () => {
    const { container } = render(<HeroPhoto />);
    fireEvent.error(screen.getByRole("img", { name: "Nicholas Xydis" }));
    expect(container).toBeEmptyDOMElement();
  });
});
