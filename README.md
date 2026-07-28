<div align="center">

# Nicholas Xydis | Portfolio

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=FFFFFF&center=true&vCenter=true&width=700&lines=Bilingual+Developer+Portfolio;TypeScript+%7C+React+%7C+Vite;English+%2F+French+%7C+SEO+%7C+Motion;217+Tests+%7C+Lighthouse+90%2B+%7C+Cloudflare+Pages)](https://git.io/typing-svg)

A bilingual personal portfolio built to showcase my work, case studies, and engineering practices.

<br>

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/typescript.svg" alt="TypeScript" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" alt="React" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/tailwindcss.svg" alt="Tailwind CSS" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg" alt="Vite" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/githubactions/githubactions-original.svg" alt="GitHub Actions" width="52" height="52">
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/xandemon/developer-icons@main/icons/cloudflare.svg" alt="Cloudflare Pages" width="52" height="52">
</p>

<p align="center">
  <strong>English + French</strong> &nbsp;|&nbsp;
  <strong>217 automated tests</strong> &nbsp;|&nbsp;
  <strong>Lighthouse 90+</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Lighthouse-100%20%C2%B7%20100%20%C2%B7%2096%20%C2%B7%20100-brightgreen?style=flat-square&logo=lighthouse&logoColor=white" alt="Lighthouse: Performance 100, Accessibility 100, Best Practices 96, SEO 100">
  &nbsp;
  <img src="https://img.shields.io/badge/SSL%20Labs-A%2B-brightgreen?style=flat-square&logo=letsencrypt&logoColor=white" alt="SSL Labs grade A+">
  &nbsp;
  <img src="https://img.shields.io/badge/Uptime-100%25-brightgreen?style=flat-square&logo=uptimerobot&logoColor=white" alt="UptimeRobot 100% uptime">
</p>

<a href="https://nicholasxydis.ca">
  <img src="docs/portfolio-btn.svg" alt="View live site">
</a>

</div>

## Features

- **Bilingual:** Complete English and French routes with a language toggle that keeps you on the same page and preserves your place.
- **Case studies:** A dedicated page for each project, with the story, the tech, and links to the live site and source.
- **SEO:** Clean titles, canonical URLs, language alternates, social share cards, and a generated sitemap so every page is discoverable.
- **Motion:** Smooth page transitions and scroll effects that respect a visitor's reduced-motion preference.
- **Resilience:** A friendly bilingual 404 page and an error boundary so an unexpected failure never shows a blank screen.

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
| Unit / component tests |     123 | Vitest, Testing Library                         |
| End-to-end checks      |      94 | Playwright, axe-core, desktop + mobile Chromium |
| **Total**              | **217** | CI-enforced                                     |

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

<p align="center">
  <img src="https://img.shields.io/badge/Performance-100-brightgreen?style=flat-square&logo=lighthouse&logoColor=white" alt="Performance 100">
  &nbsp;
  <img src="https://img.shields.io/badge/Accessibility-100-brightgreen?style=flat-square&logo=lighthouse&logoColor=white" alt="Accessibility 100">
  &nbsp;
  <img src="https://img.shields.io/badge/Best%20Practices-96-green?style=flat-square&logo=lighthouse&logoColor=white" alt="Best Practices 96">
  &nbsp;
  <img src="https://img.shields.io/badge/SEO-100-brightgreen?style=flat-square&logo=lighthouse&logoColor=white" alt="SEO 100">
</p>

<div align="center">
  <img src="docs/screenshots/lighthouse.png" alt="Lighthouse scores" width="100%">
</div>

<!-- TODO: add docs/screenshots/lighthouse.png -->

### SSL Labs

<p align="center">
  <img src="https://img.shields.io/badge/SSL%20Labs-A%2B-brightgreen?style=flat-square&logo=letsencrypt&logoColor=white" alt="SSL Labs grade A+">
</p>

<div align="center">
  <img src="docs/screenshots/ssl-report.png" alt="SSL Labs report for nicholasxydis.ca" width="100%">
</div>

<!-- TODO: add docs/screenshots/ssl-report.png -->

**Grade A+** across all four Cloudflare edge servers (IPv4 and IPv6).

### Uptime Monitoring

<p align="center">
  <img src="https://img.shields.io/badge/Uptime-100%25-brightgreen?style=flat-square&logo=uptimerobot&logoColor=white" alt="UptimeRobot 100% uptime">
</p>

<div align="center">
  <img src="docs/screenshots/uptime-robot.png" alt="UptimeRobot production availability monitor" width="100%">
</div>

**External monitoring:** UptimeRobot checks the production site every five minutes — **100% availability, zero incidents**.

<!-- TODO: add docs/screenshots/uptime-robot.png -->

## License

Copyright © 2026 Nicholas Xydis. All rights reserved.

This repository and its contents are made available for viewing purposes only. See the [license](LICENSE) for the complete terms.
