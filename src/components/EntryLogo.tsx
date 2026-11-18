import { useState } from "react";

export interface EntryLogoProps {
  src?: string;
}

const FULL_BLEED = new Set([
  "akuna.png",
  "cda.webp",
  "centre-auto-allard.ico",
  "cs-resource-hub.svg",
  "quarcc-purple.svg",
  "quarcc.jpg",
  "unity.svg",
]);

function fileName(src: string): string {
  return src.split("?")[0]?.split("/").pop() ?? src;
}

export function EntryLogo({ src }: EntryLogoProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  const full = FULL_BLEED.has(fileName(src));

  return (
    <span
      data-koi-theme="dark"
      className={`koi-entry-logo block h-11 w-11 shrink-0 overflow-hidden rounded-[calc(var(--koi-radius-card)-4px)] border border-koi-line bg-koi-surface ${full ? "" : "p-[6px]"}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={44}
        height={44}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full ${full ? "object-cover" : "object-contain"}`}
      />
    </span>
  );
}
