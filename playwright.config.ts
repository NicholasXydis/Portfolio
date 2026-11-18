import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4173);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

const gpuArgs = [
  "--use-angle=metal",
  "--enable-gpu",
  "--ignore-gpu-blocklist",
  "--autoplay-policy=user-gesture-required",
];
const softwareArgs = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const softwareOnly = "**/fallback.spec.ts";
const servedOnce = "**/served.spec.ts";
const desktopOnly = [
  "**/responsive.spec.ts",
  "**/scroll.spec.ts",
  softwareOnly,
  servedOnce,
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: Number(process.env.E2E_WORKERS ?? 2),
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-gpu",
      metadata: { gpu: true },
      testIgnore: [softwareOnly, servedOnce],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        launchOptions: { args: gpuArgs },
      },
    },
    {
      name: "phone-chromium-gpu",
      metadata: { gpu: true },
      testIgnore: desktopOnly,
      use: {
        ...devices["Pixel 7"],
        channel: "chromium",
        launchOptions: { args: gpuArgs },
      },
    },
    {
      name: "phone-webkit",
      metadata: { gpu: true },
      testIgnore: desktopOnly,
      use: { ...devices["iPhone 15"] },
    },
    {
      name: "desktop-webkit",
      metadata: { gpu: true },
      testIgnore: ["**/responsive.spec.ts", softwareOnly, servedOnce],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "desktop-firefox",
      metadata: { gpu: true },
      testIgnore: ["**/responsive.spec.ts", softwareOnly, servedOnce],
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "chromium-software",
      metadata: { software: true },
      testMatch: [
        "**/fallback.spec.ts",
        "**/flat.spec.ts",
        "**/seo.spec.ts",
        servedOnce,
      ],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        launchOptions: { args: softwareArgs },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run preview -- --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
