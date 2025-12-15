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
      // Separate rules: allow inline scripts via nonce, allow external script elements from Cloudflare
      const csp = `script-src 'self' 'nonce-${nonce}'; script-src-elem 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com; object-src 'none'; base-uri 'self';`;
      const body = data.replace(/%CSP_NONCE%/g, nonce);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp });
      res.end(body);
    });
    return;
  }

  // Accept POSTed touch logs for diagnostics
  if (req.method === 'POST' && pathname === '/__touch_log') {
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const zlib = require('zlib');

    const ROOT = path.resolve(__dirname, '..');
    const PORT = 8001;

    function send404(res) {
      res.writeHead(404);
      res.end('Not found');
    }

    function sendFile(req, res, filePath, cspHeader = null) {
      fs.readFile(filePath, (err, data) => {
        if (err) return send404(res);
        const ext = path.extname(filePath).toLowerCase();
        const ct = ext === '.html' ? 'text/html; charset=utf-8' : (ext === '.js' ? 'application/javascript' : (ext === '.css' ? 'text/css' : (ext === '.json' ? 'application/json' : (ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : (ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream'))))));
        const headers = { 'Content-Type': ct };
        if (cspHeader) headers['Content-Security-Policy'] = cspHeader;

        // Cache static assets aggressively (dist, assets, js)
        if (/^\/(?:dist\/|assets\/|js\/)/.test(req.url) || ['.png', '.jpg', '.jpeg', '.svg', '.mp3', '.wav', '.ogg', '.css', '.js', '.json'].includes(ext)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else {
          headers['Cache-Control'] = 'no-cache';
        }

        // Compression (br -> gzip) when appropriate
        const accept = req.headers['accept-encoding'] || '';
        if (/\bbr\b/.test(accept)) {
          zlib.brotliCompress(data, (err2, out) => {
            if (!err2) {
              headers['Content-Encoding'] = 'br';
              headers['Vary'] = 'Accept-Encoding';
              res.writeHead(200, headers);
              res.end(out);
            } else {
              res.writeHead(200, headers);
              res.end(data);
            }
          });
          return;
        } else if (/\bgzip\b/.test(accept)) {
          zlib.gzip(data, (err2, out) => {
            if (!err2) {
              headers['Content-Encoding'] = 'gzip';
              headers['Vary'] = 'Accept-Encoding';
              res.writeHead(200, headers);
              res.end(out);
            } else {
              res.writeHead(200, headers);
              res.end(data);
            }
          });
          return;
        }

        res.writeHead(200, headers);
        res.end(data);
      });
    }