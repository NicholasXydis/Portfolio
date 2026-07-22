export interface BulletListProps {
  text: string;
  className?: string;
  id?: string;
}

function renderPoint(point: string) {
  const match = point.match(/^([^:]{1,40}): (.+)$/);
  if (!match) {
    return point;
  }
  const [, label, rest] = match;
  return (
    <>
      <strong className="font-semibold text-white">{label}:</strong> {rest}
    </>
  );
}

export function BulletList({ text, className, id }: BulletListProps) {
  const points = text.split("\n").filter((point) => point.trim().length > 0);

  return (
    <ul id={id} className={className}>
      {points.map((point) => (
        <li key={point} className="flex gap-2.5">
          <span
            aria-hidden="true"
            className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-white/40"
          />
          <span>{renderPoint(point)}</span>
        </li>
      ))}
    </ul>
  );
}
