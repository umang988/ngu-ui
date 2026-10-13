import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { HostTree } from '@angular-devkit/schematics';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';

// Runs against the built packages: `npm run build:form` and `npm run build:dropdown` first. The
// `ai` schematic and the docs are written by projects/docs-kit/agents/generate.mjs.
const dist = path.join(import.meta.dirname, '../../../dist');
const form = new SchematicTestRunner('ngu-form', path.join(dist, 'ngu-form/schematics/collection.json'));
const dropdown = new SchematicTestRunner('ngu-dropdown', path.join(dist, 'ngu-dropdown/schematics/collection.json'));

async function app(): Promise<UnitTestTree> {
  const tree = new HostTree() as unknown as UnitTestTree;
  const workspace = await form.runExternalSchematic('@schematics/angular', 'workspace', { name: 'ws', newProjectRoot: 'projects', version: '22.2.0' });
  return form.runExternalSchematic('@schematics/angular', 'application', { name: 'demo', standalone: true, skipTests: true, style: 'css' }, workspace ?? tree);
}

const count = (text: string, part: string) => text.split(part).length - 1;

describe('agent notes', () => {
  it('ng add writes them to AGENTS.md, unless declined', async () => {
    const tree = await form.runSchematic('ng-add', { project: 'demo', sample: false, skipInstall: true }, await app());
    const notes = tree.readText('/AGENTS.md');
    expect(notes).toContain('<!-- ngu-form:start -->');
    expect(notes).toContain('[ngu-form docs]|root: ./node_modules/ngu-form/docs');
    expect(notes).toContain('node_modules/ngu-form/docs/guides/from-image.md');

    const declined = await form.runSchematic('ng-add', { project: 'demo', sample: false, ai: false, skipInstall: true }, await app());
    expect(declined.exists('/AGENTS.md')).toBe(false);
  });

  it('replaces its own block on a second run and keeps everything else', async () => {
    const base = await app();
    base.create('/AGENTS.md', '# Team rules\n\nUse pnpm.\n');
    const once = await form.runSchematic('ai', {}, base);
    const twice = await form.runSchematic('ai', {}, once);
    const notes = twice.readText('/AGENTS.md');
    expect(notes.startsWith('# Team rules\n\nUse pnpm.\n\n<!-- ngu-form:start -->')).toBe(true);
    expect(count(notes, '<!-- ngu-form:start -->')).toBe(1);
    expect(count(notes, '<!-- ngu-form:end -->')).toBe(1);
  });

  it("writes CLAUDE.md and GEMINI.md too, unless they import AGENTS.md", async () => {
    const base = await app();
    base.create('/CLAUDE.md', '# Project\n');
    base.create('/.gemini/GEMINI.md', '@../AGENTS.md\n');
    const tree = await form.runSchematic('ai', {}, base);
    expect(tree.readText('/CLAUDE.md')).toContain('<!-- ngu-form:start -->');
    expect(tree.readText('/.gemini/GEMINI.md')).toBe('@../AGENTS.md\n');
    expect(tree.exists('/GEMINI.md')).toBe(false);
  });

  it('removes its block, and a file that held nothing else', async () => {
    const base = await app();
    base.create('/CLAUDE.md', '# Project\n\nKeep this.\n');
    const added = await form.runSchematic('ai', {}, base);
    const removed = await form.runSchematic('ai', { remove: true }, added);
    expect(removed.exists('/AGENTS.md')).toBe(false);
    expect(removed.readText('/CLAUDE.md')).toBe('# Project\n\nKeep this.\n');
  });

  it('ngu-dropdown gets ng add and ai with its own notes', async () => {
    const tree = await dropdown.runSchematic('ng-add', {}, await app());
    const notes = tree.readText('/AGENTS.md');
    expect(notes).toContain('<!-- ngu-dropdown:start -->');
    expect(notes).toContain('[ngu-dropdown docs]|root: ./node_modules/ngu-dropdown/docs');
    const both = await form.runSchematic('ai', {}, tree);
    const merged = both.readText('/AGENTS.md');
    expect(count(merged, ':start -->')).toBe(2);
  });
});

describe('generated docs', () => {
  function markdown(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const file = path.join(dir, name);
      return statSync(file).isDirectory() ? markdown(file) : name.endsWith('.md') ? [file] : [];
    });
  }

  for (const pkg of ['ngu-form', 'ngu-dropdown']) {
    it(`${pkg}: every relative link points to a file`, () => {
      const broken: string[] = [];
      for (const file of markdown(path.join(dist, pkg, 'docs'))) {
        for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\(([^)\s#]+\.md)(#[^)]*)?\)/g)) {
          // `node_modules/…` links are from the project root (the AGENTS.md block); checked below.
          const relativeLink = !target.startsWith('http') && !target.startsWith('node_modules/');
          if (relativeLink && !existsSync(path.join(path.dirname(file), target))) {
            broken.push(`${path.relative(dist, file)} -> ${target}`);
          }
        }
      }
      expect(broken).toEqual([]);
    });

    it(`${pkg}: the AGENTS.md block stays small and every index entry exists`, () => {
      const docs = path.join(dist, pkg, 'docs');
      const block = readFileSync(path.join(docs, 'AGENTS.md'), 'utf8');
      // It is read on every turn; Vercel's measured block was 8 KB.
      expect(block.length).toBeLessThan(12_000);
      const missing: string[] = [];
      for (const [, files] of block.matchAll(/^\|[^:|]+:\{(.+)\}$/gm)) {
        for (const entry of files.split(/,(?![^(]*\))/)) {
          const file = entry.replace(/ \(.*\)$/, '');
          const inGuides = path.join(docs, 'guides', file);
          if (!existsSync(path.join(docs, file)) && !existsSync(inGuides)) {
            missing.push(file);
          }
        }
      }
      expect(missing).toEqual([]);
      for (const link of block.matchAll(/\]\((node_modules\/[^)#]+)/g)) {
        expect(existsSync(path.join(dist, link[1].replace(/^node_modules\//, '')))).toBe(true);
      }
    });
  }

  it('skills follow the Agent Skills format', () => {
    for (const pkg of ['ngu-form', 'ngu-dropdown']) {
      const skills = path.join(dist, pkg, 'skills');
      for (const name of readdirSync(skills)) {
        const text = readFileSync(path.join(skills, name, 'SKILL.md'), 'utf8');
        const front = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(text);
        expect(front?.[1]).toBe(name);
        expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(JSON.parse(front![2]).length).toBeLessThanOrEqual(1024);
      }
    }
  });
});
