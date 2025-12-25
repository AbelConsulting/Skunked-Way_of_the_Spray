Highscore Serverless Setup (Netlify)

Required environment variables (set in Netlify Site → Site settings → Build & deploy → Environment):

- GITHUB_TOKEN: GitHub token with repo access (if using Git-based storage). Keep secret.
- REPO_OWNER: GitHub owner/org (e.g., AbelConsulting)
- REPO_NAME: Repository name (SkunkFU)
- FILE_PATH: (optional) Path to leaderboard file in repo (default: leaderboard.json)
- BRANCH: (optional) Branch to commit to (default: main)
- RECAPTCHA_SECRET: (recommended) Server-side secret for Google reCAPTCHA verification
- RECAPTCHA_MIN_SCORE: (optional) Minimum score for v3 reCAPTCHA (default: 0.3)
- RATE_LIMIT_MAX: (optional) Max submissions per IP per hour (default: 10)
- S3_BUCKET: (required for S3 mode) S3 bucket name to store `leaderboard.json`
- S3_KEY: (optional) Key/path inside bucket for leaderboard file (default: leaderboard.json)
- AWS_REGION: (optional) AWS region of the S3 bucket (default: us-east-1)

If S3 env vars are configured, the submit/get functions will use S3 storage instead of attempting to write to the GitHub repo.
Notes:
- This repo currently uses a Netlify function that commits leaderboard updates to the repository using the GitHub API. This is simple but not recommended for heavy/public usage because:
  - It writes to git history and can be abused/spammed.
  - Concurrency and rate-limiting are harder; use a persistent store (S3, KV) for scale.
- For production, consider replacing repo commits with a blob store (S3/Cloudflare KV) and using a database or cache for rate-limiting.
- Remember to set `RECAPTCHA_SECRET` and configure `RECAPTCHA_SITE_KEY` on the client to enable anti-abuse protection.
