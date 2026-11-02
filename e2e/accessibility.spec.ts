import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const locales = ["en", "fr"];
const projectSlugs = (
  JSON.parse(
    readFileSync(
      new URL("../src/content/projects.json", import.meta.url),
      "utf8",
    ),
  ) as { slug: string }[]
).map((project) => project.slug);

const routes = [
  ...locales.map((locale) => `/${locale}`),
  ...locales.flatMap((locale) =>
    projectSlugs.map((slug) => `/${locale}/projects/${slug}`),
  ),
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
