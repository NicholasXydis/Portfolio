import type { ReactNode } from "react";

export interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function Section({ id, title, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="grid scroll-mt-24 gap-4 sm:grid-cols-[8rem_1fr] sm:gap-8"
    >
      <h2
        id={`${id}-heading`}
        className="text-sm font-semibold uppercase tracking-wide text-white/50"
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
