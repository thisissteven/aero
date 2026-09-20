import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(here, '..');
const repoRoot = path.resolve(cliRoot, '..', '..');
const webRoot = path.join(repoRoot, 'packages', 'web');

const outDir = path.join(cliRoot, 'dist', 'web');
fs.mkdirSync(outDir, { recursive: true });

// Whatever your web package builds — copy the server entry and any
// static assets it needs next to dist/index.js.
copy(path.join(webRoot, 'dist', 'server.js'), path.join(outDir, 'server.js'));
copy(
  path.join(webRoot, 'dist', 'index.html'),
  path.join(cliRoot, 'dist', 'index.html'),
);
copyDir(
  path.join(webRoot, 'dist', 'assets'),
  path.join(cliRoot, 'dist', 'assets'),
);

function copy(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`Missing build artifact: ${src}`);
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}
