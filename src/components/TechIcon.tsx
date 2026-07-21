import type { CSSProperties } from "react";
import { TECH_ICON_FILES } from "@/lib/techIcons";

export interface TechIconProps {
  name: string;
  className?: string;
}

export function TechIcon({
  name,
  className = "h-[1.15rem] w-[1.15rem]",
}: TechIconProps) {
  const file = TECH_ICON_FILES[name];
  if (!file) return null;

  const url = `url(/tech-icons/${file}.svg)`;
  const maskStyle: CSSProperties = {
    maskImage: url,
    WebkitMaskImage: url,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  };

  return (
    <span
      aria-hidden="true"
      className={`shrink-0 bg-current ${className}`}
      style={maskStyle}
    />
  );
}
