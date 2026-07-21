import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseOrThrow } from "./parseContent";

const schema = z.array(z.object({ slug: z.string() }));

describe("parseOrThrow", () => {
  it("returns typed data when validation succeeds", () => {
    const data = parseOrThrow(schema, [{ slug: "ok" }], "items");
    expect(data).toEqual([{ slug: "ok" }]);
  });

  it("throws a labelled error when validation fails", () => {
    expect(() => parseOrThrow(schema, [{ slug: 1 }], "items")).toThrowError(
      /Invalid items content/,
    );
  });
});
