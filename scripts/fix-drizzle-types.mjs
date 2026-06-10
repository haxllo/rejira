import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRIZZLE_DIR = path.resolve(__dirname, '..', 'node_modules', 'drizzle-orm');
const SUFFIX = '.d.cts';
const OUT_SUFFIX = '.d.ts';

function processDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      processDir(full);
    } else if (entry.isFile() && entry.name.endsWith(SUFFIX)) {
      const outPath = path.join(dir, entry.name.replace(SUFFIX, OUT_SUFFIX));
      if (fs.existsSync(outPath)) continue; // already has .d.ts
      const content = fs.readFileSync(full, 'utf-8');
      const fixed = content
        .replace(/"([^"]+)\.cjs"/g, '"$1.js"')
        .replace(/from '\.\/([^']+)\.cjs'/g, "from './$1.js'");
      fs.writeFileSync(outPath, fixed, 'utf-8');
    }
  }
}

function fixRootIndex() {
  const indexPath = path.join(DRIZZLE_DIR, 'index.d.ts');
  const ctsPath = path.join(DRIZZLE_DIR, 'index.d.cts');

  if (!fs.existsSync(ctsPath)) {
    console.log('[fix-drizzle-types] No index.d.cts found, skipping root fix');
    return;
  }

  const content = fs.readFileSync(ctsPath, 'utf-8');
  const fixed = content
    .replace(/"([^"]+)\.cjs"/g, '"$1.js"')
    .replace(/from '\.\/([^']+)\.cjs'/g, "from './$1.js'");

  fs.writeFileSync(indexPath, fixed, 'utf-8');
  console.log('[fix-drizzle-types] Fixed root index.d.ts');
}

function fixPackageJson() {
  const pkgPath = path.join(DRIZZLE_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.types = './index.d.ts';

  if (pkg.exports) {
    const root = pkg.exports['.'];
    if (root && root.import) {
      root.import.types = './index.d.ts';
    }
    if (root && !root.import) {
      root.types = './index.d.ts';
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log('[fix-drizzle-types] Fixed package.json types field');
}

if (!fs.existsSync(DRIZZLE_DIR)) {
  console.log('[fix-drizzle-types] drizzle-orm not installed, skipping');
  process.exit(0);
}

console.log('[fix-drizzle-types] Creating .d.ts shims for drizzle-orm...');
processDir(DRIZZLE_DIR);
fixRootIndex();
fixPackageJson();
console.log('[fix-drizzle-types] Done');
