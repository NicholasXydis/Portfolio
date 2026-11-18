import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { Seo } from "./Seo";
import { renderWithProviders } from "@/test/render";
import { SITE_URL } from "@/lib/site";

describe("Seo", () => {
  it("sets a suffixed document title and canonical for the locale", async () => {
    renderWithProviders(
      <Seo title="Projects" description="All projects" path="projects" />,
      { locale: "en" },
    );

    await waitFor(() => expect(document.title).toBe("Projects | Koi"));
    const canonical = document.head.querySelector("link[rel='canonical']");
    expect(canonical).toHaveAttribute("href", `${SITE_URL}/en/projects`);
  });

  it("emits hreflang alternates for every locale plus x-default", async () => {
    renderWithProviders(<Seo title="Home" description="Home" path="" />, {
      locale: "fr",
    });

    await waitFor(() =>
      expect(
        document.head.querySelector("link[hreflang='en']"),
      ).toHaveAttribute("href", `${SITE_URL}/en`),
    );
    expect(document.head.querySelector("link[hreflang='fr']")).toHaveAttribute(
      "href",
      `${SITE_URL}/fr`,
    );
    expect(
      document.head.querySelector("link[hreflang='x-default']"),
    ).toHaveAttribute("href", `${SITE_URL}/en`);
  });

  it("shares the scene picture with its size, type and a localized alt text", async () => {
    renderWithProviders(<Seo title="Accueil" description="Accueil" />, {
      locale: "fr",
    });
    await waitFor(() =>
      expect(
        document.head.querySelector("meta[property='og:image']"),
      ).toHaveAttribute("content", `${SITE_URL}/og-koi.jpg`),
    );
    const content = (selector: string) =>
      document.head.querySelector(selector)?.getAttribute("content");
    expect(content("meta[property='og:image:type']")).toBe("image/jpeg");
    expect(content("meta[property='og:image:width']")).toBe("2400");
    expect(content("meta[property='og:image:height']")).toBe("1260");
    expect(content("meta[property='og:image:alt']")).toMatch(/maison de thé/);
    expect(content("meta[property='og:site_name']")).toBe("Koi");
    expect(content("meta[name='twitter:card']")).toBe("summary_large_image");
    expect(content("meta[name='twitter:image:alt']")).toMatch(/maison de thé/);
  });

  it("adds a noindex robots meta, and no canonical, language pairs or JSON-LD, when requested", async () => {
    const { container } = renderWithProviders(
      <Seo title="Not found" description="Missing" noindex />,
      { locale: "en" },
    );
    await waitFor(() =>
      expect(
        document.head.querySelector("meta[name='robots']"),
      ).toHaveAttribute("content", "noindex, follow"),
    );
    expect(document.querySelector("link[rel='canonical']")).toBeNull();
    expect(document.querySelector("link[rel='alternate']")).toBeNull();
    expect(document.querySelector("meta[property='og:url']")).toBeNull();
    expect(
      container.querySelector("script[type='application/ld+json']"),
    ).toBeNull();
  });

  it("adds a JSON-LD Person in the page's language", () => {
    const { container } = renderWithProviders(
      <Seo title="Accueil" description="Accueil" path="" />,
      { locale: "fr" },
    );
    const script = container.querySelector(
      "script[type='application/ld+json']",
    );
    const graph = JSON.parse(script?.textContent ?? "{}")["@graph"];
    expect(graph).toContainEqual(
      expect.objectContaining({
        "@type": "Person",
        name: "Nicholas Xydis",
        url: `${SITE_URL}/fr`,
        jobTitle: "Développeur logiciel",
      }),
    );
  });

  it("does not suffix the title when it already equals the site name", async () => {
    renderWithProviders(
      <Seo title="Nicholas Xydis" description="Home" path="" />,
      { locale: "en" },
    );
    await waitFor(() => expect(document.title).toBe("Nicholas Xydis"));
  });
});
