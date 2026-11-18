import { test, expect } from "@playwright/test";

test("a card anchor on the flat page scrolls its project into view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/lite#project-banklite", { waitUntil: "networkidle" });

  const cardTop = () =>
    page
      .locator("#project-banklite")
      .evaluate((el) => el.getBoundingClientRect().top);
  await expect.poll(cardTop, { timeout: 5000 }).toBeLessThan(200);
  expect(await cardTop()).toBeGreaterThan(-5);
});
