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

  // Switch to S3-backed storage
  const S3_BUCKET = process.env.S3_BUCKET;
  const S3_KEY = process.env.S3_KEY || (process.env.FILE_PATH || 'leaderboard.json');
  const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

  if (!S3_BUCKET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'missing_s3_config' }) };
  }

  const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: AWS_REGION });

  const streamToString = async (stream) => {
    return await new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  };

  try {
    // Fetch existing leaderboard
    let arr = [];
    try {
      const getRes = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY }));
      const bodyStr = await streamToString(getRes.Body);
      try { arr = JSON.parse(bodyStr); if (!Array.isArray(arr)) arr = []; } catch (e) { arr = []; }
    } catch (e) {
      // Not found or parse error -> start with empty
      arr = [];
    }

    const entry = { score, initials, date: new Date().toISOString() };
    arr.push(entry);
    arr.sort((a,b)=>b.score - a.score || new Date(a.date) - new Date(b.date));
    arr = arr.slice(0, MAX_ENTRIES);

    // Write back to S3
    const putRes = await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY, Body: JSON.stringify(arr, null, 2), ContentType: 'application/json' }));

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, leaderboard: arr })
    };
  } catch (e) {
    console.error('submit-score (s3) error', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
