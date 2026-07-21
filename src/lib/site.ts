export const DEFAULT_SITE_URL = "https://nicholasxydis.ca";

export function normalizeSiteUrl(url: string | undefined): string {
  return (url && url.length > 0 ? url : DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export const SITE_URL = normalizeSiteUrl(import.meta.env.VITE_SITE_URL);

export const SITE_NAME = "Nicholas Xydis";

export const CONTACT = {
  email: "NicholasXydis@outlook.com",
  github: "https://github.com/NicholasXydis",
  linkedin: "https://www.linkedin.com/in/nicholasxydis",
} as const;
