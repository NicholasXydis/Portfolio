import { describe, expect, it } from "vitest";
import {
  buildPersonJsonLd,
  buildSeo,
  buildSiteJsonLd,
  pageCopy,
  serializeJsonLd,
} from "./meta";
import { CONTACT, SITE_NAME, SITE_URL } from "@/lib/site";

describe("buildSeo", () => {
  it("suffixes the title with the site brand in the page's language", () => {
    const meta = buildSeo({
      title: "Projects",
      description: "All projects",
      locale: "en",
      path: "projects",
    });
    expect(meta.fullTitle).toBe("Projects | Koi");
    expect(
      buildSeo({ title: "Projets", description: "x", locale: "fr" }).fullTitle,
    ).toBe("Projets | Koi");
  });

  it("keeps a title that already names the owner", () => {
    const meta = buildSeo({
      title: SITE_NAME,
      description: "Home",
      locale: "en",
    });
    expect(meta.fullTitle).toBe(SITE_NAME);
    expect(
      buildSeo({ ...pageCopy("home", "fr"), locale: "fr" }).fullTitle,
    ).toBe(
      "Nicholas Xydis | Informatique @ Concordia et développeur logiciel (3D)",
    );
  });

  it("names the site per language and shares the scene as the preview image", () => {
    const en = buildSeo({ title: "Home", description: "Home", locale: "en" });
    const fr = buildSeo({ title: "Home", description: "Home", locale: "fr" });
    expect(en.siteName).toBe("Koi");
    expect(fr.siteName).toBe("Koi");
    expect(en.image).toMatchObject({
      url: `${SITE_URL}/og-koi.jpg`,
      type: "image/jpeg",
      width: 2400,
      height: 1260,
    });
    expect(en.image.alt).not.toBe(fr.image.alt);
  });

  it("builds a locale-prefixed canonical url, defaulting path to the root", () => {
    const meta = buildSeo({
      title: "Home",
      description: "Home",
      locale: "fr",
    });
    expect(meta.canonical).toBe(`${SITE_URL}/fr`);
  });

  it("emits hreflang alternates for every supported locale plus x-default", () => {
    const meta = buildSeo({
      title: "Home",
      description: "Home",
      locale: "en",
      path: "lite",
    });
    expect(meta.alternates).toEqual([
      { hrefLang: "en", href: `${SITE_URL}/en/lite` },
      { hrefLang: "fr", href: `${SITE_URL}/fr/lite` },
      { hrefLang: "x-default", href: `${SITE_URL}/en/lite` },
    ]);
  });

  it("only includes the other locale in og:locale:alternate", () => {
    const meta = buildSeo({ title: "Home", description: "Home", locale: "en" });
    expect(meta.ogLocale).toBe("en_CA");
    expect(meta.ogLocaleAlternates).toEqual(["fr_CA"]);
  });

  it("defaults noindex to false and passes it through when set", () => {
    const defaultMeta = buildSeo({
      title: "Home",
      description: "Home",
      locale: "en",
    });
    expect(defaultMeta.noindex).toBe(false);

    const noindexMeta = buildSeo({
      title: "Not found",
      description: "Missing",
      locale: "en",
      noindex: true,
    });
    expect(noindexMeta.noindex).toBe(true);
  });
});

describe("buildPersonJsonLd", () => {
  it("describes the owner in the page's language from stated facts", () => {
    expect(buildPersonJsonLd("en")).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      name: SITE_NAME,
      url: `${SITE_URL}/en`,
      jobTitle: "Software Developer",
      sameAs: [CONTACT.github, CONTACT.linkedin],
    });
    expect(buildPersonJsonLd("fr")).toMatchObject({
      url: `${SITE_URL}/fr`,
      jobTitle: "Développeur logiciel",
    });
  });
});

describe("pageCopy", () => {
  it("gives every indexable page a distinct title and description per language", () => {
    const pages = (["home", "lite"] as const).flatMap((page) =>
      (["en", "fr"] as const).map((locale) => pageCopy(page, locale)),
    );
    expect(new Set(pages.map((page) => page.title)).size).toBe(4);
    expect(new Set(pages.map((page) => page.description)).size).toBe(4);
    for (const page of pages) {
      expect(page.title).toContain(SITE_NAME);
      expect(page.description.length).toBeGreaterThan(50);
      expect(page.description.length).toBeLessThanOrEqual(160);
    }
  });
});

describe("buildSiteJsonLd", () => {
  it("links the person to a website in the page's language", () => {
    const graph = buildSiteJsonLd("fr")["@graph"] as Record<string, unknown>[];
    const person = graph.find((node) => node["@type"] === "Person");
    const site = graph.find((node) => node["@type"] === "WebSite");
    expect(person).toMatchObject({
      name: SITE_NAME,
      jobTitle: "Développeur logiciel",
      sameAs: [CONTACT.github, CONTACT.linkedin],
      image: `${SITE_URL}/portrait.jpg`,
    });
    expect(site).toMatchObject({
      name: "Koi",
      url: `${SITE_URL}/fr`,
      inLanguage: "fr-CA",
      author: { "@id": person?.["@id"] },
    });
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so the JSON cannot close its script tag", () => {
    const json = serializeJsonLd({ text: "</script><b>" });
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ text: "</script><b>" });
  });
});
