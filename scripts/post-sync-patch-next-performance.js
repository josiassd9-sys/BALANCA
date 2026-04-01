#!/usr/bin/env node

/**
 * Post-sync hook to patch Next chunks bundled into Android assets.
 * Some WebView environments may not expose performance.clearMarks / clearMeasures.
 * This script guards those calls to prevent runtime crashes.
 */

const fs = require('fs');
const path = require('path');

const scriptDir = __dirname;
const projectRoot = path.dirname(scriptDir);
const androidMainPath = path.join(projectRoot, 'android', 'app', 'src', 'main');

const replacements = [
  {
    from: /(?:performance\.clearMarks&&)*performance\.clearMarks\(e\)/g,
    to: 'performance.clearMarks&&performance.clearMarks(e)',
  },
  {
    from: /(?:performance\.clearMeasures&&)*performance\.clearMeasures\(e\)/g,
    to: 'performance.clearMeasures&&performance.clearMeasures(e)',
  },
];

function collectTargetFiles(rootPath) {
  const result = [];

  function walk(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!/^main-.*\.js$/i.test(entry.name)) {
        continue;
      }

      const normalized = fullPath.replace(/\\/g, '/');
      if (!normalized.includes('/_next/static/chunks/')) {
        continue;
      }

      result.push(fullPath);
    }
  }

  walk(rootPath);
  return result;
}

function patchFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let patched = original;

  for (const replacement of replacements) {
    patched = patched.replace(replacement.from, replacement.to);
  }

  if (patched !== original) {
    fs.writeFileSync(filePath, patched, 'utf8');
    return true;
  }

  return false;
}

if (!fs.existsSync(androidMainPath)) {
  console.log('[post-sync-perf] android main path not found, skipping:', androidMainPath);
  process.exit(0);
}

const targetFiles = collectTargetFiles(androidMainPath);
if (targetFiles.length === 0) {
  console.log('[post-sync-perf] no Next chunk files found under android assets, skipping');
  process.exit(0);
}

let patchedCount = 0;
for (const filePath of targetFiles) {
  if (patchFile(filePath)) {
    patchedCount += 1;
    console.log('[post-sync-perf] patched:', path.relative(projectRoot, filePath));
  }
}

if (patchedCount === 0) {
  console.log('[post-sync-perf] no replacements needed');
} else {
  console.log(`[post-sync-perf] patched ${patchedCount} file(s)`);
}
