import { ChangeDetectionStrategy, Component, computed, input, resource } from '@angular/core';
import { injectDocsSite } from '../site';
import { DocText } from './doc-text';

type Block =
  | { readonly kind: 'h2' | 'h3'; readonly id: string; readonly text: string }
  | { readonly kind: 'p'; readonly text: string }
  | { readonly kind: 'ul'; readonly items: readonly string[] };

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Reads the Markdown the changelog uses: `##` and `###` headings, `-` lists with indented
 * continuation lines, and paragraphs. `#` titles are skipped; the page has its own.
 */
export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let version = '';
  let list: string[] | undefined;
  let para: string[] | undefined;
  const flush = () => {
    if (list) {
      blocks.push({ kind: 'ul', items: list });
    }
    if (para) {
      blocks.push({ kind: 'p', text: para.join(' ') });
    }
    list = undefined;
    para = undefined;
  };
  for (const raw of source.split('\n')) {
    const line = raw.trimEnd();
    if (line === '') {
      flush();
      continue;
    }
    const heading = /^(#{1,3}) (.*)$/.exec(line);
    if (heading) {
      flush();
      const text = heading[2];
      if (heading[1] === '##') {
        version = slug(text.split(' ')[0]);
        blocks.push({ kind: 'h2', id: `v${version}`, text });
      } else if (heading[1] === '###') {
        blocks.push({ kind: 'h3', id: `v${version}-${slug(text)}`, text });
      }
      continue;
    }
    if (line.startsWith('- ')) {
      if (para) {
        flush();
      }
      list ??= [];
      list.push(line.slice(2));
    } else if (/^\s+\S/.test(line) && list) {
      list[list.length - 1] += ' ' + line.trim();
    } else {
      if (list) {
        flush();
      }
      para ??= [];
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** A Markdown file from `/source`, such as the changelog, rendered as headings, lists and text. */
@Component({
  selector: 'app-doc-markdown',
  imports: [DocText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'doc-markdown' },
  template: `
    @if (file.error()) {
      <p>
        The file did not load. It is <code>{{ sourceDir }}/{{ src() }}</code> in the repository.
      </p>
    }
    @for (b of blocks(); track $index) {
      @switch (b.kind) {
        @case ('h2') {
          <h2 [id]="$any(b).id">{{ $any(b).text }}</h2>
        }
        @case ('h3') {
          <h3 [id]="$any(b).id">{{ $any(b).text }}</h3>
        }
        @case ('ul') {
          <ul class="doc-section__list">
            @for (item of $any(b).items; track $index) {
              <li><app-doc-text [text]="item" /></li>
            }
          </ul>
        }
        @default {
          <p class="doc-section__text"><app-doc-text [text]="$any(b).text" /></p>
        }
      }
    }
  `,
})
export class DocMarkdown {
  protected readonly sourceDir = injectDocsSite().sourceDir;
  /** File name under `/source`. */
  readonly src = input.required<string>();

  protected readonly file = resource({
    params: () => this.src(),
    loader: async ({ params, abortSignal }) => {
      const res = await fetch(`source/${params}`, { signal: abortSignal });
      if (!res.ok) {
        throw new Error(`${res.status}`);
      }
      return res.text();
    },
  });
  protected readonly blocks = computed(() =>
    this.file.hasValue() ? parseMarkdown(this.file.value()) : [],
  );
}
