// What ngu-form adds to an app's initial JavaScript, measured on the login form in
// projects/size-check: built once with ngu-form and once written by hand with Signal Forms.
//
//   node scripts/size.mjs --build    build both (needs dist/ngu-form: npm run build:form)
//   node scripts/size.mjs --check    fail when the added size is over projects/size-check/budget.json
//   node scripts/size.mjs --markdown print a Markdown table (release notes, CI summary)
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const args = new Set(process.argv.slice(2));
const OUT = 'dist/size-check';
const VARIANTS = [
  { name: 'ngu', configuration: 'production', label: 'With ngu-form' },
  { name: 'plain', configuration: 'plain', label: 'Hand-written Signal Forms' },
];

if (args.has('--build')) {
  if (!existsSync('dist/ngu-form/package.json')) {
    fail('dist/ngu-form is missing. Run `npm run build:form` first.');
  }
  for (const v of VARIANTS) {
    execFileSync('npx', ['ng', 'build', 'size-check', '--configuration', v.configuration], { stdio: 'inherit' });
  }
}

const measured = Object.fromEntries(VARIANTS.map((v) => [v.name, measure(join(OUT, v.name))]));
const added = {
  raw: measured.ngu.raw - measured.plain.raw,
  gzip: measured.ngu.gzip - measured.plain.gzip,
  brotli: measured.ngu.brotli - measured.plain.brotli,
};
const own = nguFormBytes(join(OUT, 'ngu', 'browser-stats.json'), measured.ngu.files);
const budget = JSON.parse(readFileSync('projects/size-check/budget.json', 'utf8')).addedGzipBytes;

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const rows = [
  ...VARIANTS.map((v) => [v.label, kb(measured[v.name].raw), kb(measured[v.name].gzip), kb(measured[v.name].brotli)]),
  ['**Added by ngu-form**', `**${kb(added.raw)}**`, `**${kb(added.gzip)}**`, `**${kb(added.brotli)}**`],
];
const table = [
  '| Initial JavaScript of the login form | Minified | Gzip | Brotli |',
  '| --- | ---: | ---: | ---: |',
  ...rows.map((r) => `| ${r.join(' | ')} |`),
  '',
  `ngu-form's own code in that bundle: ${kb(own)} minified. Budget for the added size: ${budget ? kb(budget) + ' gzip' : 'not set'}.`,
].join('\n');

if (args.has('--markdown')) {
  console.log(table);
} else {
  console.table(Object.fromEntries(rows.map((r) => [r[0].replaceAll('*', ''), { minified: r[1].replaceAll('*', ''), gzip: r[2].replaceAll('*', ''), brotli: r[3].replaceAll('*', '') }])));
  console.log(`ngu-form's own code: ${kb(own)} minified. Budget: ${budget ? kb(budget) + ' gzip added' : 'not set'}.`);
}
if (process.env['GITHUB_STEP_SUMMARY']) {
  appendFileSync(process.env['GITHUB_STEP_SUMMARY'], `### Bundle size\n\n${table}\n`);
}
if (args.has('--check') && budget && added.gzip > budget) {
  fail(`ngu-form adds ${kb(added.gzip)} gzip, over its budget of ${kb(budget)} (projects/size-check/budget.json).`);
}

/** Raw, gzip and brotli bytes of the scripts index.html loads before first render. */
function measure(dir) {
  const browser = join(dir, 'browser');
  if (!existsSync(join(browser, 'index.html'))) {
    fail(`${browser} is missing. Run with --build.`);
  }
  const html = readFileSync(join(browser, 'index.html'), 'utf8');
  const files = new Set(
    [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"|<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1] ?? m[2]),
  );
  const totals = { raw: 0, gzip: 0, brotli: 0 };
  for (const file of files) {
    const code = readFileSync(join(browser, file));
    totals.raw += code.length;
    totals.gzip += gzipSync(code, { level: 9 }).length;
    totals.brotli += brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
  }
  totals.files = files;
  return totals;
}

/** Minified bytes in the initial files that came from ngu-form's package (esbuild's metafile). */
function nguFormBytes(statsFile, initialFiles) {
  const stats = JSON.parse(readFileSync(statsFile, 'utf8'));
  let bytes = 0;
  for (const [file, output] of Object.entries(stats.outputs)) {
    if (!initialFiles.has(file.split('/').pop())) {
      continue;
    }
    for (const [input, info] of Object.entries(output.inputs ?? {})) {
      if (input.includes('dist/ngu-form/')) {
        bytes += info.bytesInOutput;
      }
    }
  }
  return bytes;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
