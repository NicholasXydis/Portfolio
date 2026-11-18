import { test, expect } from "@playwright/test";
import { tabKey } from "./helpers";

test.describe("navigation", () => {
  test("redirects the root to the default locale", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
  });

  test("an unsupported locale goes to the default locale", async ({ page }) => {
    await page.goto("/de");
    await expect(page).toHaveURL(/\/en$/);
  });

  test("sets the html lang attribute per locale", async ({ page }) => {
    await page.goto("/en/lite");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.goto("/fr/lite");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("a project card on the flat page is an anchor target", async ({
    page,
  }) => {
    await page.goto("/en/lite#project-banklite");
    const card = page.locator("#project-banklite");
    await expect(card).toBeVisible();
    await expect(
      card.getByRole("heading", { name: /BankLite/i }),
    ).toBeVisible();
    await expect(card.getByText("C#", { exact: true })).toBeVisible();
  });

  test("toggles language and preserves the current path", async ({ page }) => {
    await page.goto("/en/lite");
    await page.getByRole("link", { name: "Français" }).click();
    await expect(page).toHaveURL(/\/fr\/lite$/);
  });

  test("external project links are safe and open in a new tab", async ({
    page,
  }) => {
    await page.goto("/en/lite");
    const liveLink = page
      .locator("#project-banklite")
      .getByRole("link", { name: /Website/i });
    await expect(liveLink).toHaveAttribute("target", "_blank");
    await expect(liveLink).toHaveAttribute("rel", /noopener/);
    await expect(liveLink).toHaveAttribute("rel", /noreferrer/);
  });

  for (const locale of ["en", "fr"] as const) {
    test(`renders the 404 page for an unknown route: ${locale}`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/does-not-exist`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        locale === "en" ? "Page not found" : "Page introuvable",
      );
      await expect(
        page.getByRole("link", {
          name: locale === "en" ? /View the 2D version/ : /Voir la version 2D/,
        }),
      ).toHaveAttribute("href", `/${locale}/lite`);
      await page
        .getByRole("link", {
          name: locale === "en" ? /Open the 3D world/ : /Ouvrir le monde 3D/,
        })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    });
  }

  test("skip-to-content link is the first focusable element on the 2D page", async ({
    page,
    browserName,
  }) => {
    await page.goto("/en/lite");
    await page.keyboard.press(tabKey(browserName));
    await expect(
      page.getByRole("link", { name: /Skip to content/i }),
    ).toBeFocused();
  });
});
