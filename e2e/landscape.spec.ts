import { test, expect, type Page } from "@playwright/test";
import {
  NAMES,
  PLACES,
  backToHost,
  enterWorld,
  hostCard,
  insideViewport,
  main,
  openPanel,
  openPlace,
} from "./helpers";

const BAR_SHOWING = [
  { width: 844, height: 340 },
  { width: 667, height: 320 },
];

async function shownOutside(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      if (!r.width || parseFloat(getComputedStyle(el).opacity) < 0.05) continue;
      if (
        r.left < -1 ||
        r.top < -1 ||
        r.right > innerWidth + 1 ||
        r.bottom > innerHeight + 1
      )
        out.push(
          `${(el.textContent ?? "").trim().slice(0, 24)} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`,
        );
    }
    return out;
  }, selector);
}

async function panelReach(page: Page) {
  return page
    .locator("[data-panel] .koi-panel__body")
    .evaluate(async (body) => {
      const skin = body.closest(".koi-panel") as HTMLElement;
      const controls = document.querySelector(".koi-scene-controls");
      const s = skin.getBoundingClientRect();
      const c = controls?.getBoundingClientRect();
      body.scrollTop = body.scrollHeight;
      await new Promise((done) => setTimeout(done, 200));
      const b = body.getBoundingClientRect();
      const items = [
        ...body.querySelectorAll<HTMLElement>("a[href], button, p, li"),
      ].filter((el) => el.getClientRects().length > 0);
      const last = items.at(-1)?.getBoundingClientRect();
      body.scrollTop = 0;
      return {
        inside:
          s.top >= -1 &&
          s.left >= -1 &&
          s.bottom <= innerHeight + 1 &&
          s.right <= innerWidth + 1,
        clearOfControls: !c || c.bottom <= s.top || c.right <= s.left,
        bodyHeight: Math.round(b.height),
        lastShown:
          !!last && last.bottom <= b.bottom + 1 && last.top >= b.top - 1,
      };
    });
}

test.describe("held sideways with the browser bar showing", () => {
  for (const size of BAR_SHOWING) {
    test(`${size.width}x${size.height}: every control, the bottom line and each place stay on screen`, async ({
      page,
      isMobile,
    }) => {
      test.skip(
        !isMobile && size.width !== 844,
        "one short window is enough on desktop browsers",
      );
      await page.setViewportSize(size);
      await enterWorld(page);
      const height = await main(page).evaluate(
        (el) => el.getBoundingClientRect().height,
      );
      expect(height).toBeLessThanOrEqual(size.height);
      await page.waitForTimeout(800);
      for (const place of PLACES)
        await expect(hostCard(page, place)).toBeVisible();
      await expect(
        page.getByRole("button", { name: NAMES.look }),
      ).toBeVisible();
      expect(
        await insideViewport(
          page,
          "section[aria-labelledby=koi-host-question] button, header button, header a",
        ),
      ).toEqual([]);

      await page.getByRole("button", { name: NAMES.look }).click();
      await expect(main(page)).toHaveAttribute("data-view", "explore");
      await page.waitForTimeout(800);
      await expect(page.getByRole("button", { name: NAMES.ask })).toBeVisible();
      expect(await insideViewport(page, "main nav button")).toEqual([]);
      expect(await shownOutside(page, ".koi-credit")).toEqual([]);

      for (const place of PLACES) {
        await backToHost(page);
        await openPlace(page, place);
        await page.waitForTimeout(900);
        await expect(
          page.getByRole("button", { name: NAMES.close }),
        ).toBeVisible();
        expect(
          await insideViewport(page, "[data-panel] .koi-panel__close"),
        ).toEqual([]);
        const reach = await panelReach(page);
        expect(reach, place).toMatchObject({
          inside: true,
          clearOfControls: true,
          lastShown: true,
        });
        expect(reach.bodyHeight, place).toBeGreaterThanOrEqual(90);
        if (place !== "projects") {
          await page.getByRole("button", { name: NAMES.close }).click();
          await expect(main(page)).toHaveAttribute("data-view", "explore");
        }
      }

      const panel = openPanel(page, "projects");
      const tabs = panel.getByRole("tab");
      expect(await insideViewport(page, "[data-panel] [role=tab]")).toEqual([]);
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      expect((await panelReach(page)).lastShown).toBe(true);
      await tabs.nth(0).click();

      const picture = panel.locator("button.koi-card-picture").first();
      await picture.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await picture.click();
      const viewer = page.locator("dialog[open]");
      await expect(viewer).toBeVisible();
      await page.waitForTimeout(500);
      expect(
        await insideViewport(
          page,
          "dialog[open] img, dialog[open] figcaption, dialog[open] button",
        ),
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(viewer).toHaveCount(0);
      await expect(panel).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(main(page)).toHaveAttribute("data-view", "explore");
    });
  }
});
