import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = 'tree.txt';
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  'coverage',
]);

// Read target directory from command line arguments or default to '.'
const targetArg = process.argv[2] || '.';
const targetPath = path.resolve(targetArg);

// Check if specified directory exists
if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
  console.error(`Error: "${targetArg}" is not a valid directory.`);
  process.exit(1);
}

let lines = [];

function generateTree(dirPath, prefix = '') {
  const entries = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter(
      (entry) => !IGNORED_DIRS.has(entry.name) && entry.name !== OUTPUT_FILE,
    );

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    lines.push(`${prefix}${connector}${entry.name}`);

    if (entry.isDirectory()) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      generateTree(path.join(dirPath, entry.name), newPrefix);
    }
  });
}

// Build and save the tree
lines.push(path.basename(targetPath) + '/');
generateTree(targetPath);

fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8');
console.log(`Directory structure for "${targetArg}" saved to ${OUTPUT_FILE}`);
