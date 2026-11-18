import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Fira Code", "ui-monospace", "SFMono-Regular", "monospace"],
        "koi-display": ["var(--koi-font-display)"],
        "koi-body": ["var(--koi-font-body)"],
      },
      colors: {
        koi: {
          bg: "var(--koi-bg)",
          surface: "var(--koi-surface)",
          "surface-2": "var(--koi-surface-2)",
          ink: "var(--koi-ink)",
          "ink-dim": "var(--koi-ink-dim)",
          "ink-faint": "var(--koi-ink-faint)",
          line: "var(--koi-line)",
          "line-strong": "var(--koi-line-strong)",
          glow: "var(--koi-glow)",
          "on-glow": "var(--koi-on-glow)",
          "glow-soft": "var(--koi-glow-soft)",
          seal: "var(--koi-seal)",
          "on-seal": "var(--koi-on-seal)",
          veil: "var(--koi-veil)",
        },
      },
      borderRadius: {
        "koi-pill": "var(--koi-radius-pill)",
        "koi-card": "var(--koi-radius-card)",
        "koi-seal": "var(--koi-radius-seal)",
      },
      boxShadow: {
        koi: "var(--koi-shadow)",
        "koi-halo": "var(--koi-halo)",
        "koi-halo-strong": "var(--koi-halo-strong)",
      },
      fontSize: {
        "koi-label": [
          "var(--koi-text-label)",
          { lineHeight: "1.4", letterSpacing: "var(--koi-track-label)" },
        ],
        "koi-small": ["var(--koi-text-small)", { lineHeight: "1.5" }],
        "koi-body": ["var(--koi-text-body)", { lineHeight: "1.65" }],
        "koi-lead": ["var(--koi-text-lead)", { lineHeight: "1.6" }],
        "koi-title": ["var(--koi-text-title)", { lineHeight: "1.25" }],
        "koi-heading": ["var(--koi-text-heading)", { lineHeight: "1.12" }],
        "koi-display": ["var(--koi-text-display)", { lineHeight: "1.02" }],
      },
      spacing: {
        "koi-1": "var(--koi-space-1)",
        "koi-2": "var(--koi-space-2)",
        "koi-3": "var(--koi-space-3)",
        "koi-4": "var(--koi-space-4)",
        "koi-5": "var(--koi-space-5)",
        "koi-6": "var(--koi-space-6)",
        "koi-7": "var(--koi-space-7)",
        "koi-8": "var(--koi-space-8)",
        "koi-control": "var(--koi-control)",
      },
      transitionTimingFunction: {
        koi: "var(--koi-ease)",
      },
      transitionDuration: {
        "koi-fast": "var(--koi-dur-fast)",
        koi: "var(--koi-dur)",
        "koi-slow": "var(--koi-dur-slow)",
      },
    },
  },
  plugins: [],
} satisfies Config;
