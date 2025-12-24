// Netlify Function: submit-score
// Expects POST { score: number, initials: string }
// Requires environment variables set in Netlify:
// GITHUB_TOKEN - Personal Access Token with repo contents write access
// REPO_OWNER - GitHub owner/org (e.g., AbelConsulting)
// REPO_NAME - Repository name (e.g., SkunkFU)
// FILE_PATH - path in repo to leaderboard file (default: leaderboard.json)
// BRANCH - branch to commit to (default: main)

const MAX_ENTRIES = 100;

// Simple in-memory rate limiter (best-effort for serverless warm containers).
// For production use consider Redis, Cloudflare KV, or a hosted rate-limit service.
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '10', 10); // max submissions per IP per window
const ipCounter = new Map(); // { ip -> { count, firstTs } }

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const score = (typeof body.score === 'number') ? Math.floor(body.score) : null;
  const initials = (typeof body.initials === 'string') ? body.initials.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3) : '---';
  const recaptchaToken = typeof body.recaptchaToken === 'string' ? body.recaptchaToken : null;

  if (score === null || score < 0) return { statusCode: 400, body: JSON.stringify({ error: 'bad_score' }) };

  // Extract client IP (try several headers - depends on platform)
  const headers = event.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['x-nf-client-connection-ip'] || headers['x-nf-client-ip'] || headers['x-client-ip'] || '';
  const ip = (forwarded && forwarded.split && forwarded.split(',')[0].trim()) || 'unknown';

  // Rate limiting check
  try {
    const now = Date.now();
    const st = ipCounter.get(ip) || { count: 0, firstTs: now };
    if (now - st.firstTs > RATE_LIMIT_WINDOW) {
      st.count = 0; st.firstTs = now;
    }
    st.count += 1;
    ipCounter.set(ip, st);
    if (st.count > RATE_LIMIT_MAX) {
      return { statusCode: 429, body: JSON.stringify({ error: 'rate_limited' }) };
    }
  } catch (e) {
    console.warn('rate limit check failed', e);
  }

  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.BRANCH || 'main';
  const filePath = process.env.FILE_PATH || 'leaderboard.json';
  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || null;

  if (!owner || !repo || !token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'missing_server_config' }) };
  }

  // Verify reCAPTCHA token if configured
  if (RECAPTCHA_SECRET) {
    if (!recaptchaToken) return { statusCode: 400, body: JSON.stringify({ error: 'recaptcha_missing' }) };
    try {
      const v = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${encodeURIComponent(RECAPTCHA_SECRET)}&response=${encodeURIComponent(recaptchaToken)}`
      });
      const verdict = await v.json();
      if (!verdict.success) {
        return { statusCode: 403, body: JSON.stringify({ error: 'recaptcha_failed', details: verdict }) };
      }
      // If v3, enforce min score threshold (default 0.3)
      const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.3');
      if (typeof verdict.score === 'number' && verdict.score < minScore) {
        return { statusCode: 403, body: JSON.stringify({ error: 'recaptcha_low_score', score: verdict.score }) };
      }
    } catch (e) {
      console.warn('recaptcha verify failed', e);
      return { statusCode: 500, body: JSON.stringify({ error: 'recaptcha_verify_error' }) };
    }
  } else {
    // not configured -> warning in logs, allow for dev
    console.warn('RECAPTCHA_SECRET not set: skipping verification (dev only)');
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;

  const headersAuth = {
    'Authorization': `token ${token}`,
    'User-Agent': 'SkunkFU-Highscores-Function'
  };

  // Helper to fetch existing file (to get sha and content)
  async function getFile() {
    const res = await fetch(`${apiBase}?ref=${branch}`, { headers: headersAuth });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('GitHub get content failed: ' + res.status);
    return await res.json();
  }

  try {
    const file = await getFile();
    let arr = [];
    if (file && file.content) {
      const raw = Buffer.from(file.content, 'base64').toString('utf8');
      try { arr = JSON.parse(raw); if (!Array.isArray(arr)) arr = []; } catch (e) { arr = []; }
    }

    const entry = { score, initials, date: new Date().toISOString(), ip: ip === 'unknown' ? undefined : ip };
    arr.push(entry);
    arr.sort((a,b)=>b.score - a.score || new Date(a.date) - new Date(b.date));
    arr = arr.slice(0, MAX_ENTRIES);

    const newContent = Buffer.from(JSON.stringify(arr, null, 2)).toString('base64');

    const putBody = {
      message: `Add high score ${initials} ${score}`,
      content: newContent,
      branch
    };
    if (file && file.sha) putBody.sha = file.sha;

    const putRes = await fetch(`${apiBase}`, { method: 'PUT', headers: { ...headersAuth, 'Content-Type': 'application/json' }, body: JSON.stringify(putBody) });
    if (!putRes.ok) {
      const txt = await putRes.text();
      console.error('GitHub PUT failed', putRes.status, txt);
      return { statusCode: 500, body: JSON.stringify({ error: 'git_put_failed' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, leaderboard: arr })
    };
  } catch (e) {
    console.error('submit-score error', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
