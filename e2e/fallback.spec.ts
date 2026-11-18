import { test, expect } from "@playwright/test";
import { collectErrors, horizontalOverflow } from "./helpers";

test.describe("without real graphics", () => {
  for (const locale of ["en", "fr"] as const) {
    test(`/${locale} shows the 2D content in place with a note`, async ({
      page,
    }) => {
      const errors = collectErrors(page);
      await page.goto(`/${locale}`);
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      const note = page.locator("[data-no-graphics] [role=note]");
      await expect(note).toBeVisible();
      await expect(note).toHaveText(
        locale === "en"
          ? "This device can’t show the 3D world, so here is the same content in 2D."
          : "Cet appareil ne peut pas afficher le monde 3D : voici le même contenu en 2D.",
      );
      await expect(page.locator("#projects")).toBeAttached();
      await expect(page.locator("main canvas")).toHaveCount(0);
      const worldRequests = await page.evaluate(
        () =>
          performance
            .getEntriesByType("resource")
            .filter((e) => /\/worlds\/|three-|world-/.test(e.name)).length,
      );
      expect(worldRequests).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test("?soft=1 forces the 3D world on software graphics", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/en?soft=1");
    await expect(page.locator("main#main-content")).toHaveAttribute(
      "data-phase",
      /ready|entered/,
      { timeout: 60_000 },
    );
    await expect(page.locator("[data-no-graphics]")).toHaveCount(0);
    await expect(page.locator("main canvas")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Enter the world" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("held sideways, the in-place 2D page shows its note and name on the first screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 340 });
    await page.goto("/en");
    await expect(page.locator("[data-no-graphics] [role=note]")).toBeInViewport(
      { ratio: 1 },
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test("the 3D link is hidden on the in-place 2D page", async ({ page }) => {
    await page.goto("/en");
    const pills = page.locator("[data-no-graphics] .lite-world-pill");
    await expect(pills.first()).toBeAttached();
    for (const pill of await pills.all()) await expect(pill).toBeHidden();
  });
});
