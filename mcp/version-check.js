import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

function semverLess(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}

export async function checkLatestVersion() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch('https://registry.npmjs.org/findskills-mcp/latest', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const { version } = await res.json();
    if (semverLess(pkg.version, version)) {
      console.error(`\n\x1b[33m⚠  findskills-mcp ${pkg.version} is outdated (latest: ${version}).\x1b[0m`);
      console.error(`   Upgrade:  npm i -g findskills-mcp@latest\n`);
      return { current: pkg.version, latest: version, outdated: true };
    }
    return { current: pkg.version, latest: version, outdated: false };
  } catch {
    return null;
  }
}

export function currentVersion() {
  return pkg.version;
}
