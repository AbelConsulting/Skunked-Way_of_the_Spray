'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(process.env.TEST_ROOT || path.join(__dirname, '..'));
const MIME_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};
const SCORES = [
  { name: 'Top Skunk', score: 42000, achievements: ['first_kill'], prestige: 1 },
  { name: 'Spray Master', score: 28000, achievements: [], prestige: 0 },
];

function createStaticServer() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filePath = path.resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filePath.startsWith(ROOT + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    fs.stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader('Content-Type', MIME_TYPES[path.extname(filePath)] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(response);
    });
  });
}

(async () => {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    await context.route('https://us-central1-studio-3829586481-2a2cf.cloudfunctions.net/getLeaderboard**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(SCORES),
      })
    );

    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.gameReady === true, { timeout: 15000 });
    await page.locator('#menu-scores-btn').click();
    await page.locator('#scores-panel-arcade .scoreboard-entry').first().waitFor({ state: 'visible' });

    const rendered = await page.locator('#scores-panel-arcade .scoreboard-entry').allTextContents();
    assert.equal(rendered.length, SCORES.length);
    assert.match(rendered[0], /Top Skunk/);
    assert.match(rendered[1], /Spray Master/);
    assert.deepEqual(pageErrors, []);
    assert.equal(await page.locator('#error-overlay').isVisible(), false);

    console.log('PASS populated arcade scoreboard renders entries without a runtime error.');
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
