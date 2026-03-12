# Security Policy — Skunked: Way of the Spray

## Scope

This security policy covers the following components of *Skunked: Way of the Spray*:

| Component | Scope |
|-----------|-------|
| Web application (skunked.io) | ✅ In scope |
| Android APK / Google Play build | ✅ In scope |
| Game JavaScript (js/) | ✅ In scope |
| Netlify / Cloudflare hosting configuration | ✅ In scope |
| Third-party services (Google Ads, Google Fonts, hosting CDN) | ❌ Out of scope — report directly to the respective vendor |

## Supported Versions

We actively maintain the latest live production build. There is no versioned release model — the current deployment at [skunked.io](https://skunked.io) is always the supported version.

## Reporting a Vulnerability

**Please do not report security vulnerabilities via public GitHub Issues.**

To report a security issue, contact us privately:

- **Email:** [legal@mephitideusinteractive.com](mailto:legal@mephitideusinteractive.com)
- **Subject line:** `[SECURITY] Skunked: Way of the Spray — <brief description>`

Please include:
1. A clear description of the vulnerability and the potential impact.
2. The component or URL affected.
3. Steps to reproduce (proof-of-concept code or screenshots are helpful but never required).
4. Any suggested mitigations if you have them.

We ask that you give us a reasonable window to investigate and patch before any public disclosure (coordinated disclosure).

## Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgement | Within 5 business days |
| Initial assessment / severity triage | Within 10 business days |
| Patch or mitigation for critical issues | Within 30 days where feasible |
| Public disclosure coordination | Agreed with reporter |

## What We Consider a Vulnerability

Examples of issues we want to hear about:
- Cross-site scripting (XSS) in the web client
- Content Security Policy (CSP) bypass
- Insecure data exposure (e.g., sensitive data leaked via HTTP headers or JS globals)
- Clickjacking or UI redress attacks
- Dependency vulnerabilities with a realistic attack path in this application
- Android APK issues: WebView misconfigurations, exported components, insecure storage

## Out of Scope

The following are generally **not** considered valid security reports:
- Issues in third-party services (Google Ads, Netlify, Cloudflare) — report to them directly
- Missing "best practice" HTTP headers that do not have a practical exploit against this game
- Self-XSS or attacks that require full control of the victim's device
- Denial-of-service via resource exhaustion of the static hosting CDN
- Social engineering attacks

## Recognition

We appreciate responsible disclosure. We are not currently operating a paid bug-bounty program, but we will credit reporters in release notes unless they prefer to remain anonymous.

