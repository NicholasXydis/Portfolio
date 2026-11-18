import { expect, type Page } from "@playwright/test";

export const PLACES = ["about", "education", "experience", "projects"] as const;
export type Place = (typeof PLACES)[number];

export const NAMES = {
  enter: /Enter the world|Entrer dans le monde/,
  close: /Back to the island|Retour à l'île/,
  ask: /Ask the tea master|Parler au maître de thé/,
  look: /Just looking around|Je ne fais que regarder/,
  night: /^(Night|Nuit)$/,
  brand: /^(Koi, back to the island|Koi, retour à l'île)$/,
  flat: /^(2D version|Version 2D)$/,
};

export const PANEL_TITLES: Record<"en" | "fr", Record<Place, RegExp>> = {
  en: {
    about: /About/,
    education: /Education/,
    experience: /Experience/,
    projects: /Projects/,
  },
  fr: {
    about: /propos/i,
    education: /Formation|Éducation/,
    experience: /Expérience/,
    projects: /Projets/,
  },
};

export function tabKey(browserName: string) {
  return browserName === "webkit" ? "Alt+Tab" : "Tab";
}

export function main(page: Page) {
  return page.locator("main#main-content");
}

export async function phase(page: Page) {
  return main(page).getAttribute("data-phase");
}

export async function currentView(page: Page) {
  return main(page).getAttribute("data-view");
}

export async function waitForWorld(page: Page, timeout = 45_000) {
  await expect(main(page)).toHaveAttribute("data-phase", /ready|entered/, {
    timeout,
  });
}

export async function enterWorld(page: Page, path = "/en") {
  await page.goto(path);
  await waitForWorld(page);
  const enter = page.getByRole("button", { name: NAMES.enter });
  await expect(enter).toBeVisible({ timeout: 15_000 });
  await enter.click();
  await expect(main(page)).toHaveAttribute("data-phase", "entered");
  await expect(page.locator("#koi-host-question")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("loading-screen")).toHaveCount(0, {
    timeout: 5_000,
  });
}

export async function audioStarts(page: Page) {
  return page.evaluate(
    () =>
      new Promise<boolean>((done) => {
        const ctx = new AudioContext();
        const finish = (ok: boolean) => {
          void ctx.close().catch(() => undefined);
          done(ok);
        };
        setTimeout(() => finish(ctx.state === "running"), 1500);
        void ctx.resume().then(
          () => finish(true),
          () => finish(false),
        );
      }),
  );
}

export function hostCard(page: Page, place: Place) {
  return page
    .locator("section[aria-labelledby=koi-host-question] ul li button")
    .nth(PLACES.indexOf(place));
}

export function openPanel(page: Page, place: Place) {
  return page.locator(`[data-panel=${place}]`);
}

export async function openPlace(page: Page, place: Place) {
  await hostCard(page, place).click();
  await expect(main(page)).toHaveAttribute("data-view", place);
  await expect(openPanel(page, place)).toBeVisible();
}

export async function closePlace(page: Page) {
  await page.getByRole("button", { name: NAMES.close }).click();
  await expect(main(page)).toHaveAttribute("data-view", "explore");
  await expect(page.locator("[data-panel]")).toHaveCount(0);
}

export async function backToHost(page: Page) {
  await page.getByRole("button", { name: NAMES.ask }).click();
  await expect(main(page)).toHaveAttribute("data-view", "welcome");
  await expect(page.locator("#koi-host-question")).toBeVisible();
}

export async function tagCanvas(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("main canvas");
    if (!canvas) return null;
    if (!canvas.dataset.e2e)
      canvas.dataset.e2e = String(Math.random()).slice(2, 10);
    return canvas.dataset.e2e;
  });
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return (
      Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth
    );
  });
}

export async function smallestText(page: Page, root = "body", skip = "") {
  return page.evaluate(
    ({ root, skip }) => {
      const scope = document.querySelector(root) ?? document.body;
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      let smallest = Infinity;
      let sample = "";
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent?.trim();
        const el = node.parentElement;
        if (
          !text ||
          !el ||
          el.closest(".sr-only, [aria-hidden=true] svg") ||
          (skip && el.closest(skip))
        )
          continue;
        const rect = el.getBoundingClientRect();
        if (
          !rect.width ||
          !rect.height ||
          rect.bottom < 0 ||
          rect.top > innerHeight
        )
          continue;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || parseFloat(style.opacity) === 0)
          continue;
        const size = parseFloat(style.fontSize);
        if (size < smallest) {
          smallest = size;
          sample = text.slice(0, 40);
        }
      }
      return { size: smallest, sample };
    },
    { root, skip },
  );
}

export async function insideViewport(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      if (
        r.left < -1 ||
        r.top < -1 ||
        r.right > innerWidth + 1 ||
        r.bottom > innerHeight + 1
      ) {
        out.push(
          `${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`,
        );
      }
    }
    return out;
  }, selector);
}
