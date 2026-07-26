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

test.describe("CV assets", () => {
  for (const locale of ["en", "fr"] as const) {
    test(`serves the ${locale} CV wrapper with favicon and PDF embed`, async ({
      request,
    }) => {
      const wrapper = await request.get(`/cv-${locale}.html`);
      expect(wrapper.ok()).toBeTruthy();
      const html = await wrapper.text();
      expect(html).toContain('href="/favicon.svg"');
      expect(html).toContain(`src="/cv-${locale}.pdf"`);

      const pdf = await request.get(`/cv-${locale}.pdf`);
      expect(pdf.ok()).toBeTruthy();
      expect(pdf.headers()["content-type"]).toContain("pdf");
    });
  }

  test("serves the site favicon", async ({ request }) => {
    const favicon = await request.get("/favicon.svg");
    expect(favicon.ok()).toBeTruthy();
    expect(favicon.headers()["content-type"]).toContain("image");
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
