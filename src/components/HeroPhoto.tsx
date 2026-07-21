import { useState } from "react";

export function HeroPhoto() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="shrink-0 rounded-2xl bg-gradient-to-b from-white/12 via-white/10 to-white/35 p-px shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)]">
      <picture>
        <source srcSet="/portrait.webp" type="image/webp" />
        <img
          src="/portrait.jpg"
          alt="Nicholas Xydis"
          width={208}
          height={208}
          onError={() => setFailed(true)}
          className="h-44 w-44 rounded-2xl object-cover sm:h-52 sm:w-52"
        />
      </picture>
    </div>
  );
}
