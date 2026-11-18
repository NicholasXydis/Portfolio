import { test, expect } from "@playwright/test";

test.describe("SEO metadata in the browser", () => {
  test("home page exposes canonical and hreflang alternates", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(page).toHaveTitle(
      "Nicholas Xydis | CS @ Concordia & Software Developer (3D)",
    );
    const canonical = page.locator("link[rel='canonical']");
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", /\/en$/);
    await expect(page.locator("link[hreflang='fr']")).toHaveAttribute(
      "href",
      /\/fr$/,
    );
    await expect(page.locator("link[hreflang='x-default']")).toHaveAttribute(
      "href",
      /\/en$/,
    );
  });

  test("the flat page has its own canonical", async ({ page }) => {
    await page.goto("/en/lite");
    await expect(page).toHaveTitle(
      "Nicholas Xydis | CS @ Concordia & Software Developer (2D)",
    );
    await expect(page.locator("link[rel='canonical']")).toHaveAttribute(
      "href",
      /\/en\/lite$/,
    );
  });

  test("404 page is marked noindex", async ({ page }) => {
    await page.goto("/en/nope");
    await expect(page.locator("meta[name='robots']")).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator("link[rel='canonical']")).toHaveCount(0);
  });
});

test.describe("contact", () => {
  test("the 2D page shows safe contact links", async ({ page }) => {
    await page.goto("/en/lite");
    const email = page
      .getByRole("link", { name: "Email", exact: true })
      .first();
    await expect(email).toHaveAttribute("href", /^mailto:/);
    const github = page
      .getByRole("link", { name: "GitHub", exact: true })
      .first();
    await expect(github).toHaveAttribute("target", "_blank");
    await expect(github).toHaveAttribute("rel", /noopener/);
  });
});
