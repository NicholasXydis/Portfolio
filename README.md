<div align="center">

# Nicholas Xydis | Portfolio

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=FFFFFF&center=true&vCenter=true&width=700&lines=Bilingual+Developer+Portfolio;React+19+%7C+TypeScript+%7C+Vite;English+%2F+French+%7C+SEO+%7C+Motion;188+Tests+%7C+Lighthouse+90%2B+%7C+Cloudflare+Pages)](https://git.io/typing-svg)

A bilingual personal portfolio built to showcase my work, case studies, and engineering practices.

<br>

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" alt="React" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/typescript.svg" alt="TypeScript" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg" alt="Vite" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/tailwindcss.svg" alt="Tailwind CSS" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/githubactions/githubactions-original.svg" alt="GitHub Actions" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/cloudflare.svg" alt="Cloudflare Pages" width="52" height="52">
</p>

<p align="center">
  <strong>English + French</strong> &nbsp;|&nbsp;
  <strong>188 automated tests</strong> &nbsp;|&nbsp;
  <strong>Lighthouse 90+</strong> &nbsp;|&nbsp;
  <strong>Cloudflare Pages deployed</strong>
</p>

<a href="https://nicholasxydis.ca">
  <img src="docs/portfolio-btn.svg" alt="View live site">
</a>

</div>

## About

This is my personal portfolio: home page, project case studies, experience, and education, in English and French. It's a fully static single-page app, deployed to Cloudflare Pages behind GitHub Actions CI.

## Features

- **Bilingual:** complete English and French routes with a language toggle that keeps you on the same page and preserves your place.
- **Case studies:** a dedicated page for each project, with the story, the tech, and links to the live site and source.
- **SEO:** clean titles, canonical URLs, language alternates, social share cards, and a generated sitemap so every page is discoverable.
- **Motion:** smooth page transitions and scroll effects that respect a visitor's reduced-motion preference.
- **Analytics:** lightweight, privacy-conscious visit tracking that only turns on when configured.
- **Resilience:** a friendly bilingual 404 page and an error boundary so an unexpected failure never shows a blank screen.

## Architecture

```text
Portfolio/
├─ src/
│  ├─ components/     Shared UI primitives (Seo, ErrorBoundary, icons, motion helpers)
│  ├─ content/         Zod schemas + JSON content (projects, experience, education, stack)
│  ├─ features/        Page sections (project-list, experience-list, education-list, contact, tech-stack)
│  ├─ hooks/           useLocale, useScrollRestoration, usePageViews, and other shared hooks
│  ├─ lib/             i18n, SEO metadata, analytics, dates, and other utilities
│  ├─ locales/         English and French translation dictionaries
│  ├─ routes/          HomePage, ProjectDetailPage, NotFoundPage, LocaleLayout
│  └─ test/            Shared test render helpers
├─ e2e/                Playwright navigation, accessibility, responsive, and SEO specs
├─ scripts/            Content validation and sitemap generation scripts
└─ .github/workflows/  CI, security, and production deploy workflows
```

<div align="center">
<pre>
┌─────────────────────────────────────────────────────────┐
│                     Visitor Browser                     │
│      Bilingual UI, SEO metadata, PostHog analytics      │
└────────────────────────────┬────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────┐
│                  Cloudflare Pages Edge                  │
│    Global CDN, TLS, static asset serving, redirects     │
└────────────────────────────┬────────────────────────────┘
                             │ Build artifact
┌────────────────────────────▼────────────────────────────┐
│                    Vite Static Build                    │
│         Localized HTML, CSS, JavaScript, assets         │
└─────────────────────────────────────────────────────────┘
</pre>
</div>

## Tech Stack

| Area     | Stack                                         |
| -------- | --------------------------------------------- |
| Frontend | React 19, TypeScript, Tailwind CSS, Vite      |
| Testing  | Vitest, Testing Library, Playwright           |
| DevOps   | GitHub Actions, Cloudflare Pages, UptimeRobot |

## Testing

| Suite                  |   Count | Tools                                           |
| ---------------------- | ------: | ----------------------------------------------- |
| Unit / component tests |     120 | Vitest, Testing Library                         |
| End-to-end checks      |      68 | Playwright, axe-core, desktop + mobile Chromium |
| **Total**              | **188** | CI-enforced                                     |

End-to-end coverage includes automated accessibility scans against WCAG 2.1 A/AA on every public route, the 404 page, and both locales.

## CI/CD

| Workflow          | File                                      | Purpose                                                                           |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| CI                | `.github/workflows/ci.yml`                | Format, lint, typecheck, unit tests + coverage, build, Playwright E2E, Lighthouse |
| Security          | `.github/workflows/security.yml`          | CodeQL and dependency review                                                      |
| Deploy Production | `.github/workflows/deploy-production.yml` | Build and publish to Cloudflare Pages                                             |

<div align="center">
  <img src="docs/ci-cd-flow.svg" alt="CI and security checks gate the production deploy to Cloudflare Pages" width="100%">
</div>

Lighthouse CI enforces a minimum score of 90 across Performance, Accessibility, Best Practices, and SEO on every push. Any required check failing blocks the release.

## Quality Gates

### Lighthouse

<div align="center">
  <img src="docs/screenshots/lighthouse.png" alt="Lighthouse scores" width="100%">
</div>

<!-- TODO: add docs/screenshots/lighthouse.png -->

### SSL Labs

<div align="center">
  <img src="docs/screenshots/ssl-report.png" alt="SSL Labs report for nicholasxydis.ca" width="100%">
</div>

<!-- TODO: add docs/screenshots/ssl-report.png -->

### Uptime Monitoring

<div align="center">
  <img src="docs/screenshots/uptime-robot.png" alt="UptimeRobot production availability monitor" width="100%">
</div>

**External monitoring:** UptimeRobot checks the production site every five minutes.

<!-- TODO: add docs/screenshots/uptime-robot.png -->

## License

Copyright © 2026 Nicholas Xydis. All rights reserved.

This repository and its contents are made available for viewing purposes only. See the [license](LICENSE) for the complete terms.
