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

    await waitFor(() =>
      expect(document.title).toBe("Projects | Nicholas Xydis"),
    );
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

  it("adds a noindex robots meta when requested", async () => {
    renderWithProviders(
      <Seo title="Not found" description="Missing" noindex />,
      { locale: "en" },
    );
    await waitFor(() =>
      expect(
        document.head.querySelector("meta[name='robots']"),
      ).toHaveAttribute("content", "noindex, follow"),
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
