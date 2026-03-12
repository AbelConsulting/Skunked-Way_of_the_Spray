// Netlify Function: health
// Simple health check endpoint — returns { status: 'ok' }.

exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ok' }),
  };
};
