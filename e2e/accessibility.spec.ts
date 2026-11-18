import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  NAMES,
  tabKey,
  enterWorld,
  main,
  openPlace,
  openPanel,
} from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join(" | ")}`,
  );
}

for (const route of [
  "/en/lite",
  "/fr/lite",
  "/en/does-not-exist",
  "/fr/introuvable",
]) {
  test(`no detectable accessibility violations: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(800);
    expect(await violations(page)).toEqual([]);
  });
}

test.describe("the 3D page", () => {
  test("no detectable violations on the loading screen, the welcome and a panel", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(page.getByRole("button", { name: NAMES.enter })).toBeVisible({
      timeout: 45_000,
    });
    expect(await violations(page)).toEqual([]);
    await page.getByRole("button", { name: NAMES.enter }).click();
    await expect(page.locator("#koi-host-question")).toBeVisible();
    await page.waitForTimeout(1200);
    expect(await violations(page)).toEqual([]);
    await openPlace(page, "experience");
    await page.waitForTimeout(1500);
    expect(await violations(page)).toEqual([]);
  });

  test("keyboard only: Enter, a card, the panel, Escape and focus return", async ({
    page,
    browserName,
  }) => {
    await page.goto("/en");
    const enter = page.getByRole("button", { name: NAMES.enter });
    await expect(enter).toBeVisible({ timeout: 45_000 });
    await expect(enter).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#koi-host-question")).toBeFocused({
      timeout: 10_000,
    });
    await page.keyboard.press(tabKey(browserName));
    const first = page
      .locator("section[aria-labelledby=koi-host-question] ul li button")
      .first();
    await expect(first).toBeFocused();
    const outline = await first.evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    expect(outline).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(openPanel(page, "about")).toBeVisible();
    await expect(
      openPanel(page, "about").locator(".koi-panel__title"),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    await expect(page.getByRole("button", { name: NAMES.ask })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#koi-host-question")).toBeFocused();
  });

  test("the controls are named in French", async ({ page }) => {
    await enterWorld(page, "/fr");
    await expect(page.getByRole("button", { name: "Nuit" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Lancer la musique|Couper la musique/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Français" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.getByRole("button", { name: /Je ne fais que regarder/ }),
    ).toBeVisible();
  });

  test("reduced motion: places open at once and the world still works", async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      ...testInfo.project.use,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await enterWorld(page);
    await openPlace(page, "projects");
    await expect(
      openPanel(page, "projects").locator("[role=tabpanel]"),
    ).toBeVisible({ timeout: 1_000 });
    await page.keyboard.press("Escape");
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    await context.close();
  });

  test("forced colours keep the controls visible", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await enterWorld(page);
    for (const name of [NAMES.night, NAMES.look])
      await expect(page.getByRole("button", { name })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
});
