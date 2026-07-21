<div align="center">

# Portfolio

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=4A90D9&center=true&vCenter=true&width=760&lines=Bilingual+Software+Engineer+Portfolio;React+19+%7C+TypeScript+%7C+Vite+%7C+Tailwind;i18n+FR%2FEN+%7C+Zod+Content+Schemas;Cloudflare+Pages+%7C+Accessible+by+Design)](https://git.io/typing-svg)

A fast, accessible, bilingual (French/English) portfolio for a software engineer.

<br>

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/typescript.svg" alt="TypeScript" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" alt="React" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg" alt="Vite" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/tailwindcss.svg" alt="Tailwind CSS" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/cloudflare.svg" alt="Cloudflare" width="52" height="52">
</p>

<p align="center">
  <strong>French + English</strong> &nbsp;|&nbsp;
  <strong>Zod-validated content</strong> &nbsp;|&nbsp;
  <strong>Accessibility-first</strong> &nbsp;|&nbsp;
  <strong>Static on Cloudflare Pages</strong>
</p>

</div>

<br>

## About

A bilingual portfolio site targeting French and English speaking recruiters. It is built as a static single-page application with React, TypeScript, and Vite, styled with Tailwind CSS, and served from Cloudflare Pages. Every locale is a first-class route (`/en/…`, `/fr/…`), all project and experience content is validated by Zod schemas at build time, and accessibility is treated as a build gate rather than an afterthought.

The site is designed to be trivial to extend: adding a new project or experience is a matter of dropping a JSON entry into the content folder. A malformed entry fails the build loudly instead of shipping broken.

## Quality Highlights

- Bilingual routing (`/en/` and `/fr/`) with a functional language toggle that preserves the current path.
- Content modelled with Zod schemas; TypeScript types are derived via `z.infer`, never hand-duplicated.
- Build-time content validation gate: an invalid project or experience entry fails `npm run build`.
- Dark-only, mobile-first layout with semantic HTML, a skip-to-content link, and keyboard-navigable interactions.
- `prefers-reduced-motion` respected in base styles, ready for Framer Motion in the polish phase.
- Strict TypeScript, ESLint, and Prettier enforced across the codebase.

## Features

- **Bilingual experience:** complete French and English routes powered by `react-i18next`, with `<html lang>` synced to the active locale.
- **Data-driven content:** projects, experiences, and education are JSON entries validated against Zod schemas.
- **Core pages:** home (about, experience, education, projects, contact), projects list, project / case-study detail, and a bilingual 404.
- **Case studies:** per-project detail pages with tags, summary, body, external links, and a "last updated" timestamp.
- **SEO:** localized `<title>`/description, canonical URLs, `hreflang` alternates (+ `x-default`), Open Graph and Twitter tags per page, a build-time `sitemap.xml` with hreflang, and `robots.txt`.
- **Contact:** LinkedIn, GitHub, and email as accessible icon links (`mailto:` for email).
- **Accessibility:** skip link, semantic landmarks, `aria-current` on the active language, and meaningful headings.
- **Security-conscious links:** all external links use `rel="noopener noreferrer" target="_blank"`.

## Architecture

```text
Portfolio/
├─ src/
│  ├─ components/        Dumb, reusable UI (SkipToContent, ExternalLink, LanguageToggle)
│  ├─ features/          Feature-scoped logic (project-list)
│  ├─ content/           JSON data + Zod schemas + validated loader
│  ├─ hooks/             useLocale and other shared hooks
│  ├─ lib/               Pure helpers (i18n init, localized path/text)
│  ├─ locales/           en.json / fr.json UI translations
│  ├─ routes/            Page-level components (Home, Projects, Detail, 404, LocaleLayout)
│  └─ test/              Test setup and render helper
├─ scripts/
│  └─ validateContent.ts Build-time content validation gate
├─ public/               Static assets (favicon)
├─ index.html            App shell
├─ vite.config.ts        Vite + path alias configuration
├─ vitest.config.ts      Unit/component test configuration
├─ tailwind.config.ts    Tailwind theme (fonts, dark mode)
└─ tsconfig.*.json       Strict TypeScript project references
```

<div align="center">
<pre>
┌─────────────────────────────────────────────────────────┐
│                    Recruiter Browser                    │
│      Bilingual FR/EN SPA, SEO metadata, analytics       │
└────────────────────────────┬────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────┐
│                  Cloudflare Edge Network                │
│         TLS, DNS, security headers, edge caching        │
└────────────────────────────┬────────────────────────────┘
                             │ Static assets
┌────────────────────────────▼────────────────────────────┐
│                  Cloudflare Pages (CDN)                 │
│            Vite static build output (dist/)             │
└────────────────────────────┬────────────────────────────┘
                             │ Loaded in browser
┌────────────────────────────▼────────────────────────────┐
│                  React SPA (client-side)                │
│   Routing, i18n, Zod-validated content, case studies    │
└─────────────────────────────────────────────────────────┘
</pre>
</div>

## Tech Stack

| Area       | Stack                                          |
| ---------- | ---------------------------------------------- |
| Frontend   | React 19, TypeScript (strict), Vite 7          |
| Styling    | Tailwind CSS, Framer Motion                    |
| Testing    | Vitest, React Testing Library, Playwright, axe |
| Hosting    | Cloudflare Pages                               |
| Analytics  | PostHog (cookieless)                           |
| Monitoring | UptimeRobot                                    |

## Content Model

All content lives in [src/content/](src/content/) and is validated by Zod schemas in [src/content/schemas.ts](src/content/schemas.ts). TypeScript types are derived from those schemas with `z.infer`, so the data and the types can never drift apart.

**Adding a project** — append an object to [src/content/projects.json](src/content/projects.json):

```json
{
  "slug": "my-project",
  "title": { "en": "My Project", "fr": "Mon projet" },
  "startDate": "2025-01-01",
  "endDate": null,
  "lastUpdated": "2025-02-01",
  "tags": ["React", "TypeScript"],
  "summary": { "en": "One-line summary.", "fr": "Résumé d'une ligne." },
  "body": { "en": "Full case study.", "fr": "Étude de cas complète." },
  "links": [
    {
      "label": { "en": "Live", "fr": "En ligne" },
      "href": "https://example.com"
    }
  ],
  "images": [],
  "featured": false
}
```

**Adding an experience or education entry** — append an object to [src/content/experiences.json](src/content/experiences.json) (`ExperienceSchema`) or [src/content/educations.json](src/content/educations.json) (`EducationSchema`). Empty sections are hidden automatically.

Every entry must provide both `en` and `fr` variants for localized fields. Slugs must be kebab-case and dates must be `YYYY-MM-DD`. Run `npm run validate:content` (also run automatically on `npm run build`) — a malformed entry fails loudly with a Zod error instead of shipping broken. The production origin used for canonical/OG/sitemap URLs is configured via `VITE_SITE_URL` (see [.env.example](.env.example)).

## Testing

| Suite                    | Tools                               | Scope                                                |
| ------------------------ | ----------------------------------- | ---------------------------------------------------- |
| Unit and component tests | Vitest, React Testing Library       | Schemas, helpers, components, pages, routing         |
| End-to-end tests         | Playwright (desktop + mobile)       | Navigation, language toggle, 404, project detail     |
| Accessibility scans      | axe-core via `@axe-core/playwright` | Every route (EN/FR/404) against WCAG 2.1 A/AA        |
| Performance budgets      | Lighthouse CI                       | Performance, accessibility, best-practices, SEO ≥ 90 |

Unit and component coverage includes the happy path plus edge cases — malformed content entries, missing locale variants, unknown project slugs, empty project lists — and is gated by a coverage threshold (90% statements/functions/lines). End-to-end runs execute against the production build served by `vite preview`, on desktop and mobile Chromium, and every route is analysed with `axe-core`; accessibility regressions fail the build. Lighthouse CI enforces a 90+ budget across all four categories.

## Available Scripts

| Script                     | Purpose                                          |
| -------------------------- | ------------------------------------------------ |
| `npm run dev`              | Start the Vite dev server                        |
| `npm run build`            | Validate content, typecheck, and build to `dist` |
| `npm run preview`          | Preview the production build locally             |
| `npm run lint`             | Run ESLint                                       |
| `npm run typecheck`        | Run `tsc --noEmit`                               |
| `npm run test`             | Run the Vitest suite once                        |
| `npm run test:watch`       | Run Vitest in watch mode                         |
| `npm run test:coverage`    | Run Vitest with coverage and thresholds          |
| `npm run test:e2e`         | Run Playwright end-to-end + accessibility tests  |
| `npm run validate:content` | Validate all content JSON against Zod schemas    |
| `npm run format`           | Format the codebase with Prettier                |
| `npm run format:check`     | Check formatting without writing                 |

## Getting Started

### Prerequisites

- Node.js 20+ (22 recommended)
- npm 10+

### Install and run

```powershell
npm install
npm run dev
```

The dev server serves the app locally; open the printed URL and it redirects to `/en`.

### Verify the build

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## CI/CD

| Workflow   | File                             | Purpose                                                                                                             |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| CI         | `.github/workflows/ci.yml`       | Format, lint, typecheck, unit tests + coverage, build, Playwright E2E + axe, Lighthouse CI, Cloudflare Pages deploy |
| Security   | `.github/workflows/security.yml` | CodeQL (TypeScript + Actions) and dependency review on pull requests                                                |
| Dependabot | `.github/dependabot.yml`         | Weekly npm and GitHub Actions dependency update PRs                                                                 |

The CI pipeline gates each stage on the previous one: a single `verify` job runs format, lint, typecheck, unit tests with coverage, and build; `e2e` and `lighthouse` run only after `verify` passes; and `deploy` to Cloudflare Pages runs only on `main`, only after both `e2e` and `lighthouse` succeed. Every workflow declares a least-privilege `permissions` block, sets an explicit `timeout-minutes`, and pins every third-party action to a full commit SHA so a hijacked tag cannot inject code into the pipeline. CodeQL analyses the TypeScript source and the workflow definitions themselves, and dependency review blocks pull requests that introduce high-severity vulnerable dependencies.

Any required gate failure blocks the release.

### Security headers

Production responses are hardened at the edge through the Cloudflare [public/\_headers](public/_headers) file: a strict Content Security Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` (camera, microphone, geolocation, and other unused APIs denied), `X-Frame-Options: DENY`, and HSTS. See [SECURITY.md](SECURITY.md) for the vulnerability reporting policy.

### Deploying

Cloudflare Pages deployment requires two repository secrets: `CLOUDFLARE_API_TOKEN` (scoped to Pages) and `CLOUDFLARE_ACCOUNT_ID`. No secrets are committed; runtime configuration is supplied through Cloudflare Pages environment variables.

## License

Portfolio is released under the [MIT License](LICENSE).
