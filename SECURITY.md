# Security Policy

## Supported Version

| Version | Supported |
| ------- | --------- |
| 0.x     | Yes       |

## Reporting a Vulnerability

Do not open a public issue for suspected vulnerabilities, leaked credentials, or exposure of the deployed site or its build pipeline.

Report security issues privately to the repository owner with:

- affected page, component, or workflow
- reproduction steps
- expected impact
- relevant logs or screenshots with secrets removed

I will review valid reports as quickly as possible and prioritize fixes based on severity and exploitability.

## Scope

In scope:

- cross-site scripting (XSS) or content-injection issues
- security header or Content Security Policy misconfiguration
- dependency or supply-chain vulnerabilities affecting the build
- leaked secrets or credentials in the repository or build output
- deployment or Cloudflare Pages misconfiguration affecting this site

Out of scope:

- denial-of-service testing against production without permission
- social engineering
- automated spam or scraping
- reports requiring access to secrets, private keys, or accounts you do not own

## Handling of Secrets

This is a static site with no backend. No secrets are committed to the repository. Runtime configuration (for example the PostHog key) is provided through Cloudflare Pages environment variables, never checked into source control.
