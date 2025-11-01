#!/usr/bin/env node

/**
 * Rollup 4.x occasionally ships without `dist/native.js` when running on newer
 * Node runtimes. The Vite build then fails trying to require the missing file.
 * This helper recreates the loader so installs are deterministic.
 */

const fs = require('node:fs');
const path = require('node:path');

const distDir = path.join(__dirname, '..', 'node_modules', 'rollup', 'dist');
const targetFile = path.join(distDir, 'native.js');

if (fs.existsSync(targetFile)) {
  return;
}

const platformPackages = {
  'darwin-arm64': '@rollup/rollup-darwin-arm64',
  'darwin-x64': '@rollup/rollup-darwin-x64',
  'linux-arm64': '@rollup/rollup-linux-arm64-gnu',
  'linux-arm64-musl': '@rollup/rollup-linux-arm64-musl',
  'linux-x64': '@rollup/rollup-linux-x64-gnu',
  'linux-x64-musl': '@rollup/rollup-linux-x64-musl',
  'win32-arm64': '@rollup/rollup-win32-arm64-msvc',
  'win32-ia32': '@rollup/rollup-win32-ia32-msvc',
  'win32-x64': '@rollup/rollup-win32-x64-msvc',
  'freebsd-arm64': '@rollup/rollup-freebsd-arm64',
  'freebsd-x64': '@rollup/rollup-freebsd-x64',
};

const fileContents = `'use strict';

const { createRequire } = require('module');
const requireNative = createRequire(__filename);

const PLATFORM_PACKAGES = ${JSON.stringify(platformPackages, null, 2)};

function getTargetKey() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'linux' && arch === 'arm64') {
    return process.env.LIBC === 'musl' ? 'linux-arm64-musl' : 'linux-arm64';
  }

  if (platform === 'linux' && arch === 'x64') {
    return process.env.LIBC === 'musl' ? 'linux-x64-musl' : 'linux-x64';
  }

  return \`\${platform}-\${arch}\`;
}

function loadBinding() {
  const key = getTargetKey();
  const pkg = PLATFORM_PACKAGES[key];

  if (!pkg) {
    throw new Error(
      '[rollup] Unsupported platform or architecture: ' +
        key +
        '. Install rollup from source or use a supported environment.'
    );
  }

  try {
    return requireNative(pkg);
  } catch (error) {
    if (error && (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND')) {
      throw new Error(
        '[rollup] Native binding not found for ' +
          key +
          '. Ensure optional dependency \"' +
          pkg +
          '\" is installed.'
      );
    }
    throw error;
  }
}

module.exports = loadBinding();
`;

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(targetFile, fileContents);
console.log('[postinstall] Created rollup/dist/native.js shim for missing native bindings.');
