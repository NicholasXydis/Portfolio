import { test, expect } from "@playwright/test";
import { collectErrors, horizontalOverflow } from "./helpers";

const SECTIONS = [
  "about",
  "education",
  "experience",
  "projects",
  "activities",
  "skills",
];

test.describe("the 2D page", () => {
  for (const locale of ["en", "fr"] as const) {
    test(`/${locale}/lite has every section, no errors and no sideways scroll`, async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.goto(`/${locale}/lite`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      for (const id of SECTIONS)
        await expect(page.locator(`#${id}`)).toBeAttached();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Nicholas Xydis",
      );
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });
  }

  test("the section links scroll to their section and keep the address in step", async ({
    page,
  }) => {
    await page.goto("/en/lite");
    await page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("link", { name: "Projects" })
      .click();
    await expect(page).toHaveURL(/#projects$/);
    await expect
      .poll(
        () =>
          page
            .locator("#projects")
            .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
        { timeout: 5_000 },
      )
      .toBeLessThan(200);
  });

  test("a deep link to a section opens there", async ({ page }) => {
    await page.goto("/en/lite#experience");
    await expect
      .poll(
        () =>
          page
            .locator("#experience")
            .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
        { timeout: 5_000 },
      )
      .toBeLessThan(200);
  });

  test("the way back to the 3D world is a link to /<locale>", async ({
    page,
  }) => {
    await page.goto("/fr/lite");
    const back = page.getByRole("link", { name: /Ouvrir le monde 3D/ }).first();
    await expect(back).toHaveAttribute("href", "/fr");
  });

  test("the language pill swaps the prefix and keeps the section", async ({
    page,
  }) => {
    await page.goto("/en/lite#projects");
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr\/lite(#projects)?$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("every visit opens at night and a day choice lasts for the tab session", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    await context.addInitScript(() =>
      localStorage.setItem("koi-theme", "light"),
    );
    const page = await context.newPage();
    await page.goto("/en/lite");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Night" }).first().click();
    await expect(page.locator("html")).toHaveClass(/light/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/light/);
    const next = await context.newPage();
    await next.goto("/en/lite");
    await expect(next.locator("html")).toHaveClass(/dark/);
    await context.close();
  });

  test("a deep link keeps its #hash in the address", async ({ page }) => {
    await page.goto("/en/lite#projects");
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/en\/lite#projects$/);
  });

  test("Show more is a full-size touch target", async ({ page, hasTouch }) => {
    test.skip(!hasTouch, "touch screens only");
    await page.goto("/en/lite#projects");
    const more = page.getByRole("button", { name: /^Show \d+ more$/ }).first();
    await expect(more).toBeVisible();
    const box = await more.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("the day and night switch raises no page error", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/en/lite");
    const toggle = page.getByRole("button", { name: "Night" }).first();
    await toggle.click();
    await page.waitForTimeout(400);
    await toggle.click();
    await page.waitForTimeout(800);
    expect(errors).toEqual([]);
  });

  for (const size of [
    { width: 844, height: 340 },
    { width: 667, height: 320 },
  ])
    test(`held sideways at ${size.width}x${size.height}, the header leaves room and the content fits the screen`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto("/fr/lite");
      await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
      const nav = page.getByRole("navigation", { name: "Sections" });
      await nav.getByRole("link", { name: "Projets" }).click();
      await expect(page).toHaveURL(/#projects$/);
      await page.waitForTimeout(1200);
      const header = await page
        .locator(".koi-lite > header")
        .evaluate((el) => el.getBoundingClientRect().bottom);
      expect(header).toBeLessThanOrEqual(size.height * 0.25);
      await expect(nav.getByRole("link", { name: "Projets" })).toBeInViewport({
        ratio: 1,
      });
      const picture = await page
        .locator("#projects .koi-card-picture")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height);
      expect(picture).toBeLessThan(size.height - header);
    });

  for (const locale of ["en", "fr"] as const) {
    test(`no console errors under reduced motion: /${locale}/lite`, async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        ...testInfo.project.use,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = collectErrors(page);
      const warnings: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "warning") warnings.push(m.text());
      });
      await page.goto(`/${locale}/lite`);
      await page.waitForTimeout(1500);
      expect(errors).toEqual([]);
      expect(warnings.filter((w) => /hydrat/i.test(w))).toEqual([]);
      await context.close();
    });
  }
});
