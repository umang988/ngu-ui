// Measures how well a coding agent builds ngu-form forms from screenshots.
//
//   node evals/agent-forms/run.mjs render --template <app>
//       Renders each cases/<id>/mockup.html to cases/<id>/design.png.
//   node evals/agent-forms/run.mjs run --template <app> --work <dir> [--cases a,b] [--variants none,agents]
//        [--model sonnet] [--claude <path>]
//       For each case and variant: clones the template app, gives it the design, runs Claude Code
//       headless with the case's prompt, then builds the app and scores the rendered page.
//   node evals/agent-forms/run.mjs report <work>/<run-id>
//   node evals/agent-forms/run.mjs sheets <work>/<run-id> --template <app>
//       Puts each case's design next to every variant's render, one image per case.
//   node evals/agent-forms/run.mjs audit <work>/<run-id>
//       Counts what the rules forbid in each run's code: type escapes, styles on ngu-form's
//       internal classes, hand-written controls; and the theme tokens it set.
//
// The template is an `ng new` app with the packed ngu-form and playwright-core installed.
// Variant `none` removes the package's docs/ and skills/ (an agent on its own); `agents` runs
// `ng g ngu-form:ai`, as `ng add` does. Builds started here ask the machine's heavy-job guard
// for a slot first, and every process left running inside a case folder is stopped afterwards.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const casesDir = join(here, 'cases');
const [command, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
};
const env = { ...process.env, NG_CLI_ANALYTICS: 'false', CI: '1' };
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Claude Code may still edit the app, so it gets these tools and nothing else. */
const TOOLS = [
  'Read',
  'Edit',
  'Write',
  'Glob',
  'Grep',
  'Bash(npx ng build:*)',
  'Bash(npx ng generate:*)',
  'Bash(npx ng g:*)',
  'Bash(npx ng serve:*)',
  'Bash(npx tsc:*)',
  'Bash(node:*)',
  'Bash(npm ls:*)',
  'Bash(ls:*)',
  'Bash(cat:*)',
  'Bash(head:*)',
  'Bash(tail:*)',
  'Bash(find:*)',
  'Bash(grep:*)',
  'Bash(mkdir:*)',
  'Bash(curl:*)',
  'Bash(lsof:*)',
  // Parts of compound commands, such as starting a server and taking a screenshot.
  'Bash(sleep:*)',
  'Bash(echo:*)',
  'Bash(wc:*)',
  'Bash(sed:*)',
  'Bash(cd:*)',
];
const MACHINE_NOTE =
  'Note about this machine: it is shared with other work. Run at most one build or dev server at a time; ' +
  'if you start a dev server, use port 4401 and stop it before you finish.';

const cases = () =>
  readdirSync(casesDir)
    .filter((d) => existsSync(join(casesDir, d, 'case.json')))
    .filter((d) => !opt('cases') || opt('cases').split(',').includes(d))
    .sort();

function chromiumFrom(template) {
  return createRequire(join(resolve(template), 'package.json'))('playwright-core').chromium;
}

async function launch(chromium) {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch {
    return chromium.launch();
  }
}

// ---------------------------------------------------------------------------------------------

async function render() {
  const browser = await launch(chromiumFrom(opt('template')));
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 2,
  });
  for (const id of cases()) {
    await page.goto(`file://${join(casesDir, id, 'mockup.html')}`);
    await page.locator('.card').screenshot({ path: join(casesDir, id, 'design.png') });
    log(`rendered ${id}/design.png`);
  }
  await browser.close();
}

// ---------------------------------------------------------------------------------------------

/** Asks the heavy-job guard for a slot, as a Bash call would, and waits while it says no. */
function waitForSlot(cmd) {
  const hook = join(homedir(), '.claude/hooks/heavy-job-guard.pl');
  if (!existsSync(hook)) {
    return;
  }
  for (let waited = 0; ; waited += 30) {
    const r = spawnSync('perl', [hook], {
      input: JSON.stringify({ tool_input: { command: cmd } }),
      encoding: 'utf8',
    });
    if (!r.stdout.trim()) {
      return;
    }
    if (waited % 300 === 0) {
      log(`waiting for a build slot (${waited}s)`);
    }
    sleep(30_000);
  }
}

/** Stops every process whose working directory is inside `dir` (dev servers an agent left). */
function stopProcessesIn(dir) {
  const r = spawnSync('lsof', ['-d', 'cwd', '-Fpn'], { encoding: 'utf8' });
  let pid;
  const victims = [];
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('p')) {
      pid = Number(line.slice(1));
    } else if (line.startsWith('n') && line.slice(1).startsWith(dir) && pid !== process.pid) {
      victims.push(pid);
    }
  }
  for (const p of victims) {
    try {
      process.kill(p, 'SIGTERM');
    } catch {
      // already gone
    }
  }
  if (victims.length) {
    sleep(2000);
    for (const p of victims) {
      try {
        process.kill(p, 'SIGKILL');
      } catch {
        // already gone
      }
    }
    log(`stopped ${victims.length} process(es) left in ${basename(dir)}`);
  }
}

function prepare(template, dir, id, variant) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(resolve(dir, '..'), { recursive: true });
  // APFS clones make the 300 MB node_modules copy instant.
  const clone = spawnSync('cp', ['-cR', template, dir]);
  if (clone.status !== 0) {
    execFileSync('cp', ['-R', template, dir]);
  }
  cpSync(join(casesDir, id, 'design.png'), join(dir, 'design.png'));
  if (variant === 'agents') {
    execFileSync('npx', ['ng', 'g', 'ngu-form:ai'], { cwd: dir, env, stdio: 'pipe' });
  } else {
    rmSync(join(dir, 'node_modules/ngu-form/docs'), { recursive: true, force: true });
    rmSync(join(dir, 'node_modules/ngu-form/skills'), { recursive: true, force: true });
  }
}

function agent(dir, prompt, model, claude) {
  return new Promise((done) => {
    const args = [
      '-p',
      `${prompt}\n\n${MACHINE_NOTE}`,
      '--output-format',
      'json',
      '--allowedTools',
      ...TOOLS,
      '--strict-mcp-config',
    ];
    if (model) {
      args.push('--model', model);
    }
    const child = spawn(claude, args, { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => child.kill('SIGTERM'), 30 * 60_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      let json;
      try {
        json = JSON.parse(out);
      } catch {
        json = { error: 'no JSON', stdout: out.slice(-4000), stderr: err.slice(-4000), code };
      }
      done(json);
    });
  });
}

/** Counts what the agent did, from its transcript. */
function transcriptStats(sessionId) {
  const stats = { docsRead: 0, docFiles: [], builds: 0, snaps: 0, toolCalls: 0 };
  if (!sessionId) {
    return stats;
  }
  const projects = join(homedir(), '.claude/projects');
  for (const folder of readdirSync(projects)) {
    const file = join(projects, folder, `${sessionId}.jsonl`);
    if (!existsSync(file)) {
      continue;
    }
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (!line.includes('"tool_use"')) {
        continue;
      }
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }
      for (const part of entry.message?.content ?? []) {
        if (part.type !== 'tool_use') {
          continue;
        }
        stats.toolCalls++;
        const input = JSON.stringify(part.input ?? {});
        const doc = /node_modules\/ngu-form\/(docs|skills)\/[^"\\]+/.exec(input);
        if (doc) {
          stats.docsRead++;
          stats.docFiles.push(doc[0].replace('node_modules/ngu-form/', ''));
        }
        if (part.name === 'Bash' && /ng build/.test(input)) {
          stats.builds++;
        }
        if (part.name === 'Bash' && /snap\.mjs/.test(input)) {
          stats.snaps++;
        }
      }
    }
  }
  return stats;
}

function serve(root, port) {
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
  };
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      file = join(root, 'index.html');
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((done) => server.listen(port, () => done(server)));
}

const norm = (s) => s.toLowerCase().replace(/[*]/g, '').replace(/\s+/g, ' ').trim();

/** Builds the app, opens the route and checks it against the case's expectations. */
async function score(chromium, dir, spec, out) {
  waitForSlot('npx ng build --configuration development');
  const build = spawnSync('npx', ['ng', 'build', '--configuration', 'development'], {
    cwd: dir,
    env,
    encoding: 'utf8',
    timeout: 10 * 60_000,
  });
  const buildLog = `${build.stdout}\n${build.stderr}`;
  writeFileSync(join(out, 'build.log'), buildLog);
  const result = {
    built: build.status === 0,
    buildErrors: (buildLog.match(/\[ERROR\]/g) ?? []).length,
    checks: [],
    console: [],
  };
  cpSync(join(dir, 'src'), join(out, 'src'), { recursive: true });
  if (!result.built) {
    result.score = 0;
    return result;
  }
  const browserDir = readdirSync(join(dir, 'dist'))
    .map((d) => join(dir, 'dist', d, 'browser'))
    .find((d) => existsSync(d));
  const server = await serve(browserDir, 4500);
  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on(
    'console',
    (m) =>
      ['error', 'warning'].includes(m.type()) &&
      result.console.push(`${m.type()}: ${m.text()}`.slice(0, 300)),
  );
  page.on('pageerror', (e) => result.console.push(`uncaught: ${e.message}`.slice(0, 300)));
  await page.goto(`http://localhost:4500${spec.route}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('ngu-form', { timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, 'render.png'), fullPage: true });
  const dom = await page.evaluate(() => {
    const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const shown = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top + scrollY), left: Math.round(r.left) };
    };
    const fields = [...document.querySelectorAll('ngu-field')].filter(shown).map((el) => {
      const control = el.querySelector('input:not([type="hidden"]), select, textarea');
      const label = el.querySelector('.ngu-label, label, legend');
      const required = label?.querySelector('.ngu-required');
      return {
        label: label ? text(label).replace(required ? text(required) : '', '') : '',
        type:
          el.getAttribute('data-ngu-type') ||
          (control ? control.getAttribute('type') || control.tagName.toLowerCase() : ''),
        required: el.hasAttribute('data-required'),
        ...box(el),
      };
    });
    const buttons = [
      ...document.querySelectorAll('button, [role="button"], a.btn, input[type="submit"]'),
    ]
      .filter(shown)
      .map((el) => ({ label: text(el) || el.getAttribute('value') || '', ...box(el) }));
    const lists = [...document.querySelectorAll('ngu-array')].filter(shown).map((el) => ({
      headers: [...el.querySelectorAll('th, [role="columnheader"]')].map(text),
      rows: el.querySelectorAll(
        '.ngu-array__row, tbody tr, [role="row"]:not(:has([role="columnheader"]))',
      ).length,
    }));
    return {
      fields,
      buttons,
      lists,
      // ngu-form's own tabs; a tab bar written around the form does not count.
      tabs: [...document.querySelectorAll('ngu-form [role="tab"]')].map(text),
      steps: [...document.querySelectorAll('.ngu-step__title, .ngu-steps li')].map(text),
      text: document.body.innerText,
    };
  });
  await browser.close();
  server.close();

  const check = (name, ok, detail = '') => result.checks.push({ name, ok, detail });
  const findField = (match) => dom.fields.find((f) => norm(f.label).includes(match));
  const findAny = (match) =>
    findField(match) ?? dom.buttons.find((b) => norm(b.label).includes(match));
  const e = spec.expect;
  for (const f of e.fields ?? []) {
    const found = findField(f.match);
    check(`field "${f.match}"`, !!found);
    if (found && f.types) {
      check(`type of "${f.match}"`, f.types.includes(found.type), `got ${found.type}`);
    }
    if (found && f.required !== undefined) {
      check(`required "${f.match}"`, found.required === f.required, `got ${found.required}`);
    }
  }
  for (const row of e.rows ?? []) {
    const items = row.map(findAny);
    const tops = items.filter(Boolean).map((i) => i.top);
    check(
      `row ${row.join(' | ')}`,
      items.every(Boolean) && Math.max(...tops) - Math.min(...tops) <= 12,
      items.map((i) => i?.top ?? '-').join(','),
    );
  }
  for (const s of e.steps ?? []) {
    check(
      `step "${s}"`,
      dom.steps.some((t) => norm(t).includes(s)),
    );
  }
  for (const t of e.tabs ?? []) {
    check(
      `tab "${t}"`,
      dom.tabs.some((x) => norm(x).includes(t)),
    );
  }
  for (const l of e.lists ?? []) {
    const list = dom.lists.find((x) =>
      l.columns.every((c) => x.headers.some((h) => norm(h).includes(c))),
    );
    check(`list with columns ${l.columns.join(', ')}`, !!list, JSON.stringify(dom.lists));
    check(`list has ${l.minRows}+ rows`, !!list && list.rows >= l.minRows, `got ${list?.rows}`);
  }
  for (const t of e.texts ?? []) {
    check(`text "${t}"`, norm(dom.text).includes(t));
  }
  for (const b of e.buttons ?? []) {
    check(
      `button "${b}"`,
      dom.buttons.some((x) => norm(x.label).includes(b)),
    );
  }
  const problems = result.console.filter((l) => !/Angular is running in development mode/.test(l));
  check('console clean', problems.length === 0, problems.join(' / ').slice(0, 500));
  result.dom = {
    fields: dom.fields,
    buttons: dom.buttons.map((b) => b.label),
    tabs: dom.tabs,
    steps: dom.steps,
    lists: dom.lists,
  };
  result.score = result.checks.filter((c) => c.ok).length / result.checks.length;
  return result;
}

async function run() {
  const template = resolve(opt('template'));
  const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const work = resolve(opt('work'), runId);
  const variants = opt('variants', 'none,agents').split(',');
  const model = opt('model');
  const claude = opt('claude', 'claude');
  const chromium = chromiumFrom(template);
  log(
    `run ${runId}: ${cases().join(', ')} x ${variants.join(', ')}${model ? ` with ${model}` : ''}`,
  );
  for (const id of cases()) {
    const spec = JSON.parse(readFileSync(join(casesDir, id, 'case.json'), 'utf8'));
    for (const variant of variants) {
      const name = `${id}-${variant}`;
      const dir = join(work, 'apps', name);
      const out = join(work, 'results', name);
      mkdirSync(out, { recursive: true });
      prepare(template, dir, id, variant);
      log(`${name}: agent working`);
      const started = Date.now();
      const response = await agent(dir, spec.prompt, model, claude);
      stopProcessesIn(dir);
      const stats = transcriptStats(response.session_id);
      writeFileSync(join(out, 'claude.json'), JSON.stringify(response, null, 2));
      log(`${name}: agent done in ${Math.round((Date.now() - started) / 1000)}s, scoring`);
      const result = await score(chromium, dir, spec, out);
      stopProcessesIn(dir);
      Object.assign(result, {
        case: id,
        variant,
        seconds: Math.round((Date.now() - started) / 1000),
        cost: response.total_cost_usd,
        turns: response.num_turns,
        agentError:
          response.is_error || response.error ? (response.result ?? response.error) : undefined,
        stats,
        answer: typeof response.result === 'string' ? response.result.slice(0, 3000) : undefined,
      });
      writeFileSync(join(out, 'score.json'), JSON.stringify(result, null, 2));
      log(
        `${name}: built ${result.built}, score ${(result.score * 100).toFixed(0)}%, docs read ${stats.docsRead}, snaps ${stats.snaps}`,
      );
      // The node_modules clone is the bulk; the results keep the code and screenshots.
      rmSync(join(dir, 'node_modules'), { recursive: true, force: true });
    }
  }
  report(work);
}

function report(work) {
  const results = join(work, 'results');
  const rows = readdirSync(results)
    .map((d) => join(results, d, 'score.json'))
    .filter(existsSync)
    .map((f) => JSON.parse(readFileSync(f, 'utf8')));
  const lines = [
    '| Case | Variant | Built | Score | Failed checks | Docs read | Snaps | Time | Cost |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of rows) {
    const failed = r.checks
      .filter((c) => !c.ok)
      .map((c) => c.name + (c.detail ? ` (${c.detail})` : ''));
    lines.push(
      `| ${r.case} | ${r.variant} | ${r.built ? 'yes' : `no (${r.buildErrors} errors)`} | ${Math.round(r.score * 100)}% | ${failed.join('; ').slice(0, 300) || '-'} | ${r.stats.docsRead} | ${r.stats.snaps} | ${Math.round(r.seconds / 60)} min | ${r.cost ? `$${r.cost.toFixed(2)}` : '-'} |`,
    );
  }
  for (const variant of [...new Set(rows.map((r) => r.variant))]) {
    const mine = rows.filter((r) => r.variant === variant);
    const avg = mine.reduce((s, r) => s + r.score, 0) / mine.length;
    lines.push(
      '',
      `**${variant}**: ${mine.filter((r) => r.built).length}/${mine.length} built, average score ${Math.round(avg * 100)}%`,
    );
  }
  const md = lines.join('\n') + '\n';
  writeFileSync(join(work, 'report.md'), md);
  console.log(md);
}

/** One image per case: the design next to each variant's render, at the same scale. */
async function sheets(work) {
  const results = join(work, 'results');
  const browser = await launch(chromiumFrom(opt('template')));
  const page = await browser.newPage({ viewport: { width: 3600, height: 1000 } });
  // PNG width from the header; the design was taken at twice the CSS size, renders at 1x.
  const cssWidth = (file, scale) => readFileSync(file).readUInt32BE(16) / scale;
  for (const id of cases()) {
    const runs = readdirSync(results).filter(
      (d) => d.startsWith(`${id}-`) && existsSync(join(results, d, 'render.png')),
    );
    const column = (title, file, scale) =>
      `<figure><figcaption>${title}</figcaption><img src="file://${file}" style="width:${cssWidth(file, scale)}px"></figure>`;
    const design = join(casesDir, id, 'design.png');
    const html = `<style>body{margin:0;font:600 22px system-ui;display:flex;gap:24px;padding:24px;background:#ccc;align-items:flex-start;width:max-content}
      figure{margin:0;background:#fff;padding:8px}figcaption{margin-bottom:8px}</style>
      ${column('Design', design, 2)}
      ${runs.map((r) => column(r.slice(id.length + 1), join(results, r, 'render.png'), 1)).join('')}`;
    const file = join(work, `sheet-${id}.html`);
    writeFileSync(file, html);
    await page.goto(`file://${file}`);
    await page.waitForLoadState('load');
    await page.setViewportSize({
      width: await page.evaluate(() => document.body.scrollWidth),
      height: 1000,
    });
    await page.screenshot({ path: join(work, `sheet-${id}.png`), fullPage: true });
    log(`sheet-${id}.png`);
  }
  await browser.close();
}

/** Reads each run's code for what the rules forbid or prefer; the score only sees the page. */
function audit(work) {
  const results = join(work, 'results');
  const files = (dir) =>
    readdirSync(dir, { recursive: true })
      .map((f) => join(dir, f))
      .filter(
        (f) => /\.(ts|html|css|scss)$/.test(f) && !f.endsWith('.spec.ts') && statSync(f).isFile(),
      );
  const count = (text, re) => (text.match(re) ?? []).length;
  const lines = [
    '| Run | Type escapes | Internal classes styled | Raw controls | Tokens set | Inline styles |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const run of readdirSync(results).sort()) {
    const src = join(results, run, 'src');
    if (!existsSync(src)) {
      continue;
    }
    let escapes = 0;
    let internal = 0;
    let raw = 0;
    let tokens = 0;
    let inline = 0;
    for (const file of files(src)) {
      const text = readFileSync(file, 'utf8');
      escapes += count(text, /\bas any\b|<any>|@ts-ignore|@ts-expect-error|as unknown as/g);
      // Selectors that reach into ngu-form's own markup (theme tokens are --ngu-*, not .ngu-*).
      internal += count(text, /::ng-deep|(^|[\s,{>])\.ngu-[a-z]/gm);
      // Hand-written form controls in templates.
      raw += count(text, /<(input|select|textarea)\b/g);
      tokens += new Set(text.match(/--ngu-[a-z-]+\s*:/g) ?? []).size;
      inline += count(text, /style="/g);
    }
    lines.push(`| ${run} | ${escapes} | ${internal} | ${raw} | ${tokens} | ${inline} |`);
  }
  const md = lines.join('\n') + '\n';
  writeFileSync(join(work, 'audit.md'), md);
  console.log(md);
}

if (command === 'render') {
  await render();
} else if (command === 'run') {
  await run();
} else if (command === 'report') {
  report(resolve(rest[0]));
} else if (command === 'audit') {
  audit(resolve(rest[0]));
} else if (command === 'sheets') {
  await sheets(resolve(rest[0]));
} else {
  console.error('Usage: run.mjs render|run|report|sheets|audit ...');
  process.exit(1);
}
