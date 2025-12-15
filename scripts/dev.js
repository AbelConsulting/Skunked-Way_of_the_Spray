const { build } = require('./build');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');
let serverProc = null;

async function start() {
  await build({ minify: false, sourcemap: true });
  console.log('Starting CSP dev server...');
  serverProc = cp.spawn(process.execPath, [path.join(ROOT, 'tools', 'csp_server.js')], { stdio: 'inherit' });

  // Watch JS files and rebuild on change
  fs.watch(JS_DIR, { recursive: false }, (eventType, filename) => {
    if (!filename) return;
    if (filename.endsWith('.js')) {
      try {
        console.log('Change detected in', filename, '-- rebuilding');
        build({ minify: false, sourcemap: true });
      } catch (e) { console.error('Rebuild failed', e); }
    }
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down dev server...');
    if (serverProc) serverProc.kill('SIGINT');
    process.exit(0);
  });
}

start().catch(e => { console.error(e); process.exit(1); });
