import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRIZZLE_DIR = path.resolve(__dirname, '..', 'node_modules', 'drizzle-orm');

function removeGenerated(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      removeGenerated(full);
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      const ctsPath = path.join(dir, entry.name.replace('.d.ts', '.d.cts'));
      if (fs.existsSync(ctsPath)) {
        // Only delete .d.ts files that have a .d.cts counterpart (our generated files)
        fs.unlinkSync(full);
      }
    }
  }
}

function restorePackageJson() {
  const pkgPath = path.join(DRIZZLE_DIR, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  pkg.types = './index.d.ts';
  if (pkg.exports && pkg.exports['.'] && pkg.exports['.'].import) {
    pkg.exports['.'].import.types = './index.d.ts';
  }
  if (pkg.exports && pkg.exports['.'] && !pkg.exports['.'].import && pkg.exports['.'].types) {
    pkg.exports['.'].types = './index.d.ts';
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

if (!fs.existsSync(DRIZZLE_DIR)) {
  console.log('[undo-fix] drizzle-orm not installed');
  process.exit(0);
}

console.log('[undo-fix] Removing generated .d.ts shims...');
removeGenerated(DRIZZLE_DIR);

// Restore original index.d.ts
const indexPath = path.join(DRIZZLE_DIR, 'index.d.ts');
fs.writeFileSync(indexPath, 'export * from "./index.d.cts";\n', 'utf-8');

restorePackageJson();
console.log('[undo-fix] Done');
