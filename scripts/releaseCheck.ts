import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gunzipSync } from "node:zlib";
import { buildSeo, pageCopy } from "@/lib/meta";
import { normalizeSiteUrl } from "@/lib/site";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, process.argv[2] ?? "dist");
const world = join(root, "3d", "worlds", "koi");
const site = normalizeSiteUrl(process.env.VITE_SITE_URL);

const results: { name: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail = "") =>
  results.push({ name, ok, detail });

const read = (p: string) => readFileSync(p);
const text = (p: string) => readFileSync(p, "utf8");
const same = (a: Buffer, b: Buffer) => a.length === b.length && a.equals(b);
const fromUrl = (u: string) => join(dist, u.replace(/^\//, ""));

const landing = text(join(dist, "en.html"));
const block =
  /<script type="application\/json" id="koi-world-preload">([^<]*)<\/script>/.exec(
    landing,
  );
check("preload data block present in en.html", Boolean(block));
const preload = block
  ? (JSON.parse(block[1]) as {
      module: string[];
      fetch: string[];
      glb: { plain: string; gz: string };
      light: string[];
    })
  : { module: [], fetch: [], glb: { plain: "", gz: "" }, light: [] };

const glbUrl = preload.glb.plain;
const base = glbUrl.replace(/koi\/koi\.glb$/, "");
check("world base found", /^\/worlds\/[0-9a-f]{10}\/$/.test(base), base);

const glbDist = fromUrl(preload.glb.plain);
const gzDist = fromUrl(preload.glb.gz);
if (existsSync(glbDist) && existsSync(gzDist)) {
  const plain = read(glbDist);
  const inflated = gunzipSync(read(gzDist));
  check("koi.glb.gz inflates to dist koi.glb", same(inflated, plain));
  check(
    "dist koi.glb equals 3d/worlds/koi/koi.glb",
    same(plain, read(join(world, "koi.glb"))),
    `${plain.length} bytes`,
  );
} else {
  check("koi.glb and koi.glb.gz exist", false, `${glbDist} ${gzDist}`);
}

const listed = [
  ...preload.module,
  ...preload.fetch,
  preload.glb.plain,
  preload.glb.gz,
  ...preload.light,
];
const missing = listed.filter((u) => !existsSync(fromUrl(u)));
check(
  `all ${listed.length} preload URLs exist in dist`,
  missing.length === 0,
  missing.join(" "),
);

const liveManifest = JSON.parse(text(join(world, "manifest.json")));
const expected = JSON.parse(
  JSON.stringify(liveManifest).split("/3d/worlds/koi/").join(`${base}koi/`),
);
const shipped = JSON.parse(text(fromUrl(`${base}koi/manifest.json`)));
check(
  "dist manifest equals the live manifest (paths rewritten)",
  JSON.stringify(shipped) === JSON.stringify(expected),
);

const worldFiles: string[] = [];
const walk = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else worldFiles.push(p);
  }
};
walk(join(dist, base.replace(/^\//, ""), "koi"));
const differ: string[] = [];
for (const p of worldFiles) {
  const r = relative(join(dist, base.replace(/^\//, ""), "koi"), p);
  if (r === "manifest.json" || r.endsWith(".gz")) continue;
  const live = join(world, r);
  if (!existsSync(live) || !same(read(p), read(live))) differ.push(r);
}
check(
  `atlases, sprites and slides equal the live world (${worldFiles.length} files)`,
  differ.length === 0,
  differ.join(" "),
);
for (const f of ["draco_wasm_wrapper.js", "draco_decoder.wasm"]) {
  check(
    `draco ${f} equals the viewer's`,
    same(
      read(fromUrl(`${base}draco/${f}`)),
      read(join(root, "3d", "viewer", "libs", "draco", f)),
    ),
  );
}

const pages = [
  { file: "en.html", locale: "en", path: "", key: "home" },
  { file: "fr.html", locale: "fr", path: "", key: "home" },
  { file: "en/lite.html", locale: "en", path: "/lite", key: "lite" },
  { file: "fr/lite.html", locale: "fr", path: "/lite", key: "lite" },
] as const;
const unescape = (s: string) =>
  s
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
for (const page of pages) {
  const html = text(join(dist, page.file));
  const title = buildSeo({
    ...pageCopy(page.key, page.locale),
    locale: page.locale,
    path: page.path,
  }).fullTitle;
  const titles = [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) =>
    unescape(m[1]),
  );
  const canonical = [
    ...html.matchAll(/<link rel="canonical" href="([^"]+)"/g),
  ].map((m) => m[1]);
  const alternates = Object.fromEntries(
    [
      ...html.matchAll(
        /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g,
      ),
    ].map((m) => [m[1], m[2]]),
  );
  const want = {
    en: `${site}/en${page.path}`,
    fr: `${site}/fr${page.path}`,
    "x-default": `${site}/en${page.path}`,
  };
  const lang = /<html lang="([^"]+)"/.exec(html)?.[1];
  const problems = [
    titles.length !== 1 || titles[0] !== title
      ? `title ${JSON.stringify(titles)} want ${title}`
      : "",
    canonical.length !== 1 ||
    canonical[0] !== `${site}/${page.locale}${page.path}`
      ? `canonical ${JSON.stringify(canonical)}`
      : "",
    JSON.stringify(alternates) !== JSON.stringify(want)
      ? `hreflang ${JSON.stringify(alternates)}`
      : "",
    lang !== page.locale ? `lang ${lang}` : "",
    html.includes('"@type":"Person"') ? "" : "no JSON-LD Person",
    html.includes(`data-prerendered="/${page.locale}${page.path}"`)
      ? ""
      : "not prerendered",
  ].filter(Boolean);
  check(
    `${page.file}: title, canonical, hreflang, lang, JSON-LD`,
    problems.length === 0,
    problems.join("; "),
  );
}
const shell = text(join(dist, "index.html"));
check(
  "index.html shell has one title and the preload block",
  (shell.match(/<title>/g) ?? []).length === 1 &&
    shell.includes('id="koi-world-preload"'),
);
const notFound = text(join(dist, "404.html"));
check(
  "404.html is noindex without canonical",
  notFound.includes('content="noindex, follow"') &&
    !notFound.includes('rel="canonical"'),
);

const all: string[] = [];
const walkAll = (dir: string) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walkAll(p);
    else all.push(p);
  }
};
walkAll(dist);
const commented: string[] = [];
let legal = 0;
for (const p of all) {
  const ext = extname(p);
  if (ext === ".html") {
    const body = text(p);
    const opened = body.match(/<!--/g)?.length ?? 0;
    const allowed =
      body.match(/<!-- \/?prerender:head -->|<!--(?: |\$|\/\$|\$\?|\$!)?-->/g)
        ?.length ?? 0;
    if (opened > allowed) commented.push(relative(dist, p));
  } else if (ext === ".css") {
    const body = text(p).replace(/\/\*![\s\S]*?\*\//g, "");
    if (/\/\*/.test(body)) commented.push(relative(dist, p));
  } else if (ext === ".js" && p.includes(`${join(dist, "assets")}`)) {
    legal += (text(p).match(/\/\*!|@license/g) ?? []).length;
  }
}
check(
  "no source comments in dist HTML and CSS",
  commented.length === 0,
  commented.join(" "),
);

const assetsBefore = new Set<string>();
const scriptSrc = /<script type="module" crossorigin src="([^"]+)"/.exec(
  landing,
);
if (scriptSrc) assetsBefore.add(scriptSrc[1]);
for (const m of landing.matchAll(
  /<link rel="(?:modulepreload|stylesheet)" crossorigin href="([^"]+)"/g,
))
  assetsBefore.add(m[1]);
for (const u of [...preload.module, ...preload.fetch, preload.glb.gz])
  assetsBefore.add(u);
assetsBefore.add("/music/samples/tracks.json");
assetsBefore.add("/favicon.svg");
const compressible = new Set([
  ".js",
  ".css",
  ".json",
  ".wasm",
  ".svg",
  ".html",
]);
let raw = Buffer.byteLength(landing);
let wire = brotliCompressSync(landing, {
  params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
}).length;
const absent: string[] = [];
for (const u of assetsBefore) {
  const p = fromUrl(u);
  if (!existsSync(p)) {
    absent.push(u);
    continue;
  }
  const data = read(p);
  raw += data.length;
  wire += compressible.has(extname(p))
    ? brotliCompressSync(data, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
      }).length
    : data.length;
}
check(
  `files fetched before Enter exist (${assetsBefore.size + 1})`,
  absent.length === 0,
  absent.join(" "),
);

for (const r of results)
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`,
  );
console.log(
  `before Enter on /en: ${assetsBefore.size + 1} files, ${(raw / 1024).toFixed(0)} KB raw, about ${(wire / 1024).toFixed(0)} KB on the wire with brotli on text; ${legal} legal notices kept in JS`,
);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} check(s) FAILED` : "release check: all passed");
process.exit(failed ? 1 : 0);
