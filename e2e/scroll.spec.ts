import { test, expect, type Page } from "@playwright/test";

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test("scrolls to top entering a case study and restores on back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en", { waitUntil: "networkidle" });

  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForFunction(() => window.scrollY > 1000);
  const before = await scrollY(page);

  await page
    .getByRole("link", { name: /case study/i })
    .first()
    .click();
  await page.waitForURL(/\/projects\//);
  await expect.poll(() => scrollY(page), { timeout: 5000 }).toBeLessThan(50);

  await page.goBack();
  await page.waitForURL(/\/en$/);
  await expect
    .poll(() => scrollY(page), { timeout: 5000 })
    .toBeGreaterThan(before - 50);
});

test("in-page back link brings the clicked project to the top", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en", { waitUntil: "networkidle" });

  const firstCard = page.getByRole("link", { name: /case study/i }).first();
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.click();
  await page.waitForURL(/\/projects\//);

  await page.getByRole("link", { name: /home/i }).first().click();
  await expect.poll(() => page.url(), { timeout: 5000 }).toMatch(/#project-/);

  const cardTop = await page
    .locator("article[id^='project-']")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(cardTop).toBeGreaterThan(-5);
  expect(cardTop).toBeLessThan(80);
});
