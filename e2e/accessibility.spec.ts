import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/en",
  "/fr",
  "/en/projects",
  "/fr/projects",
  "/en/projects/banklite",
  "/fr/projects/banklite",
  "/en/does-not-exist",
];

for (const route of routes) {
  test(`has no detectable accessibility violations: ${route}`, async ({
    page,
  }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("navigation stays outside the main landmark so the skip link works", async ({
  page,
}) => {
  await page.goto("/en");
  const main = page.getByRole("main");
  await expect(main).toBeVisible();
  await expect(main.getByRole("navigation")).toHaveCount(0);
});
