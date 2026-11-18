import type { ReactNode, SVGProps } from "react";

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
}

function Stroke({
  size = 18,
  children,
  className,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `koi-icon ${className}` : "koi-icon"}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ChatIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 12a8 7 0 1 1 3.2 5.6L4 19l1-3.3A6.6 6.6 0 0 1 4 12z" />
  </Stroke>
);
export const PersonIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Stroke>
);
export const BriefcaseIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3.5" y="7.5" width="17" height="11.5" rx="2" />
    <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" />
  </Stroke>
);
export const FrameIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M3.5 16l5-4.5 4 3.5 3-2.5 5 4" />
    <circle cx="15.5" cy="9.5" r="1.4" />
  </Stroke>
);
export const BookIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" />
  </Stroke>
);
