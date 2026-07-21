import { test, expect } from "@playwright/test";

test.describe("navigation", () => {
  test("redirects the root to the default locale", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Nicholas Xydis" }),
    ).toBeVisible();
  });

  test("sets the html lang attribute per locale", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.goto("/fr");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("navigates to a project detail page from the projects list", async ({
    page,
  }) => {
    await page.goto("/en/projects");
    await page
      .getByRole("link", { name: /BankLite/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/en\/projects\/banklite$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /BankLite/i }),
    ).toBeVisible();
    await expect(page.getByText("ASP.NET Core")).toBeVisible();
  });

  test("toggles language and preserves the current path", async ({ page }) => {
    await page.goto("/en/projects");
    await page.getByRole("button", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr\/projects$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Projets" }),
    ).toBeVisible();
  });

  test("external project links are safe and open in a new tab", async ({
    page,
  }) => {
    await page.goto("/en/projects/banklite");
    const liveLink = page.getByRole("link", { name: /View website/i });
    await expect(liveLink).toHaveAttribute("target", "_blank");
    await expect(liveLink).toHaveAttribute("rel", /noopener/);
    await expect(liveLink).toHaveAttribute("rel", /noreferrer/);
  });

  test("renders the bilingual 404 page for an unknown route", async ({
    page,
  }) => {
    await page.goto("/en/does-not-exist");
    await expect(
      page.getByRole("heading", { name: /Page not found/i }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Back to home/i }).click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test("skip-to-content link is the first focusable element", async ({
    page,
  }) => {
    await page.goto("/en");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /Skip to content/i });
    await expect(skipLink).toBeFocused();
  });
});
