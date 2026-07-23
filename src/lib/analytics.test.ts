import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Analytics from "./analytics";

const capture = vi.fn();
const init = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init: (...args: unknown[]) => init(...args),
    capture: (...args: unknown[]) => capture(...args),
  },
}));

async function loadWithKey(key: string | undefined) {
  vi.resetModules();
  capture.mockClear();
  init.mockClear();
  if (key === undefined) {
    vi.stubEnv("VITE_POSTHOG_KEY", "");
  } else {
    vi.stubEnv("VITE_POSTHOG_KEY", key);
  }
  return import("./analytics");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("analytics without a key", () => {
  let mod: typeof Analytics;

  beforeEach(async () => {
    mod = await loadWithKey(undefined);
  });

  it("does not initialize posthog", () => {
    mod.initAnalytics();
    expect(init).not.toHaveBeenCalled();
  });

  it("captures nothing when uninitialized", () => {
    mod.capturePageView("/en");
    mod.captureEvent("x");
    mod.track.contact("github");
    expect(capture).not.toHaveBeenCalled();
  });
});

describe("analytics with a key", () => {
  let mod: typeof Analytics;

  beforeEach(async () => {
    mod = await loadWithKey("phc_test");
    mod.initAnalytics();
  });

  it("initializes posthog once", () => {
    mod.initAnalytics();
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith("phc_test", expect.any(Object));
  });

  it("captures pageviews with an absolute url", () => {
    mod.capturePageView("/en/projects/banklite");
    expect(capture).toHaveBeenCalledWith(
      "$pageview",
      expect.objectContaining({
        $current_url: expect.stringContaining("/en/projects/banklite"),
      }),
    );
  });

  it("captures custom events with properties", () => {
    mod.captureEvent("demo", { a: 1 });
    expect(capture).toHaveBeenCalledWith("demo", { a: 1 });
  });

  it("exposes typed track helpers for every interaction", () => {
    mod.track.contact("email");
    mod.track.resumeDownload();
    mod.track.projectLink("banklite", "repo", "card");
    mod.track.languageSwitch("fr");

    expect(capture).toHaveBeenCalledWith("contact_click", { channel: "email" });
    expect(capture).toHaveBeenCalledWith("resume_download", undefined);
    expect(capture).toHaveBeenCalledWith("project_link_click", {
      project: "banklite",
      target: "repo",
      source: "card",
    });
    expect(capture).toHaveBeenCalledWith("language_switch", { to: "fr" });
  });
});
