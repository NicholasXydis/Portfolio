import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TechIcon } from "./TechIcon";

describe("TechIcon", () => {
  it("renders a masked icon span for a known tech name", () => {
    const { container } = render(<TechIcon name="TypeScript" />);
    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    expect(span).toHaveStyle({
      maskImage: "url(/tech-icons/typescript.svg)",
    });
  });

  it("renders nothing for an unknown tech name", () => {
    const { container } = render(<TechIcon name="Cobol" />);
    expect(container.firstChild).toBeNull();
  });
});
