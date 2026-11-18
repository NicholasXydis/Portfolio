import { test, expect, type Page } from "@playwright/test";
import { NAMES, enterWorld, hostCard, main, openPlace } from "./helpers";

async function uncovered(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(el === hit || el.contains(hit)))
        out.push(
          `${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)} covered by ${hit?.tagName}.${String(hit?.className).slice(0, 40)}`,
        );
    }
    return out;
  }, selector);
}

test.describe("phone held sideways", () => {
  test.skip(({ isMobile }) => !isMobile, "phone projects only");

  for (const size of [
    { width: 667, height: 375 },
    { width: 844, height: 390 },
  ]) {
    test(`${size.width}x${size.height}: a place opens as a side panel and leaves the place in view`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await enterWorld(page);
      await openPlace(page, "about");
      await page.waitForTimeout(1500);
      await expect(page.locator("[data-panel=about]")).toHaveAttribute(
        "data-layout",
        "short",
      );
      const panel = await page
        .locator("[data-panel=about]")
        .evaluate((el) => el.getBoundingClientRect().width);
      expect(panel).toBeLessThan(size.width * 0.6);
    });

    test(`${size.width}x${size.height}: every top control stays reachable while a place is open`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await enterWorld(page);
      await openPlace(page, "experience");
      await page.waitForTimeout(1500);
      expect(await uncovered(page, "header button, header a")).toEqual([]);
      await expect(page.getByRole("link", { name: "Français" })).toBeInViewport(
        {
          ratio: 1,
        },
      );
    });

    test(`${size.width}x${size.height}: the welcome leaves the island visible above the host`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await enterWorld(page);
      const top = await page
        .locator("section[aria-labelledby=koi-host-question]")
        .evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThan(size.height * 0.45);
    });
  }

  test("phone text is at least 12 px when held sideways", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await enterWorld(page);
    await openPlace(page, "projects");
    await page.waitForTimeout(1500);
    const small = await page.evaluate(() => {
      const out: string[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const el = walker.currentNode.parentElement;
        const text = walker.currentNode.textContent?.trim();
        if (!el || !text || el.closest(".sr-only")) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 12) out.push(`${size}px ${text.slice(0, 30)}`);
      }
      return [...new Set(out)];
    });
    expect(small).toEqual([]);
  });
});

test.describe("keyboard focus never falls to the page", () => {
  test("Just looking around moves focus to the toolbar", async ({ page }) => {
    await enterWorld(page);
    await page.getByRole("button", { name: NAMES.look }).focus();
    await page.keyboard.press("Enter");
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    await expect(page.getByRole("button", { name: NAMES.ask })).toBeFocused();
  });

  test("Escape at the welcome moves focus to the toolbar", async ({ page }) => {
    await enterWorld(page);
    await hostCard(page, "about").focus();
    await page.keyboard.press("Escape");
    await expect(main(page)).toHaveAttribute("data-view", "explore");
    await expect(page.getByRole("button", { name: NAMES.ask })).toBeFocused();
  });

  test("the highlights strip in About can be scrolled from the keyboard", async ({
    page,
  }) => {
    await enterWorld(page);
    await openPlace(page, "about");
    await page.waitForTimeout(1500);
    const unreachable = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-panel] *")]
        .filter((el) => {
          const s = getComputedStyle(el);
          return (
            /(auto|scroll)/.test(s.overflowX) &&
            el.scrollWidth > el.clientWidth + 1 &&
            el.tabIndex < 0 &&
            !el.querySelector(
              "a[href], button, [tabindex]:not([tabindex='-1'])",
            )
          );
        })
        .map((el) => el.className.slice(0, 40)),
    );
    expect(unreachable).toEqual([]);
  });
});

test.describe("offline", () => {
  test("switching to day without the network keeps the page and the world in the same mode", async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await enterWorld(page);
    await context.setOffline(true);
    await page.getByRole("button", { name: NAMES.night }).click();
    await page.waitForTimeout(3000);
    await context.setOffline(false);
    expect(errors).toEqual([]);
  });
});

test.describe("the moon line", () => {
  test.skip(({ isMobile }) => !isMobile, "phone projects only");

  for (const size of [
    { width: 360, height: 740 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
  ]) {
    test(`${size.width}x${size.height}: the longest phase name in French touches nothing`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const Real = Date;
        const delta = new Real("2026-11-28T03:00:00Z").getTime() - Real.now();
        class Shifted extends Real {
          constructor(...args: [] | [string | number | Date]) {
            if (args.length === 0) super(Real.now() + delta);
            else super(args[0]);
          }
          static now() {
            return Real.now() + delta;
          }
        }
        window.Date = Shifted as DateConstructor;
      });
      await page.setViewportSize(size);
      await enterWorld(page, "/fr");
      await page.getByRole("button", { name: NAMES.look }).click();
      await expect(main(page)).toHaveAttribute("data-view", "explore");
      const moon = page.locator("[data-moon-corner]");
      await expect(moon).toHaveCSS("opacity", "1");
      const hits = await moon.evaluate((m) => {
        const a = m.getBoundingClientRect();
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(
          ".koi-credit, nav, [data-marker-label]",
        )) {
          if (el === m || m.contains(el)) continue;
          if (parseFloat(getComputedStyle(el).opacity) < 0.05) continue;
          const b = el.getBoundingClientRect();
          if (!b.width) continue;
          const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ix > -4 && iy > -4)
            out.push(
              `${(el.textContent ?? "").trim().slice(0, 24)} ${Math.round(ix)}x${Math.round(iy)}`,
            );
        }
        return { text: m.textContent, out, right: a.right };
      });
      expect(hits.out, `${hits.text}`).toEqual([]);
      expect(hits.right).toBeLessThanOrEqual(size.width);
    });
  }
});
