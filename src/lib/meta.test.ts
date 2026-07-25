import { describe, expect, it } from "vitest";
import { buildSeo } from "./meta";
import { SITE_NAME, SITE_URL } from "@/lib/site";

describe("buildSeo", () => {
  it("suffixes the title with the site name by default", () => {
    const meta = buildSeo({
      title: "Projects",
      description: "All projects",
      locale: "en",
      path: "projects",
    });
    expect(meta.fullTitle).toBe(`Projects | ${SITE_NAME}`);
  });

  it("does not double-suffix when the title already starts with the site name", () => {
    const meta = buildSeo({
      title: SITE_NAME,
      description: "Home",
      locale: "en",
    });
    expect(meta.fullTitle).toBe(SITE_NAME);
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
      path: "projects/banklite",
    });
    expect(meta.alternates).toEqual([
      { hrefLang: "en", href: `${SITE_URL}/en/projects/banklite` },
      { hrefLang: "fr", href: `${SITE_URL}/fr/projects/banklite` },
      { hrefLang: "x-default", href: `${SITE_URL}/en/projects/banklite` },
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
