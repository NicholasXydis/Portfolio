import type { ReactNode } from "react";
import { SectionHeading } from "@/components/koi";

export interface LiteSectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function LiteSection({ id, title, children }: LiteSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="lite-section"
      tabIndex={-1}
    >
      <div data-reveal="">
        <SectionHeading
          id={`${id}-heading`}
          title={title}
          className="lite-head"
        />
        {children}
      </div>
    </section>
  );
}

export function LiteSubheading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h3 id={id} className="lite-h3">
      <span>{children}</span>
      <span className="lite-h3-line" aria-hidden="true" />
    </h3>
  );
}
