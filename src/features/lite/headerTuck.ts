export const SIDEWAYS_QUERY =
  "(max-height: 500px) and (orientation: landscape)";

const TUCK_GAP = 6;

export function headerTuck(
  navTop: number,
  brandTop: number,
  sideways: boolean,
): number {
  if (!sideways || navTop <= brandTop + 4) return 0;
  return Math.max(0, Math.round(navTop - TUCK_GAP));
}
