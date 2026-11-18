import {
  act,
  cleanup,
  configure,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from "vitest";
import i18n from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { WorldLanding } from "@/features/world/WorldLanding";
import { dropKept } from "@/features/world/keepAlive";
import type { CreateWorld, World, WorldOptions } from "@/features/world/types";
import { HistoryButtons, Where } from "./routeProbe";

configure({ asyncUtilTimeout: 4000 });

export type User = ReturnType<typeof userEvent.setup>;

export interface Harness {
  world: World & { setView: ReturnType<typeof vi.fn> };
  options: () => WorldOptions;
  load: () => Promise<CreateWorld>;
}

export function harness(): Harness {
  let captured: WorldOptions | null = null;
  const world = {
    setView: vi.fn(),
    setMode: vi.fn(() => Promise.resolve()),
    resize: vi.fn(),
    markers: vi.fn(() => [
      { view: "about", x: 100, y: 100, visible: true, line: 22 },
      { view: "experience", x: 200, y: 200, visible: true },
      { view: "projects", x: 300, y: 100, visible: true },
      { view: "education", x: 50, y: 150, visible: true },
    ]),
    onFrame: vi.fn(() => () => {}),
    info: { moonPhase: 0.5, season: "autumn", triangles: 0 },
    dispose: vi.fn(),
  } as unknown as Harness["world"];
  const createWorld: CreateWorld = (_canvas, options) => {
    captured = options;
    options.onProgress?.(0.5);
    return Promise.resolve(world);
  };
  return {
    world,
    options: () => {
      if (!captured) throw new Error("createWorld not called");
      return captured;
    },
    load: () => Promise.resolve(createWorld),
  };
}

const clock = globalThis as {
  jest?: { advanceTimersByTime(ms: number): void };
};

export function setUpWorldLanding() {
  beforeAll(() => {
    vi.useFakeTimers();
    clock.jest = {
      advanceTimersByTime: (ms) => vi.advanceTimersByTime(ms),
    };
  });
  afterAll(() => {
    delete clock.jest;
    vi.useRealTimers();
  });
  beforeEach(() => {
    dropKept();
    window.localStorage?.clear?.();
  });
  afterEach(() => {
    cleanup();
  });
}

export function renderLanding(
  load: () => Promise<CreateWorld>,
  locale: Locale = "en",
) {
  const user = userEvent.setup({
    advanceTimers: (ms) => vi.advanceTimersByTime(ms),
  });
  void i18n.changeLanguage(locale);
  const view = render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[`/${locale}`]}>
        <Routes>
          <Route path="/:locale" element={<WorldLanding load={load} />} />
          <Route path="/:locale/lite" element={<p>flat page</p>} />
        </Routes>
        <Where />
        <HistoryButtons />
      </MemoryRouter>
    </I18nextProvider>,
  );
  return { ...view, user };
}

export async function wait(ms: number) {
  for (let left = ms; left > 0; left -= 50)
    await act(() => vi.advanceTimersByTimeAsync(Math.min(50, left)));
}

export async function enter(
  user: User,
  names: { enter: string; question: RegExp } = {
    enter: "Enter the world",
    question: /what brings you in/i,
  },
) {
  const button = await screen.findByRole("button", { name: names.enter });
  await waitFor(() => expect(button).toHaveFocus());
  await user.click(button);
  const question = await screen.findByRole("heading", {
    name: names.question,
  });
  await waitFor(() => expect(question).toHaveFocus());
}
