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
  'highscores.js',
  'spriteLoader.js',
  'audioManager.js',
  'visualEffects.js',
  'level.js',
  'player.js',
  'enemy.js',
  'enemyManager.js',
  'touchControls.js',
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
  await esbuild.build({
    entryPoints: [src],
    outfile: path.join(DIST, 'bundle.js'),
    bundle: false, // already concatenated
    minify,
    sourcemap,
    legalComments: 'none',
    target: ['es2017']
  });
  console.log('Built', path.join(DIST, 'bundle.js'));

  // Copy static site files into dist so Wrangler/Pages can publish the folder
  try {
    const staticFiles = ['index.html', 'styles.css', 'achievements.css', 'manifest.json', 'sw.js', 'package.json'];
    for (const f of staticFiles) {
      const src = path.join(ROOT, f);
      const dest = path.join(DIST, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    // Copy assets/ and js/ folders to dist (shallow copy)
    const cp = (srcDir, destDir) => {
      if (!fs.existsSync(srcDir)) return;
      const copyRecursive = (s, d) => {
        const stat = fs.statSync(s);
        if (stat.isDirectory()) {
          if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
          for (const name of fs.readdirSync(s)) {
            copyRecursive(path.join(s, name), path.join(d, name));
          }
        } else {
          fs.copyFileSync(s, d);
        }
      };
      copyRecursive(srcDir, destDir);
    };
    cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
    cp(path.join(ROOT, 'js'), path.join(DIST, 'js'));
    console.log('Copied static files into dist');
  } catch (e) { console.warn('Static copy to dist failed', e); }
}

if (require.main === module) {
  const isProd = process.env.NODE_ENV === 'production';
  build({ minify: isProd, sourcemap: !isProd }).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { build };
