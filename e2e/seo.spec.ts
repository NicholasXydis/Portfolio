import { test, expect } from "@playwright/test";

test.describe("SEO metadata", () => {
  test("home page exposes canonical and hreflang alternates", async ({
    page,
  }) => {
    await page.goto("/en");
    await expect(page).toHaveTitle(/Nicholas Xydis/);
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

  test("project detail sets a project-specific title and canonical", async ({
    page,
  }) => {
    await page.goto("/en/projects/banklite");
    await expect(page).toHaveTitle(/BankLite/);
    await expect(page.locator("link[rel='canonical']")).toHaveAttribute(
      "href",
      /\/en\/projects\/banklite$/,
    );
  });

  test("404 page is marked noindex", async ({ page }) => {
    await page.goto("/en/nope");
    await expect(page.locator("meta[name='robots']")).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("static sitemap and robots are served", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain("<loc>");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain("Sitemap:");
  });
});

test.describe("contact", () => {
  test("home shows safe contact links", async ({ page }) => {
    await page.goto("/en");
    const email = page.getByRole("link", { name: "Email", exact: true });
    await expect(email).toHaveAttribute("href", /^mailto:/);

    const github = page.getByRole("link", { name: "GitHub", exact: true });
    await expect(github).toHaveAttribute("target", "_blank");
    await expect(github).toHaveAttribute("rel", /noopener/);
  });
});
