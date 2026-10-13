// `ng g <package>:ai`: writes the package's notes for AI coding agents into the project's
// instruction files, between markers so that running it again (after an update) replaces them.
// Compiled into each package's schematics/ai by generate.mjs; the notes are the package's own
// docs/AGENTS.md, so they always match the installed version.
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface AiOptions {
  /** Take the notes out again. */
  remove?: boolean;
}

/** The package root: this file is schematics/ai/index.js. */
const packageRoot = join(__dirname, '../..');

/**
 * Agents read different files. AGENTS.md is the shared one (Codex, Cursor, Copilot, and Claude
 * Code when there is no CLAUDE.md). Claude Code and Gemini CLI read their own files instead, so
 * those get the notes too when they exist, unless they already import AGENTS.md.
 */
const OWN_FILES = ['/CLAUDE.md', '/.claude/CLAUDE.md', '/GEMINI.md', '/.gemini/GEMINI.md'];
const IMPORTS_AGENTS = /^@(\.\.\/)?AGENTS\.md\s*$/m;

export function ai(options: AiOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const name: string = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).name;
    const notes = options.remove
      ? ''
      : readFileSync(join(packageRoot, 'docs/AGENTS.md'), 'utf8').trim();
    const files = [
      '/AGENTS.md',
      ...OWN_FILES.filter((f) => tree.exists(f) && !IMPORTS_AGENTS.test(tree.readText(f))),
    ];
    const changed: string[] = [];
    for (const file of files) {
      const before = tree.exists(file) ? tree.readText(file) : '';
      const after = withBlock(before, name, notes);
      if (after === before) {
        continue;
      }
      if (!after.trim()) {
        tree.delete(file);
      } else if (before) {
        tree.overwrite(file, after);
      } else {
        tree.create(file, after);
      }
      changed.push(file.slice(1));
    }
    if (options.remove) {
      context.logger.info(
        changed.length
          ? `${name}: removed the agent notes from ${changed.join(', ')}.`
          : `${name}: no agent notes found.`,
      );
    } else if (changed.length) {
      context.logger.info(
        `${name}: AI coding agents will find notes and a docs index in ${changed.join(', ')}. ` +
          `Run "ng g ${name}:ai" again after updating ${name}.`,
      );
    } else {
      context.logger.info(`${name}: the agent notes are up to date.`);
    }
  };
}

/** For packages without an ng-add of their own: asks first, then runs `ai`. */
export function ngAdd(options: AiOptions & { ai?: boolean }): Rule {
  return options.ai === false ? () => undefined : ai(options);
}

/** Replaces the package's block, adds it at the end, or (with empty notes) removes it. */
export function withBlock(text: string, name: string, notes: string): string {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const block = notes
    ? `${start}\n<!-- Written by "ng g ${name}:ai". Edits inside this block are replaced when it runs again. -->\n\n${notes}\n\n${end}`
    : '';
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  if (from >= 0 && to >= 0) {
    const head = text.slice(0, from);
    const tail = text.slice(to + end.length);
    if (block) {
      return head + block + tail;
    }
    const joined = `${head.replace(/\s+$/, '')}\n\n${tail.replace(/^\s+/, '')}`.trim();
    return joined ? `${joined}\n` : '';
  }
  if (!block) {
    return text;
  }
  return text.trim() ? `${text.replace(/\s+$/, '')}\n\n${block}\n` : `${block}\n`;
}
