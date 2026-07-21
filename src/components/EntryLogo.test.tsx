import { describe, expect, it } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { EntryLogo } from "./EntryLogo";

describe("EntryLogo", () => {
  it("renders nothing when no src is provided", () => {
    const { container } = render(<EntryLogo />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a decorative image that fills the square", () => {
    const { container } = render(
      <EntryLogo src="/project-icons/banklite.ico" />,
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/project-icons/banklite.ico");
    expect(img).toHaveClass("object-cover");
    expect(img).toHaveAttribute("aria-hidden", "true");
  });

  it("hides itself when the image fails to load", () => {
    const { container } = render(<EntryLogo src="/missing.png" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container).toBeEmptyDOMElement();
  });
});
