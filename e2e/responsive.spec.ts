import { test, expect } from "@playwright/test";

const viewports = [
  { name: "iphone-se-375", width: 375, height: 667 },
  { name: "iphone-15-390", width: 390, height: 844 },
  { name: "iphone-max-430", width: 430, height: 932 },
  { name: "pixel-412", width: 412, height: 915 },
  { name: "phone-landscape-844", width: 844, height: 390 },
  { name: "ipad-mini-768", width: 768, height: 1024 },
  { name: "ipad-pro-834", width: 834, height: 1194 },
  { name: "ipad-landscape-1024", width: 1024, height: 768 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "laptop-1440", width: 1440, height: 900 },
  { name: "desktop-1080p", width: 1920, height: 1080 },
  { name: "qhd-2k-2560", width: 2560, height: 1440 },
  { name: "uhd-4k-3840", width: 3840, height: 2160 },
  { name: "ultrawide-3440", width: 3440, height: 1440 },
  { name: "foldable-344", width: 344, height: 882 },
];

const routes = [
  { label: "home", path: "/en" },
  { label: "case-study", path: "/en/projects/banklite" },
];

for (const route of routes) {
  for (const vp of viewports) {
    test(`${route.label} @ ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route.path, { waitUntil: "networkidle" });

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });

      expect(
        overflow.scrollWidth,
        `horizontal overflow: scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      expect(errors, `console errors: ${errors.join(" | ")}`).toHaveLength(0);
    });
  }
}
