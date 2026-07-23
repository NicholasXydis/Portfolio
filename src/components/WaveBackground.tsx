import { Waves } from "@/components/ui/wave-background";

export function WaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <Waves
        strokeColor="rgba(255,255,255,0.12)"
        backgroundColor="transparent"
      />
    </div>
  );
}
