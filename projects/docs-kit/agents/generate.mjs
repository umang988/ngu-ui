// Turns a docs site's page data into Markdown for AI coding agents.
//
//   node projects/docs-kit/agents/generate.mjs <config.json> [--package <dir>] [--site <dir>]
//
// --package  writes docs/, skills/ and the `ai` schematic into a built npm package (after ng build)
// --site     writes llms.txt, llms-full.txt, AGENTS.md and one .md per page into a built docs site
//
// Pages come from the data the site renders (nav, page content, demo files), so the Markdown can't
// drift from the site. The hand-written parts (rules, guides, scripts) live in the package's
// agents/ folder; see the config file for the paths.
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? resolve(root, args[i + 1]) : undefined;
};
if (!args[0] || args[0].startsWith('--')) {
  console.error('Usage: generate.mjs <config.json> [--package <dir>] [--site <dir>]');
  process.exit(1);
}
const config = JSON.parse(readFileSync(resolve(root, args[0]), 'utf8'));
const fromRoot = (path) => resolve(root, path);

const { site, examples } = await loadSite();
const pkg = JSON.parse(readFileSync(fromRoot(config.packageJson), 'utf8'));
const entries = site.nav.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));
const pages = [];
for (const entry of entries) {
  if (entry.load) {
    pages.push({ entry, page: await entry.load() });
  } else {
    const example = examples.find((e) => `examples/${e.id}` === entry.path);
    if (example) {
      pages.push({ entry, example });
    }
  }
}
const guides = readGuides();
const known = new Set([
  ...pages.map((p) => p.entry.path),
  ...guides.map((g) => `guides/${g.name}`),
]);
const docsPath = `node_modules/${pkg.name}/docs`;

/**
 * Bundles the site's config with esbuild and imports it. Page loaders are dynamic imports of the
 * content files, so those are bundled; every other dynamic import (demo and example components)
 * is left unresolved, since it never runs here.
 */
async function loadSite() {
  const content = config.content.map((dir) => fromRoot(dir) + sep);
  const aliases = Object.fromEntries(
    Object.entries(config.aliases ?? {}).map(([k, v]) => [k, fromRoot(v)]),
  );
  const entry = [
    `export { SITE } from ${JSON.stringify(fromRoot(config.site))};`,
    config.examples
      ? `export { EXAMPLES } from ${JSON.stringify(fromRoot(config.examples))};`
      : 'export const EXAMPLES = [];',
  ].join('\n');
  const result = await build({
    stdin: { contents: entry, resolveDir: root, loader: 'ts', sourcefile: 'agent-docs-entry.ts' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
    tsconfig: join(root, 'tsconfig.json'),
    external: ['@angular/*'],
    plugins: [
      {
        name: 'docs-data-only',
        setup(b) {
          b.onResolve({ filter: /.*/ }, (a) => {
            if (aliases[a.path]) {
              return { path: aliases[a.path] };
            }
            if (a.kind === 'dynamic-import') {
              const target = a.path.startsWith('.') ? resolve(a.resolveDir, a.path) : '';
              return content.some((dir) => target.startsWith(dir))
                ? undefined
                : { path: a.path, external: true };
            }
            return undefined;
          });
        },
      },
    ],
  });
  // Written inside the workspace so that `@angular/core` resolves from node_modules.
  const out = join(root, 'node_modules/.cache/docs-kit-agents', `${config.name}.mjs`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, result.outputFiles[0].text);
  const mod = await import(`${pathToFileURL(out).href}?t=${Date.now()}`);
  return { site: mod.SITE, examples: mod.EXAMPLES };
}

/** Hand-written guides: `# Title`, then a `> description` line, then the body. */
function readGuides() {
  const dir = fromRoot(join(config.agents, 'guides'));
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const source = readFileSync(join(dir, file), 'utf8');
      const title = /^# (.+)$/m.exec(source)?.[1];
      const description = /^> (.+)$/m.exec(source)?.[1];
      if (!title || !description) {
        throw new Error(`${file}: start with "# Title" and a "> description" line.`);
      }
      return { name: file.replace(/\.md$/, ''), title, description, source };
    });
}

// ---------------------------------------------------------------------------------------------
// Links. Text uses site paths (`[spec](/api/spec#rules)`); each output gets its own form.
// ---------------------------------------------------------------------------------------------

/**
 * `package`: relative to the page inside docs/. `block`: from the user's project root, for the
 * AGENTS.md block and the skills. `site`: absolute .md URLs.
 */
function link(mode, from, target) {
  const [path, hash] = target.slice(1).split('#');
  const fragment = hash ? `#${hash}` : '';
  if (!known.has(path)) {
    return `${config.url}${target}`;
  }
  if (mode === 'site') {
    return `${config.url}/${path}.md${fragment}`;
  }
  if (mode === 'block') {
    return `${docsPath}/${path}.md${fragment}`;
  }
  return `${posix.relative(posix.dirname(from), path)}.md${fragment}`;
}

function text(mode, from, value) {
  return value.replace(/\]\((\/[^)\s]*)\)/g, (_, target) => `](${link(mode, from, target)})`);
}

/** Link text only, for one-line descriptions in an index. */
const plain = (value) => value.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

// ---------------------------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------------------------

function fence(code, lang) {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((m) => m.length));
  const ticks = '`'.repeat(Math.max(3, longest + 1));
  return `${ticks}${lang}\n${code.replace(/\s+$/, '')}\n${ticks}`;
}

const LANGS = {
  'angular-ts': 'ts',
  'angular-html': 'html',
  bash: 'bash',
  json: 'json',
  css: 'css',
};
const cell = (value) => value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
const code = (value) => (value.includes('`') ? value : `\`${value}\``);

function table(mode, from, columns, rows) {
  return [
    `| ${columns.map(cell).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map((c) => cell(text(mode, from, c))).join(' | ')} |`),
  ].join('\n');
}

/** Embedded Markdown (the changelog) loses its title and moves one heading level down. */
function embed(source, level) {
  return source
    .replace(/^# .*\n+/, '')
    .replace(/^(#+) /gm, (_, h) => `${'#'.repeat(Math.min(6, h.length + level - 1))} `)
    .trim();
}

function section(mode, from, s, level, out) {
  out.push(`${'#'.repeat(level)} ${s.title}`, '');
  for (const p of s.text ?? []) {
    out.push(text(mode, from, p), '');
  }
  if (s.list) {
    out.push(...s.list.map((i) => `- ${text(mode, from, i)}`), '');
  }
  if (s.demo) {
    for (const file of [s.demo.src, ...(s.demo.files ?? [])]) {
      const source = readFileSync(join(fromRoot(config.demos), file), 'utf8');
      out.push(
        `Demo source \`${file}\`, the code running on this page:`,
        '',
        fence(source, 'ts'),
        '',
      );
    }
  }
  for (const c of s.code ?? []) {
    if (c.filename) {
      out.push(`\`${c.filename}\`:`, '');
    }
    out.push(fence(c.code, LANGS[c.lang] ?? 'ts'), '');
  }
  if (s.table) {
    out.push(table(mode, from, s.table.columns, s.table.rows), '');
  }
  if (s.api?.length) {
    out.push(apiTable(mode, from, s.api), '');
  }
  if (s.markdown) {
    out.push(
      embed(readFileSync(join(fromRoot(config.markdown), s.markdown), 'utf8'), level + 1),
      '',
    );
  }
  for (const p of s.after ?? []) {
    out.push(text(mode, from, p), '');
  }
  for (const child of s.children ?? []) {
    section(mode, from, child, Math.min(6, level + 1), out);
  }
}

function header(mode, from, title, description) {
  return [
    `# ${title}`,
    '',
    `> ${text(mode, from, description)}`,
    '',
    `${pkg.name} ${pkg.version} · web page: ${config.url}/${from}`,
    '',
  ];
}

function pageMarkdown(mode, { entry, page, example }) {
  const from = entry.path;
  if (example) {
    const out = [...header(mode, from, `Example: ${example.title}`, example.summary)];
    out.push(text(mode, from, example.useCase), '', '## What it shows', '');
    out.push(...example.shows.map((s) => `- ${text(mode, from, s)}`), '', '## Source', '');
    for (const file of example.files) {
      const source =
        file.code ?? readFileSync(join(fromRoot(config.exampleSources), file.src), 'utf8');
      out.push(`\`${file.name}\`:`, '', fence(source, LANGS[file.lang] ?? 'ts'), '');
    }
    return out.join('\n').trim() + '\n';
  }
  const out = [...header(mode, from, page.title, page.description)];
  for (const s of page.sections) {
    section(mode, from, s, 2, out);
  }
  if (page.api?.length) {
    out.push('## API', '');
    for (const g of page.api) {
      out.push(`### ${g.title}`, '');
      if (g.text) {
        out.push(text(mode, from, g.text), '');
      }
      out.push(apiTable(mode, from, g.rows), '');
    }
  }
  return out.join('\n').trim() + '\n';
}

/** Options, inputs or members: names and types as code, notes after the name. */
function apiTable(mode, from, rows) {
  const defaults = rows.some((r) => r.default);
  const columns = defaults ? ['Name', 'Type', 'Default', 'Description'] : ['Name', 'Type', 'Description'];
  const name = (r) => code(r.name) + (r.note ? ` (${r.note})` : '');
  return table(
    mode,
    from,
    columns,
    rows.map((r) =>
      defaults
        ? [name(r), code(r.type), r.default ? code(r.default) : '', r.description]
        : [name(r), code(r.type), r.description],
    ),
  );
}

function guideMarkdown(mode, guide) {
  return text(mode, `guides/${guide.name}`, guide.source).trim() + '\n';
}

// ---------------------------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------------------------

const description = (p) => plain(p.example ? p.example.summary : p.page.description);

/** The llms.txt format: title, summary, then one list of links per sidebar group. */
function index(mode) {
  const href = (path) => (mode === 'site' ? `${config.url}/${path}.md` : `${path}.md`);
  const out = [`# ${pkg.name}`, '', `> ${pkg.description}`, ''];
  out.push(
    `Version ${pkg.version}. Install with \`${config.install}\`. These files are the docs site (${config.url}) as Markdown, including the source of every demo.`,
    '',
    `In a project that has ${pkg.name} installed, the same files for the installed version are in \`${docsPath}/\`.`,
    '',
    '## Start here',
    '',
    `- [Notes for AI coding agents](${href('AGENTS')}): the rules that matter most and how to check generated code. Paste into a project's AGENTS.md, or run \`${config.aiCommand}\`.`,
    ...guides.map((g) => `- [${g.title}](${href(`guides/${g.name}`)}): ${plain(g.description)}`),
    '',
  );
  const groups = [...new Set(pages.map((p) => p.entry.group))];
  for (const group of groups) {
    out.push(`## ${group}`, '');
    for (const p of pages.filter((x) => x.entry.group === group)) {
      out.push(`- [${p.entry.title}](${href(p.entry.path)}): ${description(p)}`);
    }
    out.push('');
  }
  return out.join('\n').trim() + '\n';
}

/** Words of a title that its file name doesn't already say. */
function hint(path, title) {
  const slug = path.split('/').pop().split('-');
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !['a', 'an', 'and', 'the', 'of', 'from', 'to', 'with'].includes(w));
  const covered = (w) => slug.some((s) => s.startsWith(w) || w.startsWith(s));
  return words.every(covered) ? '' : ` (${title})`;
}

/**
 * The block for a project's AGENTS.md: the hand-written rules, then a compressed index of the
 * docs in node_modules. A short index the agent always sees beats docs it has to go looking for.
 */
function agentsBlock() {
  const rules = readFileSync(fromRoot(join(config.agents, 'rules.md')), 'utf8');
  const out = [`## ${pkg.name} ${pkg.version}`, '', text('block', '', rules).trim(), ''];
  out.push(
    '### Docs index',
    '',
    `${pkg.name} is newer than your training data. Before using a feature, read its page below (paths from the project root) and prefer it over memory. Every page includes the full source of its working demos.`,
    '',
    `[${pkg.name} docs]|root: ./${docsPath}`,
  );
  if (guides.length) {
    out.push(`|guides:{${guides.map((g) => `${g.name}.md`).join(',')}}`);
  }
  const groups = [...new Set(pages.map((p) => p.entry.group))];
  for (const group of groups) {
    const items = pages
      .filter((p) => p.entry.group === group)
      .map((p) => `${p.entry.path}.md${hint(p.entry.path, p.entry.title)}`);
    out.push(`|${group}:{${items.join(',')}}`);
  }
  return out.join('\n').trim() + '\n';
}

function skill(name, body, descriptionText) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(descriptionText)}\n---\n\n${body.trim()}\n`;
}

// ---------------------------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------------------------

function write(file, contents) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

async function writePackage(dir) {
  if (!existsSync(join(dir, 'package.json'))) {
    throw new Error(`${dir} is not a built package. Run ng build first.`);
  }
  const docs = join(dir, 'docs');
  rmSync(docs, { recursive: true, force: true });
  rmSync(join(dir, 'skills'), { recursive: true, force: true });
  const block = agentsBlock();
  write(join(docs, 'AGENTS.md'), block);
  write(join(docs, 'README.md'), index('package'));
  for (const p of pages) {
    write(join(docs, `${p.entry.path}.md`), pageMarkdown('package', p));
  }
  for (const g of guides) {
    write(join(docs, 'guides', `${g.name}.md`), guideMarkdown('package', g));
  }
  for (const s of config.skills) {
    const folder = join(dir, 'skills', s.name);
    const guide = s.guide && guides.find((g) => g.name === s.guide);
    if (s.guide && !guide) {
      throw new Error(`Skill ${s.name}: no guide ${s.guide}.md`);
    }
    // The rules skill is the AGENTS.md block; a guide skill is the guide, linked from the project root.
    const body = guide ? text('block', '', guide.source.replace(/^> .+$/m, '')) : block;
    write(join(folder, 'SKILL.md'), skill(s.name, body, s.description));
    for (const script of s.scripts ?? []) {
      write(
        join(folder, 'scripts', script),
        readFileSync(fromRoot(join(config.agents, 'scripts', script)), 'utf8'),
      );
    }
  }
  await writeSchematic(dir);
  const files = pages.length + guides.length + 2;
  console.log(
    `Agent docs: ${files} files in ${relative(root, docs)}, ${config.skills.length} skills, ai schematic.`,
  );
}

/**
 * Compiles the shared `ai` schematic into the package and adds it to the package's collection,
 * creating one (with `ng-add`) for packages that have none.
 */
async function writeSchematic(dir) {
  const folder = join(dir, 'schematics');
  await build({
    entryPoints: [join(here, 'ai-schematic.ts')],
    outfile: join(folder, 'ai', 'index.js'),
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    external: ['@angular-devkit/*'],
    logLevel: 'silent',
  });
  const schema = readFileSync(join(here, 'ai-schema.json'), 'utf8').replaceAll(
    '{{name}}',
    pkg.name,
  );
  write(join(folder, 'ai', 'schema.json'), schema);
  const collectionFile = join(folder, 'collection.json');
  const collection = existsSync(collectionFile)
    ? JSON.parse(readFileSync(collectionFile, 'utf8'))
    : { schematics: {} };
  collection.schematics.ai = {
    description: `Add notes about ${pkg.name} for AI coding agents to AGENTS.md (and CLAUDE.md or GEMINI.md when the project has them).`,
    factory: './ai/index#ai',
    schema: './ai/schema.json',
  };
  if (
    !collection.schematics['ng-add'] ||
    collection.schematics['ng-add'].factory === './ai/index#ngAdd'
  ) {
    const ngAddSchema = readFileSync(join(here, 'ng-add-schema.json'), 'utf8').replaceAll(
      '{{name}}',
      pkg.name,
    );
    write(join(folder, 'ai', 'ng-add-schema.json'), ngAddSchema);
    collection.schematics['ng-add'] = {
      description: `Add ${pkg.name} to a project, with notes for AI coding agents in AGENTS.md.`,
      factory: './ai/index#ngAdd',
      schema: './ai/ng-add-schema.json',
    };
  }
  write(collectionFile, JSON.stringify(collection, null, 2) + '\n');
  // The package is ESM; schematics are CommonJS, as the Angular CLI loads them.
  write(join(folder, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
}

function writeSite(dir) {
  if (!existsSync(join(dir, 'index.html'))) {
    throw new Error(`${dir} is not a built site. Run ng build first.`);
  }
  const block = agentsBlock();
  write(join(dir, 'AGENTS.md'), block);
  write(join(dir, 'llms.txt'), index('site'));
  const full = [index('site'), block];
  for (const g of guides) {
    const md = guideMarkdown('site', g);
    write(join(dir, 'guides', `${g.name}.md`), md);
    full.push(md);
  }
  for (const p of pages) {
    const md = pageMarkdown('site', p);
    write(join(dir, `${p.entry.path}.md`), md);
    full.push(md);
  }
  write(join(dir, 'llms-full.txt'), full.join('\n---\n\n'));
  console.log(
    `Agent docs: llms.txt, llms-full.txt, AGENTS.md and ${pages.length + guides.length} pages in ${relative(root, dir)}.`,
  );
}

// Runs last: the helpers above are consts.
const packageDir = option('--package');
if (packageDir) {
  await writePackage(packageDir);
}
const siteDir = option('--site');
if (siteDir) {
  writeSite(siteDir);
}
if (!packageDir && !siteDir) {
  console.error('Nothing to do: pass --package and/or --site.');
  process.exit(1);
}
