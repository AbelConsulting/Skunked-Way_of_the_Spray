// Netlify Function: submit-score
// Expects POST { score: number, initials: string }
// Requires environment variables set in Netlify:
// GITHUB_TOKEN - Personal Access Token with repo contents write access
// REPO_OWNER - GitHub owner/org (e.g., AbelConsulting)
// REPO_NAME - Repository name (e.g., SkunkFU)
// FILE_PATH - path in repo to leaderboard file (default: leaderboard.json)
// BRANCH - branch to commit to (default: main)

const MAX_ENTRIES = 100;

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const score = (typeof body.score === 'number') ? Math.floor(body.score) : null;
  const initials = (typeof body.initials === 'string') ? body.initials.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3) : '---';

  if (score === null || score < 0) return { statusCode: 400, body: JSON.stringify({ error: 'bad_score' }) };

  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;
  const token = process.env.GITHUB_TOKEN;
  const branch = process.env.BRANCH || 'main';
  const filePath = process.env.FILE_PATH || 'leaderboard.json';

  if (!owner || !repo || !token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'missing_server_config' }) };
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;

  const headers = {
    'Authorization': `token ${token}`,
    'User-Agent': 'SkunkFU-Highscores-Function'
  };

  // Helper to fetch existing file (to get sha and content)
  async function getFile() {
    const res = await fetch(`${apiBase}?ref=${branch}`, { headers });
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

    const entry = { score, initials, date: new Date().toISOString() };
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

    const putRes = await fetch(`${apiBase}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(putBody) });
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
