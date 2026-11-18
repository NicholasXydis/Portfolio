import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Brand,
  DayNightButton,
  HeaderBar,
  LanguagePill,
  PillNav,
  RadioPill,
  useKoiTheme,
  type KoiTheme,
} from "@/components/koi";
import { prepare, setMuted, useMusic } from "@/features/music";
import { WorldPill } from "./WorldPill";
import { LITE_SECTIONS, type LiteSectionId } from "./sections";

export interface NavClick {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
}

export interface LiteHeaderProps {
  active: LiteSectionId;
  onNavigate: (id: LiteSectionId, event: NavClick) => void;
}

const SECTION_IDS = new Set<string>(LITE_SECTIONS.map(({ id }) => id));

function isSectionId(value: string): value is LiteSectionId {
  return SECTION_IDS.has(value);
}

export function LiteHeader({ active, onNavigate }: LiteHeaderProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useKoiTheme();
  const { playing } = useMusic();
  const toggleMusic = useCallback((next: boolean) => setMuted(!next), []);
  useEffect(() => {
    prepare();
  }, []);
  const navRef = useRef<HTMLDivElement>(null);

  const changeTheme = useCallback(
    (next: KoiTheme) => setTheme(next),
    [setTheme],
  );

  const items = useMemo(
    () =>
      LITE_SECTIONS.map(({ id, labelKey }) => ({
        id,
        label: t(labelKey),
        href: `#${id}`,
      })),
    [t],
  );

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href^='#']");
      const id = link?.getAttribute("href")?.slice(1) ?? "";
      if (isSectionId(id)) onNavigate(id, event);
    };
    nav.addEventListener("click", onClick);
    return () => nav.removeEventListener("click", onClick);
  }, [onNavigate]);

  return (
    <HeaderBar
      className="lite-header"
      brand={<Brand />}
      nav={
        <div ref={navRef} className="lite-nav">
          <PillNav
            items={items}
            activeId={active}
            label={t("lite.nav.label")}
          />
        </div>
      }
      controls={
        <div className="koi-cluster lite-cluster">
          <WorldPill className="lite-world-pill--header" />
          <DayNightButton theme={theme} onChange={changeTheme} />
          <RadioPill playing={playing} onToggle={toggleMusic} />
          <LanguagePill />
        </div>
      }
    />
  );
}
