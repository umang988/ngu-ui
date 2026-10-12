// Compiles the schematics into dist/ngu-form/schematics (CommonJS) and copies their JSON.
// Run after `ng build ngu-form`, which empties dist/ngu-form.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../../dist/ngu-form/schematics');
execFileSync(process.execPath, [join(here, '../../../node_modules/typescript/bin/tsc'), '-p', join(here, 'tsconfig.json')], { stdio: 'inherit' });

function copyJson(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      copyJson(path);
    } else if (name.endsWith('.json') && name !== 'tsconfig.json') {
      const target = join(out, relative(here, path));
      mkdirSync(dirname(target), { recursive: true });
      cpSync(path, target);
    }
  }
}
copyJson(here);
// The package is ESM; the schematics are CommonJS, as the Angular CLI loads them.
writeFileSync(join(out, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
console.log(`Built schematics into ${relative(process.cwd(), out)}`);
