import { defineConfig, type Plugin, type Rollup } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { packMusic, packWorld, type WorldPack } from "./scripts/worldPack";

const ROOT = fileURLToPath(new URL(".", import.meta.url));

function analyticsPreconnect(): Plugin {
  let enabled = false;
  return {
    name: "analytics-preconnect",
    configResolved(config) {
      enabled = Boolean(config.env.VITE_POSTHOG_KEY);
    },
    transformIndexHtml() {
      if (!enabled) return [];
      return [
        {
          tag: "link",
          attrs: { rel: "preconnect", href: "https://us.i.posthog.com" },
          injectTo: "head",
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://us-assets.i.posthog.com",
            crossorigin: true,
          },
          injectTo: "head",
        },
      ];
    },
  };
}

function chunkClosure(
  bundle: Rollup.OutputBundle,
  start: string[],
): Set<string> {
  const seen = new Set<string>();
  const queue = [...start];
  while (queue.length) {
    const name = queue.shift() as string;
    if (seen.has(name)) continue;
    seen.add(name);
    const chunk = bundle[name];
    if (chunk && chunk.type === "chunk") queue.push(...chunk.imports);
  }
  return seen;
}

function worldModules(bundle: Rollup.OutputBundle): string[] {
  const chunks = Object.values(bundle).filter(
    (c): c is Rollup.OutputChunk => c.type === "chunk",
  );
  const world = chunks.find((c) =>
    (c.facadeModuleId ?? "").endsWith("/3d/viewer/world.js"),
  );
  if (!world) throw new Error("[koi-world] no chunk for 3d/viewer/world.js");
  const entry = chunkClosure(
    bundle,
    chunks.filter((c) => c.isEntry).map((c) => c.fileName),
  );
  return [...chunkClosure(bundle, [world.fileName])]
    .filter((name) => !entry.has(name))
    .map((name) => `/${name}`);
}

function koiWorld(): Plugin {
  let pack: WorldPack | null = null;
  let outDir = "dist";
  let ssr = false;
  return {
    name: "koi-world",
    apply: "build",
    config(_config, env) {
      ssr = Boolean(env.isSsrBuild);
      pack = packWorld(ROOT);
      return {
        define: {
          "import.meta.env.VITE_WORLD_BASE": JSON.stringify(pack.base),
        },
      };
    },
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      for (const [name, file] of Object.entries(bundle)) {
        if (
          file.type === "asset" &&
          file.originalFileNames.some((source) =>
            source.includes("node_modules/three/examples/jsm/libs/draco/"),
          )
        )
          delete bundle[name];
      }
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        if (ssr || !pack || !ctx.bundle) return [];
        const data = {
          module: worldModules(ctx.bundle),
          fetch: pack.preload.fetch,
          glb: pack.preload.glb,
          light: pack.preload.light,
        };
        return [
          {
            tag: "script",
            attrs: { type: "application/json", id: "koi-world-preload" },
            children: JSON.stringify(data).replace(/</g, "\\u003c"),
            injectTo: "head-prepend",
          },
        ];
      },
    },
    writeBundle() {
      if (ssr || !pack) return;
      let bytes = 0;
      for (const file of pack.files) {
        const target = join(outDir, file.out);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, file.data);
        bytes += file.data.length;
      }
      const music = packMusic(ROOT);
      const samples = join(outDir, "music", "samples");
      for (const f of readdirSync(samples)) {
        if (`/music/samples/${f}` !== music.keep)
          rmSync(join(samples, f), { force: true });
      }
      writeFileSync(join(samples, "tracks.json"), music.tracksJson);
      this.info(
        `world ${pack.version}: ${pack.files.length} files, ${(bytes / 1024).toFixed(0)} KB; music: ${music.keep}`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), analyticsPreconnect(), koiWorld()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@viewer": fileURLToPath(new URL("./3d/viewer", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/node_modules/three/")) return "three";
          if (id.includes("posthog-js")) return "analytics";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("i18next") || id.includes("react-i18next"))
            return "i18n";
          if (id.includes("react-router")) return "router";
          return "vendor";
        },
      },
    },
  },
});
