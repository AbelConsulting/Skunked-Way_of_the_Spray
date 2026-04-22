#!/usr/bin/env node
/*
 * Verifies the Android upload keystore SHA1 fingerprint before release builds.
 *
 * Priority for signing values:
 * 1) Environment variables (ANDROID_*)
 * 2) android/keystore.properties
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const EXPECTED_SHA1_DEFAULT = 'F4:DB:65:73:65:1B:1F:8F:8D:3A:0F:DE:C1:3B:62:A8:D8:7D:45:E1';
const EXPECTED_SHA1 = normalizeFingerprint(process.env.EXPECTED_UPLOAD_SHA1 || EXPECTED_SHA1_DEFAULT);

function normalizeFingerprint(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '')
    .match(/.{1,2}/g)
    ?.join(':') || '';
}

function parsePropertiesFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const out = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
      continue;
    }

    const idx = trimmed.indexOf('=');
    if (idx === -1) {
      continue;
    }

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }

  return out;
}

function resolveSigningConfig() {
  const repoRoot = process.cwd();
  const propsPath = path.join(repoRoot, 'android', 'keystore.properties');
  const props = parsePropertiesFile(propsPath);

  const storeFile = process.env.ANDROID_STORE_FILE || props.storeFile;
  const storePassword = process.env.ANDROID_STORE_PASSWORD || props.storePassword;
  const keyAlias = process.env.ANDROID_KEY_ALIAS || props.keyAlias;

  if (!storeFile || !storePassword || !keyAlias) {
    throw new Error(
      'Missing signing config. Provide ANDROID_STORE_FILE, ANDROID_STORE_PASSWORD, ANDROID_KEY_ALIAS or set them in android/keystore.properties.'
    );
  }

  const resolvedStoreFile = path.isAbsolute(storeFile)
    ? storeFile
    : path.resolve(path.join(repoRoot, 'android'), storeFile);

  if (!fs.existsSync(resolvedStoreFile)) {
    throw new Error(`Keystore file not found: ${resolvedStoreFile}`);
  }

  return { storeFile: resolvedStoreFile, storePassword, keyAlias };
}

function resolveKeytoolCandidates() {
  const candidates = [];
  const exeSuffix = process.platform === 'win32' ? '.exe' : '';

  if (process.env.KEYTOOL_PATH) {
    candidates.push(process.env.KEYTOOL_PATH);
  }

  if (process.env.JAVA_HOME) {
    candidates.push(path.join(process.env.JAVA_HOME, 'bin', `keytool${exeSuffix}`));
  }

  candidates.push(`keytool${exeSuffix}`);
  return candidates;
}

function readKeystoreSha1({ storeFile, storePassword, keyAlias }) {
  let output = '';
  let lastError = null;

  for (const keytoolBin of resolveKeytoolCandidates()) {
    try {
      output = cp.execFileSync(
        keytoolBin,
        [
          '-list',
          '-v',
          '-keystore',
          storeFile,
          '-alias',
          keyAlias,
          '-storepass',
          storePassword,
        ],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!output) {
    const stderr = String(lastError && (lastError.stderr || lastError.message) || '').trim();
    throw new Error(
      [
        'Unable to read certificate fingerprint with keytool.',
        'Ensure JDK keytool is available via PATH, JAVA_HOME, or KEYTOOL_PATH.',
        stderr,
      ].filter(Boolean).join('\n')
    );
  }

  const match = output.match(/SHA1:\s*([0-9A-Fa-f:]+)/);
  if (!match) {
    throw new Error('Could not find SHA1 fingerprint in keytool output.');
  }

  return normalizeFingerprint(match[1]);
}

function main() {
  if (!EXPECTED_SHA1) {
    throw new Error('Expected SHA1 is empty. Set EXPECTED_UPLOAD_SHA1.');
  }

  const signingConfig = resolveSigningConfig();
  const actualSha1 = readKeystoreSha1(signingConfig);

  console.log(`Expected SHA1: ${EXPECTED_SHA1}`);
  console.log(`Actual SHA1:   ${actualSha1}`);

  if (actualSha1 !== EXPECTED_SHA1) {
    throw new Error(
      [
        'Upload key fingerprint mismatch.',
        'Do not upload this build to Play Console.',
        'Set EXPECTED_UPLOAD_SHA1 to override if Play Console has changed again.'
      ].join(' ')
    );
  }

  console.log('Upload key fingerprint check passed.');
}

try {
  main();
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  if (process.platform === 'win32' && /keytool/i.test(String(err.message || ''))) {
    console.error('Hint: Set KEYTOOL_PATH to keytool.exe from your JDK/Android Studio install.');
  }
  process.exit(1);
}
