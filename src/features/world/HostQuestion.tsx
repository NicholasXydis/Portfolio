import {
  forwardRef,
  useRef,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { focusRing } from "./chrome";
import { placeLabelKey } from "./places";
import { BookIcon, BriefcaseIcon, FrameIcon, PersonIcon } from "./icons";
import { PLACES, type Place } from "./types";

const TAG_HINT: Record<Place, string> = {
  about: "world.tagAbout",
  experience: "world.tagExperience",
  projects: "world.tagProjects",
  education: "world.tagEducation",
};

const TAG_ICON: Record<
  Place,
  ComponentType<{ size?: number; className?: string }>
> = {
  about: PersonIcon,
  experience: BriefcaseIcon,
  projects: FrameIcon,
  education: BookIcon,
};

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function compactScreen(): boolean {
  const { innerWidth: w, innerHeight: h } = window;
  return h <= 740 && !(h < 500 && w > h);
}

export interface HostQuestionProps {
  onChoose: (place: Place) => void;
  onJustLooking: () => void;
  onHint?: (place: Place | null) => void;
  visited?: readonly Place[];
}

export const HostQuestion = forwardRef<HTMLHeadingElement, HostQuestionProps>(
  function HostQuestion(
    { onChoose, onJustLooking, onHint, visited = [] },
    headingRef,
  ) {
    const { t } = useTranslation();
    const lastPointer = useRef<string>("mouse");
    const compact = useSyncExternalStore(
      subscribeResize,
      compactScreen,
      () => false,
    );
    return (
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-[5] isolate w-[min(560px,calc(100%-24px))] -translate-x-1/2 before:absolute before:-inset-x-[12%] before:-top-10 before:-z-10 before:h-[136px] before:bg-[var(--koi-bg)] before:[-webkit-mask-image:radial-gradient(ellipse_at_50%_50%,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.4)_42%,transparent_72%)] before:[mask-image:radial-gradient(ellipse_at_50%_50%,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.4)_42%,transparent_72%)] before:content-[''] min-[760px]:bottom-8 min-[760px]:w-[min(600px,calc(100%-32px))] min-[1450px]:bottom-10 min-[1450px]:w-[640px] [@media(min-width:760px)_and_(max-height:650px)]:bottom-4 [@media(min-width:760px)_and_(max-height:650px)]:w-[560px] [@media(max-height:500px)_and_(orientation:landscape)]:!bottom-2.5">
        <motion.section
          aria-labelledby="koi-host-question"
          className="pointer-events-auto text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.56, ease: [0.22, 0.61, 0.36, 1] },
          }}
          exit={{
            opacity: 0,
            y: 8,
            transition: { duration: 0.2, ease: [0.22, 0.61, 0.36, 1] },
          }}
        >
          <h2
            id="koi-host-question"
            ref={headingRef}
            tabIndex={-1}
            className="mx-auto mb-4 text-[18px] leading-[1.3] tracking-[-0.01em] text-[var(--koi-ink)] outline-none [font-family:var(--koi-font-display)] [text-shadow:0_2px_12px_var(--koi-bg),0_0_2px_var(--koi-bg)] min-[760px]:mb-[18px] min-[760px]:text-[22px] [@media(max-height:500px)_and_(orientation:landscape)]:mb-2 [@media(max-height:500px)_and_(orientation:landscape)]:text-[15px]"
          >
            {t("world.hostQuestion")}
          </h2>
          <ul className="grid grid-cols-4 gap-2 min-[760px]:gap-2.5 [@media(max-height:500px)_and_(orientation:landscape)]:gap-1.5">
            {PLACES.map((place) => {
              const Icon = TAG_ICON[place];
              const seen = visited.includes(place);
              return (
                <li key={place}>
                  <button
                    type="button"
                    onClick={() => onChoose(place)}
                    onPointerDown={(event) => {
                      lastPointer.current = event.pointerType;
                    }}
                    onPointerEnter={(event) => {
                      lastPointer.current = event.pointerType;
                      if (event.pointerType !== "touch") onHint?.(place);
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType !== "touch") onHint?.(null);
                    }}
                    onFocus={() => {
                      if (lastPointer.current !== "touch") onHint?.(place);
                    }}
                    onBlur={() => onHint?.(null)}
                    className={`group relative flex h-full min-h-[96px] w-full flex-col after:absolute after:inset-x-0 after:top-full after:h-2 after:content-[''] koi-glass koi-glass--slab koi-glass--press items-center justify-center gap-1.5 rounded-[var(--koi-radius-card)] px-[5px] pb-2.5 pt-[18px] text-[var(--koi-ink)] hover:-translate-y-1.5 focus-visible:-translate-y-1.5 active:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0 motion-reduce:active:translate-y-0 min-[441px]:min-h-[104px] min-[760px]:min-h-[106px] min-[760px]:gap-2 min-[760px]:px-2 min-[760px]:pb-3 min-[760px]:pt-5 min-[1450px]:min-h-[118px] [@media(min-width:760px)_and_(max-height:650px)]:min-h-[94px] [@media(max-height:500px)_and_(orientation:landscape)]:!min-h-[36px] [@media(max-height:500px)_and_(orientation:landscape)]:flex-row [@media(max-height:500px)_and_(orientation:landscape)]:gap-1.5 [@media(max-height:500px)_and_(orientation:landscape)]:!pb-[7px] [@media(max-height:500px)_and_(orientation:landscape)]:!pl-5 [@media(max-height:500px)_and_(orientation:landscape)]:!pt-[7px] ${
                      compact
                        ? "!min-h-[72px] !gap-1 !pb-2 !pt-4 min-[760px]:!min-h-[84px]"
                        : ""
                    } ${focusRing}`}
                  >
                    <span
                      aria-hidden="true"
                      data-seen={seen || undefined}
                      className={`absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full border transition-colors [@media(max-height:500px)_and_(orientation:landscape)]:left-[11px] [@media(max-height:500px)_and_(orientation:landscape)]:top-1/2 [@media(max-height:500px)_and_(orientation:landscape)]:-translate-y-1/2 [@media(max-height:500px)_and_(orientation:landscape)]:translate-x-0 duration-[var(--koi-dur)] ease-[var(--koi-ease)] ${
                        seen
                          ? "border-[var(--koi-glow)] bg-[var(--koi-glow)]"
                          : "border-[var(--koi-line-strong)]"
                      }`}
                    />
                    <Icon
                      size={20}
                      className="text-[var(--koi-ink-dim)] transition-colors group-hover:text-[var(--koi-ink)] min-[760px]:h-[22px] min-[760px]:w-[22px] [@media(max-height:500px)_and_(orientation:landscape)]:!h-[18px] [@media(max-height:500px)_and_(orientation:landscape)]:!w-[18px] [@media(max-height:500px)_and_(orientation:landscape)]:shrink-0"
                    />
                    <span className="text-[12px] leading-tight [font-family:var(--koi-font-display)] min-[760px]:text-[14px]">
                      {t(placeLabelKey[place])}
                    </span>
                    <span
                      className={`max-w-[88px] text-[12px] leading-snug text-[var(--koi-ink-dim)] min-[760px]:max-w-[120px] min-[760px]:text-[12px] [@media(max-height:500px)_and_(orientation:landscape)]:hidden ${
                        compact ? "hidden" : ""
                      }`}
                    >
                      {t(TAG_HINT[place])}
                    </span>
                    {seen && (
                      <span className="sr-only">, {t("world.seen")}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={onJustLooking}
            className={`koi-glass koi-glass--press mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-[var(--koi-radius-pill)] px-[13px] py-[7px] text-[12px] text-[var(--koi-ink-dim)] hover:text-[var(--koi-ink)] min-[760px]:mt-3.5 min-[760px]:text-[12px] [@media(min-width:760px)_and_(max-height:650px)]:mt-2 [@media(max-height:500px)_and_(orientation:landscape)]:mt-[7px] ${focusRing}`}
          >
            {t("world.justLooking")}
            <span aria-hidden="true">↗</span>
          </button>
        </motion.section>
      </div>
    );
  },
);
