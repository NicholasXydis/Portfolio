import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { createNoise2D } from "simplex-noise";

interface Point {
  x: number;
  y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number; vx: number; vy: number };
}

export interface WavesProps {
  className?: string;
  strokeColor?: string;
  backgroundColor?: string;
  pointerSize?: number;
}

export function Waves({
  className = "",
  strokeColor = "#ffffff",
  backgroundColor = "#000000",
  pointerSize = 0.5,
}: WavesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const noise = createNoise2D();
    const mouse = {
      x: -10,
      y: 0,
      lx: 0,
      ly: 0,
      sx: 0,
      sy: 0,
      v: 0,
      vs: 0,
      a: 0,
      set: false,
    };
    let paths: SVGPathElement[] = [];
    let lines: Point[][] = [];
    let bounding = container.getBoundingClientRect();
    let raf = 0;

    const setSize = () => {
      bounding = container.getBoundingClientRect();
      svg.style.width = `${bounding.width}px`;
      svg.style.height = `${bounding.height}px`;
    };

    const setLines = () => {
      const { width, height } = bounding;
      lines = [];
      paths.forEach((path) => path.remove());
      paths = [];

      const xGap = width < 640 ? 12 : 8;
      const yGap = width < 640 ? 12 : 8;
      const oWidth = width + 200;
      const oHeight = height + 30;
      const totalLines = Math.ceil(oWidth / xGap);
      const totalPoints = Math.ceil(oHeight / yGap);
      const xStart = (width - xGap * totalLines) / 2;
      const yStart = (height - yGap * totalPoints) / 2;

      for (let i = 0; i < totalLines; i += 1) {
        const points: Point[] = [];
        for (let j = 0; j < totalPoints; j += 1) {
          points.push({
            x: xStart + xGap * i,
            y: yStart + yGap * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 },
          });
        }
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", strokeColor);
        path.setAttribute("stroke-width", "1");
        svg.appendChild(path);
        paths.push(path);
        lines.push(points);
      }
    };

    const movePoints = (time: number) => {
      lines.forEach((points) => {
        points.forEach((p) => {
          const move =
            noise((p.x + time * 0.008) * 0.003, (p.y + time * 0.003) * 0.002) *
            8;
          p.wave.x = Math.cos(move) * 12;
          p.wave.y = Math.sin(move) * 6;

          const dx = p.x - mouse.sx;
          const dy = p.y - mouse.sy;
          const d = Math.hypot(dx, dy);
          const l = Math.max(175, mouse.vs);

          if (d < l) {
            const s = 1 - d / l;
            const f = Math.cos(d * 0.001) * s;
            p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00035;
            p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00035;
          }

          p.cursor.vx += (0 - p.cursor.x) * 0.01;
          p.cursor.vy += (0 - p.cursor.y) * 0.01;
          p.cursor.vx *= 0.95;
          p.cursor.vy *= 0.95;
          p.cursor.x += p.cursor.vx;
          p.cursor.y += p.cursor.vy;
          p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
          p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
        });
      });
    };

    const moved = (point: Point, withCursorForce = true) => ({
      x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
      y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0),
    });

    const drawLines = () => {
      lines.forEach((points, lIndex) => {
        const path = paths[lIndex];
        const first = points[0];
        if (points.length < 2 || !path || !first) return;

        const start = moved(first, false);
        let d = `M ${start.x} ${start.y}`;
        for (let i = 1; i < points.length; i += 1) {
          const point = points[i];
          if (!point) continue;
          const current = moved(point);
          d += `L ${current.x} ${current.y}`;
        }
        path.setAttribute("d", d);
      });
    };

    const updateMousePosition = (x: number, y: number) => {
      mouse.x = x - bounding.left;
      mouse.y = y - bounding.top;
      if (!mouse.set) {
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
        mouse.lx = mouse.x;
        mouse.ly = mouse.y;
        mouse.set = true;
      }
      container.style.setProperty("--x", `${mouse.sx}px`);
      container.style.setProperty("--y", `${mouse.sy}px`);
    };

    const onMouseMove = (e: MouseEvent) =>
      updateMousePosition(e.clientX, e.clientY);

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updateMousePosition(touch.clientX, touch.clientY);
    };

    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        setSize();
        setLines();
      });
    };

    const tick = (time: number) => {
      mouse.sx += (mouse.x - mouse.sx) * 0.45;
      mouse.sy += (mouse.y - mouse.sy) * 0.45;
      const dx = mouse.x - mouse.lx;
      const dy = mouse.y - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d;
      mouse.vs += (d - mouse.vs) * 0.25;
      mouse.vs = Math.min(100, mouse.vs);
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.a = Math.atan2(dy, dx);
      container.style.setProperty("--x", `${mouse.sx}px`);
      container.style.setProperty("--y", `${mouse.sy}px`);
      movePoints(time);
      drawLines();
      raf = requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };

    setSize();
    setLines();

    if (prefersReducedMotion) {
      drawLines();
      return () => {
        paths.forEach((path) => path.remove());
      };
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      paths.forEach((path) => path.remove());
    };
  }, [strokeColor]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={
        {
          backgroundColor,
          position: "absolute",
          inset: 0,
          margin: 0,
          padding: 0,
          width: "100%",
          height: "100%",
          "--x": "-0.5rem",
          "--y": "50%",
        } as CSSProperties
      }
    >
      <svg
        ref={svgRef}
        className="block h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${pointerSize}rem`,
          height: `${pointerSize}rem`,
          background: strokeColor,
          borderRadius: "50%",
          transform:
            "translate3d(calc(var(--x) - 50%), calc(var(--y) - 50%), 0)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
