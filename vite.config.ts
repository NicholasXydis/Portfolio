import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("simplex-noise")) return "noise";
          if (id.includes("i18next") || id.includes("react-i18next"))
            return "i18n";
          if (id.includes("react-router")) return "router";
          return "vendor";
        },
      },
    },
  },
});
