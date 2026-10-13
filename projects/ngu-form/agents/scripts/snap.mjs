#!/usr/bin/env node
// Renders a page in a browser and reports what an agent needs to compare it with a design: a
// screenshot, the browser console (ngu-form reports mistakes there as NGU-xxx), and the fields
// ngu-form rendered, row by row.
//
//   node node_modules/ngu-form/skills/ngu-form-from-image/scripts/snap.mjs <url> [out.png]
//        [--width 1280] [--height 900] [--full] [--dark]
//
// Needs `playwright` or `playwright-core` in the project (npm i -D playwright-core). It uses the
// installed Chrome, or Playwright's own Chromium when that is installed instead.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const positional = args.filter(
  (a, i) => !a.startsWith('--') && !(i > 0 && ['--width', '--height'].includes(args[i - 1])),
);
const [url, out = 'snap.png'] = positional;
if (!url) {
  console.error('Usage: snap.mjs <url> [out.png] [--width 1280] [--height 900] [--full] [--dark]');
  process.exit(1);
}

const require = createRequire(resolve(process.cwd(), 'package.json'));
let chromium;
for (const name of ['playwright', 'playwright-core']) {
  try {
    ({ chromium } = require(name));
    break;
  } catch {
    // try the next one
  }
}
if (!chromium) {
  console.error(
    'snap: no browser driver. Run "npm i -D playwright-core" in the project, then try again.',
  );
  process.exit(2);
}

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
} catch {
  try {
    browser = await chromium.launch();
  } catch {
    console.error(
      'snap: no browser found. Install Google Chrome, or run "npx playwright install chromium".',
    );
    process.exit(2);
  }
}

const page = await browser.newPage({
  viewport: { width: value('--width', 1280), height: value('--height', 900) },
  colorScheme: flag('--dark') ? 'dark' : 'light',
});
const consoleLines = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) {
    consoleLines.push(`${m.type()}: ${m.text()}`);
  }
});
page.on('pageerror', (e) => consoleLines.push(`uncaught: ${e.message}`));

let exitCode = 0;
try {
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  if (response && !response.ok()) {
    consoleLines.push(`http: ${response.status()} for ${url}`);
  }
  const found = await page
    .waitForSelector('ngu-form, ngu-view, ngu-field', { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  // Some controls render on the next frame (deferred types, measured columns).
  await page.waitForTimeout(600);
  await page.screenshot({ path: out, fullPage: flag('--full') });

  const report = await page.evaluate(() => {
    const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const items = [];
    const selector = [
      'ngu-field',
      'ngu-array',
      '.ngu-group__title',
      '.ngu-static',
      '[role="tab"]',
      '.ngu-step__title',
      // Submit, Back and Next, add buttons, and buttons the app put inside <ngu-form>.
      'ngu-form button',
    ].join(',');
    for (const el of document.querySelectorAll(selector)) {
      const inField = el.closest('ngu-field') && el.closest('ngu-field') !== el;
      if (!visible(el) || inField || el.closest('.ngu-array__row, [role="tablist"], .ngu-steps')) {
        continue;
      }
      const box = el.getBoundingClientRect();
      const at = {
        top: Math.round(box.top + scrollY),
        left: Math.round(box.left),
        width: Math.round(box.width),
      };
      if (el.tagName === 'NGU-FIELD') {
        const label = el.querySelector('.ngu-label, label, legend');
        const required = el.querySelector('.ngu-required');
        const control = el.querySelector(
          'input:not([type="hidden"]), select, textarea, [role="radiogroup"], [role="group"]',
        );
        const kind =
          el.getAttribute('data-ngu-type') ||
          (control ? control.getAttribute('type') || control.tagName.toLowerCase() : '?');
        const labelText = label
          ? text(label)
              .replace(required ? text(required) : '', '')
              .trim()
          : '';
        items.push({
          kind: 'field',
          path: el.getAttribute('data-ngu-path') ?? '',
          type: kind,
          label: labelText,
          required: el.hasAttribute('data-required'),
          placeholder: control?.getAttribute('placeholder') ?? '',
          hint: text(el.querySelector('.ngu-hint')),
          ...at,
        });
      } else if (el.tagName === 'NGU-ARRAY') {
        items.push({
          kind: 'list',
          path: el.getAttribute('data-ngu-path') ?? '',
          label: text(el.querySelector('.ngu-array__title')),
          ...at,
        });
      } else if (el.matches('button')) {
        items.push({ kind: 'button', label: text(el), ...at });
      } else if (el.matches('[role="tab"]')) {
        items.push({ kind: 'tab', label: text(el), ...at });
      } else if (el.matches('.ngu-step__title')) {
        items.push({ kind: 'step', label: text(el), ...at });
      } else {
        items.push({ kind: 'text', label: text(el).slice(0, 80), ...at });
      }
    }
    return items;
  });

  console.log(`Screenshot: ${resolve(out)}`);
  if (!found) {
    console.log(
      'No <ngu-form>, <ngu-view> or <ngu-field> on the page. Check the route and the component.',
    );
    exitCode = 1;
  }
  const problems = consoleLines.filter(
    (l) => !l.includes('[webpack-dev-server]') && !l.includes('[vite]'),
  );
  console.log(`\nConsole: ${problems.length ? `${problems.length} problem(s)` : 'clean'}`);
  for (const line of problems) {
    console.log(`  ${line.slice(0, 400)}`);
  }
  if (problems.length) {
    exitCode = 1;
  }

  // Elements whose tops are within 8px share a row.
  const rows = [];
  for (const item of [...report].sort((a, b) => a.top - b.top || a.left - b.left)) {
    const row = rows.find((r) => Math.abs(r.top - item.top) <= 8);
    if (row) {
      row.items.push(item);
    } else {
      rows.push({ top: item.top, items: [item] });
    }
  }
  console.log(
    `\nRendered, row by row (${report.filter((i) => i.kind === 'field').length} fields):`,
  );
  for (const row of rows) {
    const cells = row.items
      .sort((a, b) => a.left - b.left)
      .map((i) => {
        if (i.kind === 'field') {
          const extra = [
            i.required ? 'required' : '',
            i.placeholder ? `placeholder "${i.placeholder}"` : '',
            i.hint ? `hint "${i.hint}"` : '',
          ]
            .filter(Boolean)
            .join(', ');
          return `[${i.label || '(no label)'}: ${i.type}${extra ? `, ${extra}` : ''}] ${i.path}`;
        }
        return `<${i.kind}: ${i.label}>`;
      });
    console.log(`  ${cells.join('   ')}`);
  }
} catch (error) {
  console.error(`snap: ${error.message}`);
  exitCode = 1;
} finally {
  await browser.close();
}
process.exit(exitCode);
