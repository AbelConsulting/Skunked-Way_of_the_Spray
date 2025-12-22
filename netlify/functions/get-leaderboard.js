// Netlify Function: get-leaderboard
// Returns the leaderboard JSON stored in the repository file path.
// Uses optional GITHUB_TOKEN to increase API rate limits.

exports.handler = async function(event, context) {
  const owner = process.env.REPO_OWNER;
  const repo = process.env.REPO_NAME;
  const token = process.env.GITHUB_TOKEN; // optional
  const branch = process.env.BRANCH || 'main';
  const filePath = process.env.FILE_PATH || 'leaderboard.json';

  if (!owner || !repo) return { statusCode: 500, body: JSON.stringify({ error: 'missing_server_config' }) };

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
  const headers = { 'User-Agent': 'SkunkFU-Highscores-Function' };
  if (token) headers['Authorization'] = `token ${token}`;

  try {
    const res = await fetch(apiUrl, { headers });
    if (res.status === 404) return { statusCode: 200, body: JSON.stringify([]) };
    if (!res.ok) {
      const t = await res.text();
      console.error('get-leaderboard fetch failed', res.status, t);
      return { statusCode: 500, body: JSON.stringify({ error: 'fetch_failed' }) };
    }
    const obj = await res.json();
    if (!obj.content) return { statusCode: 200, body: JSON.stringify([]) };
    const raw = Buffer.from(obj.content, 'base64').toString('utf8');
    try {
      const arr = JSON.parse(raw);
      return { statusCode: 200, body: JSON.stringify(arr) };
    } catch (e) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }
  } catch (e) {
    console.error('get-leaderboard error', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
