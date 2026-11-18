import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

interface Page {
  url: string;
  file: string;
}

const PAGES: Page[] = [
  { url: "/en", file: "en.html" },
  { url: "/fr", file: "fr.html" },
  { url: "/en/lite", file: "en/lite.html" },
  { url: "/fr/lite", file: "fr/lite.html" },
  { url: "/en/404", file: "404.html" },
];

const HEAD_START = "<!-- prerender:head -->";
const HEAD_END = "<!-- /prerender:head -->";
const ROOT_TAG = '<div id="root"></div>';
const HASHES_MARKER = "__INLINE_SCRIPT_HASHES__";
const CHARSET = /\s*<meta charset="[^"]*"\s*\/?>/i;

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = resolve(root, process.argv[2] ?? "dist");
const ssrDir = join(root, "node_modules", ".cache", "prerender-ssr");

function charsetFirst(html: string): string {
  const charset = CHARSET.exec(html);
  if (!charset) return html;
  return html
    .replace(charset[0], "")
    .replace(/<head>/i, `<head>\n    ${charset[0].trim()}`);
}

function lowerCaseHeadAttributes(head: string): string {
  return head.replace(/\bhrefLang=/g, "hreflang=");
}

function splitHead(html: string): { head: string; body: string } {
  const hoisted =
    /^(?:<title>[\s\S]*?<\/title>|<meta\b[^>]*\/?>|<link\b[^>]*\/?>)+/;
  const match = hoisted.exec(html);
  const head = match ? match[0] : "";
  return { head, body: html.slice(head.length) };
}

function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  const inline = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  for (const [, attrs, code] of html.matchAll(inline)) {
    if (/\bsrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs)) {
      continue;
    }
    if (!code.trim()) continue;
    const digest = createHash("sha256").update(code, "utf8").digest("base64");
    hashes.push(`'sha256-${digest}'`);
  }
  return hashes;
}

async function main() {
  const template = charsetFirst(
    readFileSync(join(outDir, "index.html"), "utf8"),
  );
  if (!template.includes(HEAD_START) || !template.includes(HEAD_END)) {
    throw new Error(`index.html is missing the ${HEAD_START} markers`);
  }
  if (!template.includes(ROOT_TAG)) {
    throw new Error(`index.html is missing ${ROOT_TAG}`);
  }

  rmSync(ssrDir, { recursive: true, force: true });
  await build({
    root,
    logLevel: "warn",
    build: {
      ssr: "src/entry-server.tsx",
      outDir: ssrDir,
      emptyOutDir: true,
      copyPublicDir: false,
      minify: false,
    },
  });
  const entry = pathToFileURL(join(ssrDir, "entry-server.js")).href;
  const { render, localeOf } = (await import(entry)) as {
    render: (url: string) => Promise<string>;
    localeOf: (url: string) => string;
  };

  const hashes = new Set(inlineScriptHashes(template));
  for (const page of PAGES) {
    const { head, body } = splitHead(await render(page.url));
    const start = template.indexOf(HEAD_START) + HEAD_START.length;
    const end = template.indexOf(HEAD_END);
    const html = (
      template.slice(0, start) +
      lowerCaseHeadAttributes(head) +
      template.slice(end)
    )
      .replace(/<html lang="[^"]*"/, `<html lang="${localeOf(page.url)}"`)
      .replace(
        ROOT_TAG,
        `<div id="root" data-prerendered="${page.url}">${body}</div>`,
      );
    for (const hash of inlineScriptHashes(html)) hashes.add(hash);
    const file = join(outDir, page.file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html, "utf8");
    console.log(`prerendered ${page.url} -> ${page.file}`);
  }

  const headersFile = join(outDir, "_headers");
  const headers = readFileSync(headersFile, "utf8");
  if (headers.includes(HASHES_MARKER)) {
    writeFileSync(
      headersFile,
      headers.replaceAll(HASHES_MARKER, [...hashes].join(" ")),
      "utf8",
    );
    console.log(`_headers: ${hashes.size} inline script hash(es)`);
  }

  rmSync(ssrDir, { recursive: true, force: true });
}

await main();
