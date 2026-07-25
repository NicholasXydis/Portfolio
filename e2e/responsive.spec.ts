import { test, expect } from "@playwright/test";

const viewports = [
  { name: "old-small-phone-portrait", width: 320, height: 568 },
  { name: "small-android-portrait", width: 360, height: 640 },
  { name: "android-common-portrait", width: 360, height: 800 },
  { name: "iphone-se-portrait", width: 375, height: 667 },
  { name: "iphone-12-14-portrait", width: 390, height: 844 },
  { name: "iphone-15-16-pro-portrait", width: 393, height: 852 },
  { name: "iphone-plus-max-portrait", width: 430, height: 932 },
  { name: "large-android-portrait", width: 412, height: 915 },
  { name: "iphone-se-landscape", width: 667, height: 375 },
  { name: "iphone-standard-landscape", width: 844, height: 390 },
  { name: "iphone-max-landscape", width: 932, height: 430 },
  { name: "small-tablet-portrait", width: 600, height: 960 },
  { name: "ipad-mini-portrait", width: 768, height: 1024 },
  { name: "ipad-standard-portrait", width: 820, height: 1180 },
  { name: "ipad-air-pro-landscape", width: 1180, height: 820 },
  { name: "surface-tablet-portrait", width: 912, height: 1368 },
  { name: "surface-tablet-landscape", width: 1368, height: 912 },
  { name: "small-laptop", width: 1280, height: 720 },
  { name: "standard-laptop", width: 1366, height: 768 },
  { name: "macbook-13", width: 1440, height: 900 },
  { name: "macbook-pro-14-16", width: 1728, height: 1117 },
  { name: "full-hd-desktop", width: 1920, height: 1080 },
  { name: "qhd-desktop", width: 2560, height: 1440 },
  { name: "ultrawide-monitor", width: 3440, height: 1440 },
  { name: "4k-monitor", width: 3840, height: 2160 },
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
