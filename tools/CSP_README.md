CSP Dev Server
===============

This small server serves the project on port 8001 and injects a per-request
nonce into `index.html` replacing the `%CSP_NONCE%` placeholder, and sets a
strict `Content-Security-Policy` response header including that nonce.

Usage:

    node tools/csp_server.js

Then open http://localhost:8001 in your browser. The server will set a header
like:

    Content-Security-Policy: script-src 'self' 'nonce-<base64>' https://static.cloudflareinsights.com; object-src 'none'; base-uri 'self';

Notes:
- This is for development and testing only. In production, configure CSP on
  your webserver (e.g., nginx, CDN) and generate per-request nonces in your
  server-side templates.
- The script allows the Cloudflare Insights origin; remove it if you don't
  want to permit that external script.
