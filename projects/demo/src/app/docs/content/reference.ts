import type { ApiRow, DocCode, DocPage, DocSection } from 'docs-kit/docs/model';
import type { CodeLang } from 'docs-kit/ui/highlighter';

// The API reference pages, built from JSON that projects/docs-kit/api/api.mjs writes from the
// package's .d.ts files and their TSDoc (`npm run api:update`). Do not edit the JSON by hand.

interface RefMember {
  readonly name: string;
  readonly kind: string;
  readonly type: string;
  readonly description: string;
  readonly required?: boolean;
  readonly optional?: boolean;
  readonly default?: string;
  readonly deprecated?: string;
}

interface RefSymbol {
  readonly name: string;
  readonly kind: string;
  readonly selector?: string;
  readonly summary: string;
  readonly deprecated?: string;
  readonly examples?: readonly string[];
  readonly signature: string;
  readonly members?: readonly RefMember[];
}

interface RefEntry {
  readonly entry: string;
  readonly symbols: readonly RefSymbol[];
}

const load = (file: Promise<{ default: unknown }>) => file.then((m) => m.default as RefEntry);

/** Entry point name to its data, in sidebar order. */
export const REFERENCE: Record<string, () => Promise<RefEntry>> = {
  'ngu-form': () => load(import('./reference/ngu-form.json')),
  'ngu-form/upload': () => load(import('./reference/ngu-form-upload.json')),
  'ngu-form/material': () => load(import('./reference/ngu-form-material.json')),
  'ngu-form/primeng': () => load(import('./reference/ngu-form-primeng.json')),
  'ngu-form/dropdown': () => load(import('./reference/ngu-form-dropdown.json')),
  'ngu-form/tailwind': () => load(import('./reference/ngu-form-tailwind.json')),
  'ngu-form/testing': () => load(import('./reference/ngu-form-testing.json')),
  'ngu-form/playwright': () => load(import('./reference/ngu-form-playwright.json')),
  'ngu-form/debug': () => load(import('./reference/ngu-form-debug.json')),
};

const GROUPS: readonly (readonly [id: string, title: string, kinds: readonly string[]])[] = [
  ['components', 'Components and directives', ['component', 'directive']],
  ['functions', 'Functions', ['function']],
  ['classes', 'Classes', ['class']],
  ['constants', 'Constants and tokens', ['const']],
  ['interfaces', 'Interfaces', ['interface']],
  ['types', 'Types', ['type', 'enum']],
  ['augmentations', 'Added to other modules', ['augmentation']],
];

export async function referencePage(entry: string): Promise<DocPage> {
  const data = await REFERENCE[entry]();
  return {
    title: entry,
    description: `Every export of \`${entry}\`, generated from the package's type declarations and their TSDoc. The guides explain how the pieces fit together.`,
    sections: GROUPS.map(([id, title, kinds]) => ({
      id,
      title,
      children: data.symbols.filter((s) => kinds.includes(s.kind)).map(symbolSection),
    })).filter((g) => g.children.length > 0),
  };
}

function symbolSection(symbol: RefSymbol): DocSection {
  const { text, list, code } = parse(symbol.summary);
  // Apps use a component through its inputs and outputs; its other public members serve
  // ngu-form itself and are listed in the API report only.
  const angular = symbol.kind === 'component' || symbol.kind === 'directive';
  const members = (symbol.members ?? []).filter((m) => !angular || ['input', 'output', 'model'].includes(m.kind));
  const showsMembers = members.length > 0 && symbol.kind !== 'augmentation';
  // Members get a table; the declaration then needs only its first line (generics, `extends`).
  const declaration = showsMembers ? symbol.signature.split('\n')[0].replace(/\s*\{$/, '') : symbol.signature;
  const examples = (symbol.examples ?? []).flatMap((e) => parse(e).code);
  return {
    id: symbol.kind === 'augmentation' ? `augments-${symbol.name.replace(/\W+/g, '-')}` : symbol.name,
    title: symbol.selector ? `${symbol.name} · ${symbol.selector}` : symbol.name,
    text: [...(symbol.deprecated ? [`**Deprecated.** ${symbol.deprecated}`] : []), ...text],
    list: list.length ? list : undefined,
    code: [{ code: declaration, lang: 'angular-ts' }, ...code, ...examples],
    api: showsMembers ? members.map(row) : undefined,
  };
}

function row(member: RefMember): ApiRow {
  const notes = [
    member.kind === 'input' || member.kind === 'output' || member.kind === 'model' ? member.kind : '',
    member.required ? 'required' : '',
    member.kind === 'method' ? 'method' : '',
    member.deprecated ? 'deprecated' : '',
  ].filter(Boolean);
  return {
    name: member.name + (member.optional ? '?' : ''),
    type: member.type,
    default: member.default,
    description: [member.deprecated ? `Deprecated: ${member.deprecated}` : '', member.description].filter(Boolean).join(' '),
    note: notes.join(', ') || undefined,
  };
}

const LANGS: Record<string, CodeLang> = { html: 'angular-html', scss: 'css', css: 'css', bash: 'bash', sh: 'bash', json: 'json' };

/** TSDoc text to paragraphs, one list and code blocks. */
function parse(doc: string): { text: string[]; list: string[]; code: DocCode[] } {
  const text: string[] = [];
  const list: string[] = [];
  const code: DocCode[] = [];
  const fences = doc.split(/^```(\w*)\n([\s\S]*?)^```$/m);
  for (let i = 0; i < fences.length; i += 3) {
    for (const block of fences[i].split(/\n\s*\n/)) {
      const lines = block.trim().split('\n');
      if (!lines[0]) continue;
      if (lines.every((l) => /^\s*- /.test(l) || /^\s{2,}\S/.test(l)) && /^\s*- /.test(lines[0])) {
        const items = block.trim().split(/\n\s*- /).map((item) => item.replace(/^- /, '').replace(/\s*\n\s*/g, ' '));
        (list.length ? text : list).push(...(list.length ? [items.map((x) => `- ${x}`).join(' ')] : items));
      } else {
        text.push(lines.map((l) => l.trim()).join(' '));
      }
    }
    if (i + 2 < fences.length) {
      code.push({ code: fences[i + 2].replace(/\n$/, ''), lang: LANGS[fences[i + 1]] ?? 'angular-ts' });
    }
  }
  return { text, list, code };
}
