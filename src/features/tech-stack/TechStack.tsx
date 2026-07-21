import type { StackGroup } from "@/content/schemas";
import { useLocale } from "@/hooks/useLocale";
import { pickLocalized } from "@/lib/localized";
import { TechIcon } from "@/components";

export interface TechStackProps {
  groups: StackGroup[];
}

export function TechStack({ groups }: TechStackProps) {
  const locale = useLocale();

  return (
    <dl className="space-y-5">
      {groups.map((group) => (
        <div key={group.label.en}>
          <dt className="mb-2 font-mono text-xs uppercase tracking-wide text-white/40">
            {pickLocalized(group.label, locale)}
          </dt>
          <dd>
            <ul className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-sm text-white/75 transition-colors hover:border-white/20 hover:text-white"
                >
                  <TechIcon name={item} />
                  {item}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
