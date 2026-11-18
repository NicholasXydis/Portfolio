import { createHash } from "node:crypto";
import { constants, gzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface PackedFile {
  out: string;
  data: Buffer;
}

export interface WorldPreload {
  fetch: string[];
  glb: { plain: string; gz: string };
  light: string[];
}

export interface WorldPack {
  version: string;
  base: string;
  files: PackedFile[];
  preload: WorldPreload;
}

const DEV_PREFIX = (id: string) => `/3d/worlds/${id}/`;

function urlsIn(value: unknown, out: Set<string>): void {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => urlsIn(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => urlsIn(v, out));
}

function rewrite(value: unknown, from: string, to: string): unknown {
  if (typeof value === "string")
    return value.startsWith(from) ? to + value.slice(from.length) : value;
  if (Array.isArray(value)) return value.map((v) => rewrite(v, from, to));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rewrite(v, from, to)]),
    );
  return value;
}

function spriteSheets(glb: Buffer): string[] {
  if (glb.readUInt32LE(0) !== 0x46546c67) return [];
  const length = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + length).toString("utf8")) as {
    materials?: { name?: string }[];
  };
  const sheets = new Set<string>();
  for (const material of json.materials ?? []) {
    const match = /SPRITE_([A-Za-z0-9-]+?)(?:__|$)/.exec(material.name ?? "");
    if (match) sheets.add(match[1]);
  }
  return [...sheets].sort();
}

export function packWorld(root: string, id = "koi"): WorldPack {
  const worldDir = join(root, "3d", "worlds", id);
  const dracoDir = join(root, "3d", "viewer", "libs", "draco");
  const manifestRaw = readFileSync(join(worldDir, "manifest.json"), "utf8");
  const manifest = JSON.parse(manifestRaw) as {
    pack?: { atlas?: string; sprites?: string; geometry?: string };
    screen?: { poster?: string };
  };
  if (manifest.pack?.atlas !== "webp" || manifest.pack?.sprites !== "webp") {
    throw new Error(
      `[koi-world] ${id} is not a web-packed world (manifest.pack: ${JSON.stringify(manifest.pack)})`,
    );
  }

  const glbPath = join(worldDir, `${id}.glb`);
  if (!existsSync(glbPath)) throw new Error(`[koi-world] missing ${glbPath}`);
  const sprites = spriteSheets(readFileSync(glbPath)).map(
    (sheet) => `sprites/${sheet}.webp`,
  );
  const rel: string[] = [
    `${id}.glb`,
    "night_2k.webp",
    "day_2k.webp",
    ...sprites,
  ];
  const urls = new Set<string>();
  urlsIn(manifest, urls);
  for (const url of [...urls].sort()) {
    if (url.startsWith(DEV_PREFIX(id)))
      rel.push(url.slice(DEV_PREFIX(id).length));
  }

  const sources = [
    ...[...new Set(rel)].map((r) => ({
      from: join(worldDir, r),
      out: `${id}/${r}`,
    })),
    {
      from: join(dracoDir, "draco_wasm_wrapper.js"),
      out: "draco/draco_wasm_wrapper.js",
    },
    {
      from: join(dracoDir, "draco_decoder.wasm"),
      out: "draco/draco_decoder.wasm",
    },
  ];
  const read = sources.map((s) => {
    if (!existsSync(s.from)) throw new Error(`[koi-world] missing ${s.from}`);
    return { out: s.out, data: readFileSync(s.from) };
  });

  const hash = createHash("sha256");
  hash.update(manifestRaw);
  for (const f of read) hash.update(f.out).update(f.data);
  const version = hash.digest("hex").slice(0, 10);
  const base = `/worlds/${version}/`;

  const shippedManifest = rewrite(manifest, DEV_PREFIX(id), `${base}${id}/`);
  const files: PackedFile[] = [
    {
      out: `worlds/${version}/${id}/manifest.json`,
      data: Buffer.from(JSON.stringify(shippedManifest)),
    },
    ...read.map((f) => ({ out: `worlds/${version}/${f.out}`, data: f.data })),
    {
      out: `worlds/${version}/${id}/${id}.glb.gz`,
      data: gzipSync(
        read.find((f) => f.out === `${id}/${id}.glb`)?.data ?? Buffer.alloc(0),
        { level: constants.Z_BEST_COMPRESSION },
      ),
    },
  ];
  const at = (r: string) => `${base}${id}/${r}`;
  const poster = manifest.screen?.poster;
  const fetchList = [
    at("manifest.json"),
    at("night_2k.webp"),
    ...sprites.map(at),
    ...(poster?.startsWith(DEV_PREFIX(id))
      ? [at(poster.slice(DEV_PREFIX(id).length))]
      : []),
    `${base}draco/draco_wasm_wrapper.js`,
    `${base}draco/draco_decoder.wasm`,
  ];
  return {
    version,
    base,
    files,
    preload: {
      fetch: fetchList,
      glb: { plain: at(`${id}.glb`), gz: at(`${id}.glb.gz`) },
      light: [at("day_2k.webp")],
    },
  };
}

export function packMusic(root: string): {
  keep: string;
  tracksJson: string;
} {
  const list = JSON.parse(
    readFileSync(
      join(root, "public", "music", "samples", "tracks.json"),
      "utf8",
    ),
  ) as { id: string; file: string }[];
  const first = list[0];
  if (!first) throw new Error("[koi-world] tracks.json is empty");
  return { keep: first.file, tracksJson: JSON.stringify([first]) };
}
