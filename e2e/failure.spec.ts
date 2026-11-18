import { test, expect, type Page } from "@playwright/test";
import { NAMES, main } from "./helpers";

const LINES = {
  en: {
    note: "The 3D world could not load right now, so here is the same content in 2D.",
    retry: "Try again",
  },
  fr: {
    note: "Le monde 3D n'a pas pu se charger pour le moment : voici le même contenu en 2D.",
    retry: "Réessayer",
  },
} as const;

async function expectFlatInPlace(page: Page, locale: "en" | "fr") {
  const note = page.locator("[data-no-graphics] [role=note]");
  await expect(note).toBeVisible({ timeout: 60_000 });
  await expect(note).toContainText(LINES[locale].note);
  await expect(page).toHaveURL(new RegExp(`/${locale}$`));
  await expect(page.locator("#projects")).toBeAttached();
  await expect(page.locator("main canvas")).toHaveCount(0);
  const canonical = page.locator("link[rel='canonical']");
  await expect(canonical).toHaveCount(1);
  await expect(canonical).toHaveAttribute("href", new RegExp(`/${locale}$`));
}

test.describe("when the world cannot load", () => {
  for (const locale of ["en", "fr"] as const) {
    test(`blocked world files show the 2D content in place, then Try again enters the 3D: ${locale}`, async ({
      page,
    }) => {
      await page.route("**/worlds/**", (route) => route.abort());
      await page.goto(`/${locale}`);
      await expectFlatInPlace(page, locale);
      const retry = page.getByRole("button", { name: LINES[locale].retry });
      await expect(retry).toBeVisible();
      await page.unroute("**/worlds/**");
      await retry.click();
      await expect(main(page)).toHaveAttribute("data-phase", /ready|entered/, {
        timeout: 45_000,
      });
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await page.getByRole("button", { name: NAMES.enter }).click();
      await expect(main(page)).toHaveAttribute("data-phase", "entered");
      await expect(page.locator("[data-no-graphics]")).toHaveCount(0);
    });
  }

  test("a failing world module shows the 2D content in place", async ({
    page,
  }) => {
    await page.route(/\/assets\/world-[^/]+\.js$/, (route) =>
      route.fulfill({ status: 500, body: "" }),
    );
    await page.goto("/en");
    await expectFlatInPlace(page, "en");
  });

  test("a failing three.js chunk shows the 2D content in place", async ({
    page,
  }) => {
    await page.route(/\/assets\/three-[^/]+\.js$/, (route) => route.abort());
    await page.goto("/en");
    await expectFlatInPlace(page, "en");
  });

  test("a missing world model shows the 2D content in place", async ({
    page,
  }) => {
    const asked = new Set<string>();
    await page.route(/\/koi\.glb(\.gz)?(\?.*)?$/, (route) => {
      asked.add(new URL(route.request().url()).pathname.replace(/.*\//, ""));
      return route.fulfill({ status: 404, body: "" });
    });
    await page.goto("/en");
    await expectFlatInPlace(page, "en");
    expect([...asked].sort()).toEqual(["koi.glb", "koi.glb.gz"]);
  });
});
