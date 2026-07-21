import { useState } from "react";

export interface EntryLogoProps {
  src?: string;
}

export function EntryLogo({ src }: EntryLogoProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <span className="block h-11 w-11 shrink-0 overflow-hidden rounded-lg">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={44}
        height={44}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
