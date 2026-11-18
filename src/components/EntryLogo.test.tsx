import { describe, expect, it } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { EntryLogo } from "./EntryLogo";

describe("EntryLogo", () => {
  it("renders nothing when no src is provided", () => {
    const { container } = render(<EntryLogo />);
    expect(container).toBeEmptyDOMElement();
  });

  it("puts a transparent mark on the ink tile with room around it", () => {
    const { container } = render(
      <EntryLogo src="/project-icons/banklite.ico" />,
    );
    const tile = container.firstElementChild;
    const img = container.querySelector("img");
    expect(tile).toHaveAttribute("data-koi-theme", "dark");
    expect(tile).toHaveClass("p-[6px]");
    expect(img).toHaveAttribute("src", "/project-icons/banklite.ico");
    expect(img).toHaveClass("object-contain");
    expect(img).toHaveAttribute("aria-hidden", "true");
  });

  it("lets a logo with its own solid square fill the tile", () => {
    const { container } = render(
      <EntryLogo src="/project-icons/quarcc-purple.svg" />,
    );
    expect(container.firstElementChild).not.toHaveClass("p-[6px]");
    expect(container.querySelector("img")).toHaveClass("object-cover");
  });

  it("hides itself when the image fails to load", () => {
    const { container } = render(<EntryLogo src="/missing.png" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container).toBeEmptyDOMElement();
  });
});
