import { test, expect } from "@playwright/test";
import {
  NAMES,
  PLACES,
  collectErrors,
  horizontalOverflow,
  hostCard,
  insideViewport,
  openPlace,
  smallestText,
} from "./helpers";

const BYLINE = ".koi-brand--scene .koi-brand__by";

const viewports = [
  { name: "old-small-phone", width: 320, height: 568 },
  { name: "small-android", width: 360, height: 740 },
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-15", width: 390, height: 844 },
  { name: "pixel-7", width: 412, height: 915 },
  { name: "iphone-15-pro-max", width: 430, height: 932 },
  { name: "iphone-se-landscape", width: 667, height: 375 },
  { name: "iphone-landscape", width: 844, height: 390 },
  { name: "small-phone-landscape", width: 568, height: 320 },
  { name: "iphone-se-landscape-bar", width: 667, height: 320 },
  { name: "iphone-landscape-bar", width: 844, height: 340 },
  { name: "ipad-mini", width: 768, height: 1024 },
  { name: "ipad-mini-landscape", width: 1024, height: 768 },
  { name: "ipad-pro", width: 1024, height: 1366 },
  { name: "ipad-pro-landscape", width: 1366, height: 1024 },
  { name: "tablet-landscape-short", width: 1024, height: 600 },
  { name: "narrow-desktop", width: 900, height: 700 },
  { name: "short-laptop", width: 1280, height: 600 },
  { name: "small-laptop", width: 1280, height: 720 },
  { name: "laptop", width: 1366, height: 768 },
  { name: "macbook", width: 1440, height: 900 },
  { name: "laptop-125", width: 1536, height: 864 },
  { name: "full-hd", width: 1920, height: 1080 },
  { name: "qhd", width: 2560, height: 1440 },
  { name: "ultrawide", width: 3440, height: 1440 },
];

for (const vp of viewports) {
  const phone = vp.width < 760 || vp.height < 500;

  test(`2D page @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/en/lite", { waitUntil: "networkidle" });
    expect(
      await horizontalOverflow(page),
      "horizontal overflow",
    ).toBeLessThanOrEqual(1);
    if (phone)
      expect((await smallestText(page)).size).toBeGreaterThanOrEqual(12);
    expect(errors, errors.join(" | ")).toHaveLength(0);
  });

  test(`3D page @ ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/en");
    const enter = page.getByRole("button", { name: NAMES.enter });
    await expect(enter).toBeVisible({ timeout: 45_000 });
    await expect(enter).toBeInViewport({ ratio: 1 });
    await enter.click();
    await expect(page.locator("#koi-host-question")).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(1000);
    for (const place of PLACES)
      await expect(hostCard(page, place)).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: NAMES.look })).toBeInViewport(
      { ratio: 1 },
    );
    expect(await insideViewport(page, "header button, header a")).toEqual([]);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    if (phone) {
      const small = await smallestText(page, "main", BYLINE);
      expect(small.size, small.sample).toBeGreaterThanOrEqual(12);
      const byline = await page
        .locator(BYLINE)
        .evaluateAll((els) =>
          els
            .filter((el) => el.getClientRects().length > 0)
            .map((el) => parseFloat(getComputedStyle(el).fontSize)),
        );
      for (const size of byline) expect(size).toBeGreaterThanOrEqual(11);
    }
    await openPlace(page, "projects");
    await page.waitForTimeout(1600);
    expect(
      await insideViewport(
        page,
        "[data-panel] .koi-panel__close, [data-panel] [role=tab]",
      ),
    ).toEqual([]);
    expect(errors, errors.join(" | ")).toHaveLength(0);
  });
}
