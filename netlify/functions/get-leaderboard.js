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

  const S3_BUCKET = process.env.S3_BUCKET;
  const S3_KEY = process.env.S3_KEY || (process.env.FILE_PATH || 'leaderboard.json');
  const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

  if (!S3_BUCKET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'missing_s3_config' }) };
  }

  const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
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
    try {
      const getRes = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY }));
      const bodyStr = await streamToString(getRes.Body);
      const arr = JSON.parse(bodyStr);
      return { statusCode: 200, body: JSON.stringify(arr) };
    } catch (e) {
      // not found or parse error
      return { statusCode: 200, body: JSON.stringify([]) };
    }
  } catch (e) {
    console.error('get-leaderboard (s3) error', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
