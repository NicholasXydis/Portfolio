export const PET_BUZZ_MS = 12;

const PETS = [
  "master",
  "cat_black",
  "cat_white",
  "crane",
  "rabbit",
  "magpie_cinema",
] as const;

export function isPet(name: unknown): boolean {
  return typeof name === "string" && (PETS as readonly string[]).includes(name);
}

export function petBuzz(
  nav: Navigator | undefined = globalThis.navigator,
): boolean {
  if (!nav || typeof nav.vibrate !== "function") return false;
  if (!/Android/i.test(nav.userAgent)) return false;
  try {
    return nav.vibrate(PET_BUZZ_MS);
  } catch {
    return false;
  }
}
