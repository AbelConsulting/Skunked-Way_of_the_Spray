const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8001;

function send404(res) {
  res.writeHead(404);
  res.end('Not found');
}

function sendFile(res, filePath, cspHeader = null) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send404(res);
    const ext = path.extname(filePath).toLowerCase();
    const ct = ext === '.html' ? 'text/html; charset=utf-8' : (ext === '.js' ? 'application/javascript' : (ext === '.css' ? 'text/css' : 'application/octet-stream'));
    const headers = { 'Content-Type': ct };
    if (cspHeader) headers['Content-Security-Policy'] = cspHeader;
    res.writeHead(200, headers);
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '/index.html') {
    const indexPath = path.join(ROOT, 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) return send404(res);
      const nonce = crypto.randomBytes(16).toString('base64');
      const csp = `script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com; object-src 'none'; base-uri 'self';`;
      const body = data.replace(/%CSP_NONCE%/g, nonce);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp });
      res.end(body);
    });
    return;
  }

  const filePath = path.join(ROOT, pathname);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return send404(res);
    sendFile(res, filePath);
  });
});

server.listen(PORT, () => console.log(`CSP server listening on http://localhost:${PORT}`));

process.on('SIGINT', () => {
  console.log('\nShutting down');
  server.close();
  process.exit(0);
});