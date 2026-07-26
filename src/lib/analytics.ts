import type { PostHog } from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";

let client: PostHog | null = null;
let initialized = false;
const pending: Array<(ph: PostHog) => void> = [];

function withClient(fn: (ph: PostHog) => void): void {
  if (client) {
    fn(client);
  } else {
    pending.push(fn);
  }
}

export function initAnalytics(): void {
  if (initialized || !KEY || typeof window === "undefined") return;
  initialized = true;
  void import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      persistence: "memory",
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
    });
    client = posthog;
    for (const fn of pending) fn(posthog);
    pending.length = 0;
  });
}

export function capturePageView(path: string): void {
  if (!initialized) return;
  withClient((ph) =>
    ph.capture("$pageview", { $current_url: window.location.origin + path }),
  );
}

export function captureEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  withClient((ph) => ph.capture(name, properties));
}

export const track = {
  contact: (channel: "email" | "github" | "linkedin") =>
    captureEvent("contact_click", { channel }),
  resumeDownload: () => captureEvent("resume_download"),
  projectLink: (
    project: string,
    target: "website" | "repo" | "case_study",
    source: "card" | "detail",
  ) => captureEvent("project_link_click", { project, target, source }),
  languageSwitch: (to: "en" | "fr") => captureEvent("language_switch", { to }),
};
