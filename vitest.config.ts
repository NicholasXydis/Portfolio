import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/**/*.{test,spec}.{ts,tsx}",
          "src/test/**",
          "src/main.tsx",
          "src/**/*.d.ts",
          "src/components/index.ts",
          "src/features/{contact,education-list,experience-list,lite,project-list,tech-stack,world}/index.ts",
        ],
        thresholds: {
          statements: 83,
          branches: 76,
          functions: 87,
          lines: 86,
        },
      },
    },
  }),
);
