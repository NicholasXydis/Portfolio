import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type APIRequestContext } from "@playwright/test";

const SITE = "https://nicholasxydis.ca";
const DIST = resolve(process.cwd(), "dist");

const PAGES = [
  {
    path: "/en",
    lang: "en",
    title: "Nicholas Xydis | CS @ Concordia & Software Developer (3D)",
    siteName: "Koi",
    pair: "/fr",
    lite: "/en/lite",
  },
  {
    path: "/fr",
    lang: "fr",
    title:
      "Nicholas Xydis | Informatique @ Concordia et développeur logiciel (3D)",
    siteName: "Koi",
    pair: "/en",
    lite: "/fr/lite",
  },
  {
    path: "/en/lite",
    lang: "en",
    title: "Nicholas Xydis | CS @ Concordia & Software Developer (2D)",
    siteName: "Koi",
    pair: "/fr/lite",
    lite: null,
  },
  {
    path: "/fr/lite",
    lang: "fr",
    title:
      "Nicholas Xydis | Informatique @ Concordia et développeur logiciel (2D)",
    siteName: "Koi",
    pair: "/en/lite",
    lite: null,
  },
] as const;

async function html(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.ok()).toBeTruthy();
  return response.text();
}

function attr(source: string, pattern: RegExp): string | null {
  return pattern.exec(source)?.[1] ?? null;
}

function textOf(source: string): string {
  return source
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

test.describe("prerendered head, as a crawler without JavaScript sees it", () => {
  for (const page of PAGES) {
    test(`${page.path} is self-canonical with its language pair and share card`, async ({
      request,
    }) => {
      const source = await html(request, page.path);
      expect(attr(source, /<html lang="([^"]+)"/)).toBe(page.lang);
      expect(source.indexOf("<meta charset")).toBeLessThan(200);
      expect(source.match(/<title>/g)).toHaveLength(1);
      expect(
        attr(source, /<title>([^<]*)<\/title>/)?.replace(/&amp;/g, "&"),
      ).toBe(page.title);
      expect(source.match(/<link rel="canonical"/g)).toHaveLength(1);
      expect(attr(source, /<link rel="canonical" href="([^"]+)"/)).toBe(
        `${SITE}${page.path}`,
      );
      expect(
        attr(source, new RegExp(`hreflang="${page.lang}" href="([^"]+)"`)),
      ).toBe(`${SITE}${page.path}`);
      const other = page.lang === "en" ? "fr" : "en";
      expect(
        attr(source, new RegExp(`hreflang="${other}" href="([^"]+)"`)),
      ).toBe(`${SITE}${page.pair}`);
      expect(attr(source, /hreflang="x-default" href="([^"]+)"/)).toBe(
        `${SITE}${page.lang === "en" ? page.path : page.pair}`,
      );
      expect(source).not.toContain('name="robots"');

      expect(attr(source, /property="og:url" content="([^"]+)"/)).toBe(
        `${SITE}${page.path}`,
      );
      expect(attr(source, /property="og:site_name" content="([^"]+)"/)).toBe(
        page.siteName,
      );
      expect(attr(source, /property="og:image" content="([^"]+)"/)).toBe(
        `${SITE}/og-koi.jpg`,
      );
      expect(attr(source, /property="og:image:width" content="([^"]+)"/)).toBe(
        "2400",
      );
      expect(attr(source, /property="og:image:height" content="([^"]+)"/)).toBe(
        "1260",
      );
      expect(
        attr(source, /property="og:image:alt" content="([^"]+)"/)?.length,
      ).toBeGreaterThan(30);
      expect(attr(source, /property="og:locale" content="([^"]+)"/)).toBe(
        `${page.lang}_CA`,
      );
      expect(attr(source, /name="twitter:card" content="([^"]+)"/)).toBe(
        "summary_large_image",
      );
      expect(
        attr(source, /name="description" content="([^"]+)"/)?.length,
      ).toBeGreaterThan(50);
      expect(source).toContain('<meta name="theme-color"');
      expect(source).toContain('rel="apple-touch-icon"');

      const ld = attr(
        source,
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      );
      const graph = JSON.parse(ld ?? "{}")["@graph"] as {
        "@type": string;
        name?: string;
        sameAs?: string[];
      }[];
      const person = graph.find((node) => node["@type"] === "Person");
      expect(person?.name).toBe("Nicholas Xydis");
      expect(person?.sameAs).toEqual([
        "https://github.com/NicholasXydis",
        "https://www.linkedin.com/in/nicholasxydis",
      ]);
      expect(graph.some((node) => node["@type"] === "WebSite")).toBe(true);

      expect(source.match(/<h1\b/g)).toHaveLength(1);
    });
  }

  test("titles and descriptions are unique per route", async ({ request }) => {
    const heads = await Promise.all(
      PAGES.map((page) => html(request, page.path)),
    );
    const titles = heads.map((source) => attr(source, /<title>([^<]*)</));
    const descriptions = heads.map((source) =>
      attr(source, /name="description" content="([^"]+)"/),
    );
    expect(new Set(titles).size).toBe(PAGES.length);
    expect(new Set(descriptions).size).toBe(PAGES.length);
  });

  for (const page of PAGES.filter((entry) => entry.lite !== null)) {
    test(`${page.path} carries the name, headline, sections and a link to the 2D page in its HTML`, async ({
      request,
    }) => {
      const source = await html(request, page.path);
      const text = textOf(source);
      expect(text).toContain("Nicholas Xydis");
      expect(text).toContain(
        page.lang === "en"
          ? "CS @ Concordia & Software Developer"
          : "Informatique @ Concordia et développeur logiciel",
      );
      for (const section of page.lang === "en"
        ? ["About", "Education", "Experience", "Projects"]
        : ["À propos", "Formation", "Expérience", "Projets"])
        expect(text).toContain(section);
      expect(source).toContain(`href="${page.lite}"`);
    });
  }

  test("the 2D page links back to the 3D world in its HTML", async ({
    request,
  }) => {
    for (const locale of ["en", "fr"]) {
      const source = await html(request, `/${locale}/lite`);
      expect(source).toContain(`href="/${locale}"`);
    }
  });
});

test.describe("404 page as served for unknown addresses", () => {
  test("is noindex, has no canonical and links back to both versions", async ({
    request,
  }) => {
    const source = await html(request, "/404.html");
    expect(source).toContain('<meta name="robots" content="noindex, follow"/>');
    expect(source).not.toContain('rel="canonical"');
    expect(source).not.toContain('property="og:url"');
    expect(source).not.toContain("application/ld+json");
    expect(source).toContain('href="/en"');
    expect(source).toContain('href="/en/lite"');
    expect(source.match(/<h1\b/g)).toHaveLength(1);
  });
});

test.describe("sitemap and robots", () => {
  test("the sitemap lists the four pages with language pairs and nothing else", async ({
    request,
  }) => {
    const sitemap = await html(request, "/sitemap.xml");
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    );
    expect(locs.sort()).toEqual(
      ["/en", "/en/lite", "/fr", "/fr/lite"].map((path) => `${SITE}${path}`),
    );
    expect(sitemap.match(/hreflang="x-default"/g)).toHaveLength(4);
    expect(sitemap.match(/hreflang="fr"/g)).toHaveLength(4);
    expect(
      sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g),
    ).toHaveLength(4);
    expect(sitemap).not.toContain("/projects/");
    expect(sitemap).not.toContain("404");
    expect(sitemap).not.toContain("cv-");
  });

  test("robots allows everything and points at the sitemap", async ({
    request,
  }) => {
    const robots = await html(request, "/robots.txt");
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(robots).not.toMatch(/^Disallow: \/(assets|worlds)?\/?\s*$/m);
  });
});

test.describe("host rules", () => {
  test.skip(
    !existsSync(resolve(DIST, "_headers")),
    "needs a local build in dist/",
  );

  function rules(file: string): Map<string, string[]> {
    const map = new Map<string, string[]>();
    let current: string[] | null = null;
    for (const line of readFileSync(resolve(DIST, file), "utf8").split("\n")) {
      if (!line.trim()) continue;
      if (/^\s/.test(line) && current) current.push(line.trim());
      else map.set(line.trim(), (current = []));
    }
    return map;
  }

  test("redirects the bare domain and old project pages permanently", () => {
    const lines = readFileSync(resolve(DIST, "_redirects"), "utf8")
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .filter((parts) => parts.length === 3);
    expect(lines).toContainEqual(["/", "/en", "301"]);
    expect(lines).toContainEqual([
      "/en/projects/:slug",
      "/en/lite#project-:slug",
      "301",
    ]);
    expect(lines.every((parts) => parts[2] === "301")).toBe(true);
    expect(lines.some((parts) => parts[0] === "/*")).toBe(false);
  });

  test("keeps noise out of the index and caches by kind", () => {
    const headers = rules("_headers");
    for (const path of [
      "/404",
      "/404.html",
      "/worlds/*",
      "/music/*",
      "/cv-en.pdf",
      "/cv-fr.pdf",
      "/cv-en.html",
      "/cv-fr.html",
    ])
      expect(headers.get(path)).toContain("X-Robots-Tag: noindex");
    expect(headers.get("https://:project.pages.dev/*")).toContain(
      "X-Robots-Tag: noindex",
    );
    for (const path of ["/en", "/fr", "/en/*", "/fr/*"])
      expect(headers.get(path)?.join("\n")).toMatch(/must-revalidate/);
    for (const path of ["/assets/*", "/worlds/*"])
      expect(headers.get(path)?.join("\n")).toMatch(/immutable/);
    expect(headers.get("/worlds/:version/koi/koi.glb")).toContain(
      "Content-Type: model/gltf-binary",
    );
  });
});

test.describe("share and tab assets", () => {
  test("serves the share picture, touch icon and favicon as images", async ({
    request,
  }) => {
    for (const path of [
      "/og-koi.jpg",
      "/apple-touch-icon.png",
      "/favicon.svg",
      "/favicon.ico",
    ]) {
      const response = await request.get(path);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()["content-type"]).toContain("image");
    }
    const og = await request.get("/og-koi.jpg");
    expect((await og.body()).length).toBeLessThan(300 * 1024);
  });
});

test.describe("CV assets", () => {
  for (const locale of ["en", "fr"] as const) {
    test(`serves the ${locale} CV wrapper with favicon and PDF embed`, async ({
      request,
    }) => {
      const wrapper = await request.get(`/cv-${locale}.html`);
      expect(wrapper.ok()).toBeTruthy();
      const source = await wrapper.text();
      expect(source).toContain('href="/favicon.svg"');
      expect(source).toContain(`src="/cv-${locale}.pdf"`);

      const pdf = await request.get(`/cv-${locale}.pdf`);
      expect(pdf.ok()).toBeTruthy();
      expect(pdf.headers()["content-type"]).toContain("pdf");
    });
  }
});
