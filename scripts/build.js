const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const JS_DIR = path.join(ROOT, 'js');

// Order of scripts as they appear in index.html (keeps globals initialization order)
const filesInOrder = [
  'config.js',
  'utils.js',
  'spriteLoader.js',
  'audioManager.js',
  'visualEffects.js',
  'level.js',
  'player.js',
  'enemy.js',
  'enemyManager.js',
  'ui.js',
  'game.js',
  'main.js'
];

function concatFiles() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);
  const outPath = path.join(DIST, 'bundle.raw.js');
  const header = '/* SkunkFU bundle (concatenated) */\n';
  const contents = filesInOrder.map(f => {
    const p = path.join(JS_DIR, f);
    if (!fs.existsSync(p)) {
      console.warn('Missing', p);
      return '';
    }
    return `/* ==== ${f} ==== */\n` + fs.readFileSync(p, 'utf8') + '\n';
  }).join('\n');
  fs.writeFileSync(outPath, header + contents, 'utf8');
  return outPath;
}

async function build({ minify = true, sourcemap = false } = {}) {
  const src = concatFiles();
  const result = await esbuild.build({
    entryPoints: [src],
    outfile: path.join(DIST, 'bundle.js'),
    bundle: false, // already concatenated
    minify,
    sourcemap,
    legalComments: 'none',
    target: ['es2017']
  });
  console.log('Built', path.join(DIST, 'bundle.js'));
}

if (require.main === module) {
  const isProd = process.env.NODE_ENV === 'production';
  build({ minify: isProd, sourcemap: !isProd }).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { build };
