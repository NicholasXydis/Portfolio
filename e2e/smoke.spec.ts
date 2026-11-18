import { test, expect } from "@playwright/test";
import {
  NAMES,
  PANEL_TITLES,
  PLACES,
  backToHost,
  closePlace,
  enterWorld,
  main,
  openPanel,
  openPlace,
  tagCanvas,
} from "./helpers";

const FAILED = {
  en: "The 3D world could not load right now, so here is the same content in 2D.",
  fr: "Le monde 3D n'a pas pu se charger pour le moment : voici le même contenu en 2D.",
} as const;

test.describe("smoke", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    await page.setViewportSize(
      isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    );
  });

  for (const locale of ["en", "fr"] as const) {
    test(`${locale}: Enter, the four places, close, just looking and back, day and night`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await enterWorld(page, `/${locale}`);
      for (const [i, place] of PLACES.entries()) {
        if (i > 0) await backToHost(page);
        await openPlace(page, place);
        await expect(
          openPanel(page, place).locator(".koi-panel__title"),
        ).toHaveText(PANEL_TITLES[locale][place]);
        await closePlace(page);
      }
      await backToHost(page);
      await page.getByRole("button", { name: NAMES.look }).click();
      await expect(main(page)).toHaveAttribute("data-view", "explore");
      await backToHost(page);
      const toggle = page.getByRole("button", { name: NAMES.night });
      await toggle.click();
      await expect(page.locator("html")).toHaveClass(/light/, {
        timeout: 5_000,
      });
      await expect(toggle).toHaveAttribute("aria-pressed", "false");
      await toggle.click();
      await expect(page.locator("html")).toHaveClass(/dark/, {
        timeout: 5_000,
      });
      await expect(toggle).toHaveAttribute("aria-pressed", "true");
      expect(errors).toEqual([]);
    });

    test(`${locale}: a failed world load shows the 2D content in place`, async ({
      page,
    }) => {
      await page.route("**/worlds/**", (route) => route.abort());
      await page.goto(`/${locale}`);
      const note = page.locator("[data-no-graphics] [role=note]");
      await expect(note).toContainText(FAILED[locale], { timeout: 30_000 });
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expect(page.locator("#projects")).toBeAttached();
    });
  }

  test("About lists four highlights in order", async ({ page }) => {
    await enterWorld(page);
    await openPlace(page, "about");
    const cards = openPanel(page, "about").locator(
      "section[aria-labelledby=koi-highlights] li",
    );
    await expect(cards).toHaveCount(4);
    for (const [i, name] of [
      /Concordia/,
      /Centre D.Auto Allard/,
      /QUARCC Purple/,
      /Stage/,
    ].entries())
      await expect(cards.nth(i)).toContainText(name);
  });

  test("the language switch on the landing keeps the world and the place", async ({
    page,
  }) => {
    await enterWorld(page);
    const canvas = await tagCanvas(page);
    await openPlace(page, "projects");
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr$/);
    await expect(
      openPanel(page, "projects").locator(".koi-panel__title"),
    ).toHaveText(PANEL_TITLES.fr.projects);
    expect(await tagCanvas(page)).toBe(canvas);
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    expect(await tagCanvas(page)).toBe(canvas);
  });

  test("the 2D link and Back return to the same world", async ({ page }) => {
    await enterWorld(page);
    await page.getByRole("button", { name: NAMES.look }).click();
    const canvas = await tagCanvas(page);
    await page.getByRole("link", { name: NAMES.flat }).first().click();
    await expect(page).toHaveURL(/\/en\/lite$/);
    await page.goBack();
    await expect(main(page)).toHaveAttribute("data-phase", "entered");
    await expect(page.getByTestId("loading-screen")).toHaveCount(0);
    expect(await tagCanvas(page)).toBe(canvas);
  });

  test("the language switch on the 2D page keeps the page and its place", async ({
    page,
  }) => {
    await page.goto("/en/lite#projects");
    await page.waitForTimeout(800);
    const before = await page.evaluate(() => {
      const el = document.getElementById("projects") as
        (HTMLElement & { __probe?: number }) | null;
      if (el) el.__probe = 7;
      return Math.round(el?.getBoundingClientRect().top ?? 9999);
    });
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr\/lite/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => {
      const el = document.getElementById("projects") as
        (HTMLElement & { __probe?: number }) | null;
      return {
        same: el?.__probe === 7,
        top: Math.round(el?.getBoundingClientRect().top ?? 9999),
      };
    });
    expect(after.same, "the section was remounted").toBe(true);
    expect(Math.abs(after.top - before)).toBeLessThanOrEqual(80);
  });

  test("music waits for a gesture in 3D and for the radio in 2D", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __plays: number };
      w.__plays = 0;
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (
        this: AudioBufferSourceNode,
        ...args: Parameters<AudioBufferSourceNode["start"]>
      ) {
        if (this.buffer && this.buffer.duration > 2) w.__plays++;
        return start.apply(this, args);
      };
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        w.__plays++;
        return play.call(this);
      };
    });
    const plays = () =>
      page.evaluate(() => (window as unknown as { __plays: number }).__plays);
    await page.goto("/en/lite");
    await page.waitForTimeout(1200);
    expect(await plays()).toBe(0);
    await page.locator(".koi-radio__button").first().click();
    await expect.poll(plays).toBeGreaterThan(0);
    await page.goto("/en");
    await expect(page.getByRole("button", { name: NAMES.enter })).toBeVisible({
      timeout: 45_000,
    });
    expect(await plays()).toBe(0);
    await page.getByRole("button", { name: NAMES.enter }).click();
    await expect.poll(plays).toBeGreaterThan(0);
  });

  test("reduced motion: a place opens at once", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await enterWorld(page);
    await openPlace(page, "experience");
    await expect(
      openPanel(page, "experience").locator("li").first(),
    ).toBeVisible({ timeout: 1_000 });
    await page.keyboard.press("Escape");
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    await context.close();
  });
});
