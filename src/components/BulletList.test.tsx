import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BulletList } from "./BulletList";

describe("BulletList", () => {
  it("filters out blank lines", () => {
    render(<BulletList text={"First point\n\n\nSecond point"} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("bolds a leading label when the line matches Label: rest", () => {
    render(<BulletList text="Scale: handles high concurrency" />);
    expect(screen.getByText("Scale:")).toBeInTheDocument();
    expect(screen.getByText("Scale:").tagName).toBe("STRONG");
  });

  it("renders a plain line unchanged when there is no label pattern", () => {
    render(<BulletList text="Just a plain sentence with no colon" />);
    expect(
      screen.getByText("Just a plain sentence with no colon"),
    ).toBeInTheDocument();
  });

  it("does not treat an overly long prefix as a label", () => {
    const longPrefix =
      "This is a very long clause that exceeds forty characters before the colon: rest";
    const { container } = render(<BulletList text={longPrefix} />);
    expect(container.querySelector("strong")).not.toBeInTheDocument();
    expect(screen.getByText(longPrefix)).toBeInTheDocument();
  });

  it("renders an empty list when given only blank lines", () => {
    render(<BulletList text={"\n\n"} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
