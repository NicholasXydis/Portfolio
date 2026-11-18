import { describe, expect, it, vi } from "vitest";
import { localeOf, render } from "./entry-server";
import type * as AppModule from "@/App";

const boom = vi.hoisted(() => ({ app: false, suspended: false }));

vi.mock("@/App", async (importOriginal) => {
  const actual = await importOriginal<typeof AppModule>();
  return {
    App: () => {
      if (boom.app) throw new Error("boom");
      return <actual.App />;
    },
  };
});

vi.mock("@/routes/LandingPage", async () => {
  const { Suspense } = await import("react");
  function Inside() {
    if (boom.suspended) throw new Error("boom in suspense");
    return <main />;
  }
  return {
    LandingPage: () => (
      <Suspense fallback={null}>
        <Inside />
      </Suspense>
    ),
  };
});

describe("entry-server", () => {
  it("reads the locale from the first path segment", () => {
    expect(localeOf("/fr/lite")).toBe("fr");
    expect(localeOf("/en")).toBe("en");
    expect(localeOf("/de/x")).toBe("en");
  });

  it("renders a route to HTML in that route's language, head tags first", async () => {
    const html = await render("/fr/introuvable");
    expect(
      html.startsWith("<title>Nicholas Xydis | Page introuvable</title>"),
    ).toBe(true);
    expect(html).toContain('content="noindex, follow"');
    expect(html).toContain("<main");
  });

  it("fails the build instead of writing a broken page", async () => {
    try {
      boom.app = true;
      await expect(render("/en")).rejects.toThrow("boom");
      boom.app = false;
      boom.suspended = true;
      await expect(render("/en")).rejects.toThrow("boom in suspense");
    } finally {
      boom.app = false;
      boom.suspended = false;
    }
  });
});
