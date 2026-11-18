import { test, expect } from "@playwright/test";
import {
  NAMES,
  PANEL_TITLES,
  PLACES,
  audioStarts,
  backToHost,
  closePlace,
  collectErrors,
  currentView,
  enterWorld,
  hostCard,
  main,
  openPanel,
  openPlace,
  tagCanvas,
  waitForWorld,
} from "./helpers";

test.describe("the 3D world", () => {
  test("loads, shows Enter, and the host asks after Enter", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto("/en");
    await expect(page.getByTestId("loading-screen")).toBeVisible();
    await waitForWorld(page);
    const enter = page.getByRole("button", { name: NAMES.enter });
    await expect(enter).toBeVisible();
    await expect(enter).toBeInViewport();
    await enter.click();
    await expect(page.locator("#koi-host-question")).toHaveText(
      "Welcome. What brings you in?",
    );
    await expect(page.locator("#koi-host-question")).toBeFocused();
    for (const place of PLACES)
      await expect(hostCard(page, place)).toBeInViewport({ ratio: 1 });
    expect(errors).toEqual([]);
  });

  test("every card opens its place, and Close returns to the island", async ({
    page,
  }) => {
    await enterWorld(page);
    for (const [i, place] of PLACES.entries()) {
      if (i > 0) await backToHost(page);
      await openPlace(page, place);
      await expect(
        openPanel(page, place).locator(".koi-panel__title"),
      ).toHaveText(PANEL_TITLES.en[place]);
      await expect(
        openPanel(page, place).locator(".koi-panel__title"),
      ).toBeFocused();
      await closePlace(page);
    }
  });

  test("Back closes an open place and Forward reopens it, on the same address", async ({
    page,
  }) => {
    await enterWorld(page);
    const address = page.url();
    await openPlace(page, "about");
    expect(page.url()).toBe(address);
    await page.goBack();
    await expect(main(page)).toHaveAttribute("data-view", "welcome");
    await expect(page.locator("[data-panel]")).toHaveCount(0);
    await page.goForward();
    await expect(openPanel(page, "about")).toBeVisible();
  });

  test("Escape leaves a place for explore and focuses the toolbar", async ({
    page,
  }) => {
    await enterWorld(page);
    await openPlace(page, "experience");
    await page.keyboard.press("Escape");
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    await expect(page.getByRole("button", { name: NAMES.ask })).toBeFocused();
  });

  test("Escape on an enlarged project picture closes only the picture and gives it focus back", async ({
    page,
  }) => {
    await enterWorld(page);
    await openPlace(page, "projects");
    const picture = openPanel(page, "projects")
      .getByRole("button", { name: /^Open the picture of/ })
      .first();
    await picture.click();
    const viewer = page.locator("dialog[open]");
    await expect(viewer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(main(page)).toHaveAttribute("data-view", "projects");
    await expect(openPanel(page, "projects")).toBeVisible();
    await expect(picture).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(main(page)).toHaveAttribute("data-view", "explore");
  });

  test("Just looking around goes to explore, the markers open places, and the brand returns to explore", async ({
    page,
  }) => {
    await enterWorld(page);
    await page.getByRole("button", { name: NAMES.look }).click();
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    const marker = page.locator("[data-place=education]");
    await expect(marker).toHaveAttribute("data-onscreen", "true");
    await marker.click();
    await expect(openPanel(page, "education")).toBeVisible();
    await page.getByRole("button", { name: NAMES.brand }).click();
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    await backToHost(page);
  });

  test("the place pins hold still with a still camera, and each pin has one dot", async ({
    page,
  }) => {
    await enterWorld(page);
    await page.getByRole("button", { name: NAMES.look }).click();
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    await page.waitForTimeout(2500);
    const read = () =>
      page.evaluate(() => {
        const w = (window as unknown as { __world?: { markers(): unknown } })
          .__world;
        return w ? w.markers() : null;
      });
    const first = await read();
    await page.waitForTimeout(1000);
    const second = await read();
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    for (const place of ["about", "education", "experience", "projects"]) {
      await expect(
        page.locator(`[data-place=${place}] [data-marker-tip]`),
      ).toHaveCount(1);
    }
    await expect(page.locator("[data-marker-dot]")).toHaveCount(0);
  });

  test("the projects panel has working tabs", async ({ page }) => {
    await enterWorld(page);
    await openPlace(page, "projects");
    const skills = page.getByRole("tab", { name: "Skills" });
    await expect(skills).toBeVisible();
    await skills.click();
    await expect(skills).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab", { name: "Projects" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("day and night switch at the welcome, in a place and in explore", async ({
    page,
  }) => {
    await enterWorld(page);
    const toggle = page.getByRole("button", { name: NAMES.night });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/light/);
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await openPlace(page, "about");
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(openPanel(page, "about")).toBeVisible();
    await closePlace(page);
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/light/);
    expect(await currentView(page)).toBe("explore");
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/light/);
  });

  test("every visit opens the world at night, and a day choice lasts for the tab session", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      colorScheme: "light",
    });
    await context.addInitScript(() =>
      localStorage.setItem("koi-theme", "light"),
    );
    const page = await context.newPage();
    await enterWorld(page);
    await expect(page.locator("html")).toHaveClass(/dark/);
    const toggle = page.getByRole("button", { name: NAMES.night });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/light/);
    await expect(main(page)).not.toHaveClass(/koi-theming/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/light/);
    await waitForWorld(page);
    await expect(page.locator("html")).toHaveClass(/light/);
    const next = await context.newPage();
    await next.goto("/en");
    await expect(next.locator("html")).toHaveClass(/dark/);
    await waitForWorld(next);
    await expect(next.locator("html")).toHaveClass(/dark/);
    await context.close();
  });

  test("the language switch keeps the world, the view and the theme", async ({
    page,
  }) => {
    await enterWorld(page);
    const canvas = await tagCanvas(page);
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.locator("#koi-host-question")).toContainText("Bienvenue");
    expect(await tagCanvas(page)).toBe(canvas);
    await openPlace(page, "about");
    await expect(
      openPanel(page, "about").locator(".koi-panel__title"),
    ).toHaveText(PANEL_TITLES.fr.about);
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(
      openPanel(page, "about").locator(".koi-panel__title"),
    ).toHaveText(PANEL_TITLES.en.about);
    expect(await tagCanvas(page)).toBe(canvas);
  });

  test("the 2D link and browser Back return to the same world without a second Enter", async ({
    page,
  }) => {
    await enterWorld(page);
    await page.getByRole("button", { name: NAMES.look }).click();
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    const canvas = await tagCanvas(page);
    await page.getByRole("link", { name: NAMES.flat }).first().click();
    await expect(page).toHaveURL(/\/en\/lite$/);
    await expect(page.locator("#projects")).toBeAttached();
    await page.goBack();
    await expect(page).toHaveURL(/\/en$/);
    await expect(main(page)).toHaveAttribute("data-phase", "entered");
    await expect(page.getByTestId("loading-screen")).toHaveCount(0);
    expect(await tagCanvas(page)).toBe(canvas);
    await page.goForward();
    await expect(page).toHaveURL(/\/en\/lite$/);
  });

  test("a reload starts at the loading screen again", async ({ page }) => {
    await enterWorld(page);
    await openPlace(page, "projects");
    await page.reload();
    await waitForWorld(page);
    await expect(page.getByRole("button", { name: NAMES.enter })).toBeVisible();
    expect(await currentView(page)).toBe("welcome");
  });

  test("music never starts before a gesture, starts on Enter and the radio pauses it", async ({
    page,
    browserName,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as {
        __music: number;
        __ctxs: AudioContext[];
      };
      w.__music = 0;
      w.__ctxs = [];
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (
        this: AudioBufferSourceNode,
        ...args: Parameters<AudioBufferSourceNode["start"]>
      ) {
        if (this.buffer && this.buffer.duration > 2) w.__music++;
        return start.apply(this, args);
      };
      const Ctx = window.AudioContext;
      window.AudioContext = class extends Ctx {
        constructor(options?: AudioContextOptions) {
          super(options);
          w.__ctxs.push(this);
        }
      };
    });
    const music = () =>
      page.evaluate(() => (window as unknown as { __music: number }).__music);
    const running = () =>
      page.evaluate(() =>
        (window as unknown as { __ctxs: AudioContext[] }).__ctxs.some(
          (c) => c.state === "running",
        ),
      );
    await page.goto("/en");
    await waitForWorld(page);
    await page.waitForTimeout(1500);
    expect(await music()).toBe(0);
    expect(
      await page.evaluate(
        () => (window as unknown as { __ctxs: AudioContext[] }).__ctxs.length,
      ),
    ).toBe(0);
    await page.getByRole("button", { name: NAMES.enter }).click();
    await expect.poll(music, { timeout: 5_000 }).toBeGreaterThan(0);
    test.skip(
      browserName === "firefox" && !(await audioStarts(page)),
      "this Firefox cannot start an AudioContext on this machine",
    );
    const radio = page.locator(".koi-radio__button");
    await expect(radio).toHaveAttribute("aria-label", "Mute the music");
    await radio.click();
    await expect(radio).toHaveAttribute("aria-label", "Play the music");
    await expect.poll(running).toBe(false);
    await radio.click();
    await expect.poll(running).toBe(true);
    await expect(radio).toHaveAttribute("aria-label", "Mute the music", {
      timeout: 1_500,
    });
  });

  test("a place pops when it opens and closes, and the muted radio keeps it quiet", async ({
    page,
    browserName,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __pops: number };
      w.__pops = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (
        this: AudioBufferSourceNode,
        ...args: Parameters<AudioBufferSourceNode["start"]>
      ) {
        if (this.buffer && this.buffer.duration < 1) w.__pops++;
        return start.apply(this, args);
      };
    });
    const pops = () =>
      page.evaluate(() => (window as unknown as { __pops: number }).__pops);
    await enterWorld(page);
    test.skip(
      browserName === "firefox" && !(await audioStarts(page)),
      "this Firefox cannot start an AudioContext on this machine",
    );
    await openPlace(page, "about");
    await expect.poll(pops).toBe(1);
    await closePlace(page);
    await expect.poll(pops).toBe(2);
    const radio = page.locator(".koi-radio__button");
    await expect(radio).toHaveAttribute("aria-label", "Mute the music");
    await radio.click();
    await expect(radio).toHaveAttribute("aria-label", "Play the music");
    await backToHost(page);
    await openPlace(page, "education");
    await closePlace(page);
    await page.waitForTimeout(500);
    expect(await pops()).toBe(2);
  });

  test("a lost graphics context shows the notice and a restore removes it", async ({
    page,
  }) => {
    await enterWorld(page);
    const lost = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("main canvas");
      const gl = canvas?.getContext("webgl2") ?? canvas?.getContext("webgl");
      const ext = gl?.getExtension("WEBGL_lose_context");
      ext?.loseContext();
      (window as unknown as { __lose?: WEBGL_lose_context | null }).__lose =
        ext ?? null;
      return !!ext;
    });
    expect(lost).toBe(true);
    await expect(page.getByRole("alert")).toContainText(
      "The 3D view has stopped.",
    );
    await page.evaluate(() =>
      (
        window as unknown as { __lose: WEBGL_lose_context }
      ).__lose.restoreContext(),
    );
    await expect(page.getByRole("alert")).toHaveCount(0, { timeout: 15_000 });
  });
});
