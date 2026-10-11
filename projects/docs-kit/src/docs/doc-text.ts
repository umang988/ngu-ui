import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type Part =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'strong'; readonly text: string }
  | {
      readonly kind: 'route';
      readonly text: string;
      readonly path: string;
      readonly fragment?: string;
    }
  | { readonly kind: 'href'; readonly text: string; readonly href: string };

const TOKEN = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

/** Splits doc text into plain text, `code`, **strong** and [links](/path#fragment). */
export function parseDocText(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) {
      parts.push({ kind: 'text', text: text.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      parts.push({ kind: 'code', text: m[1] });
    } else if (m[2] !== undefined) {
      const url = m[3];
      if (url.startsWith('/')) {
        const [path, fragment] = url.split('#');
        parts.push({ kind: 'route', text: m[2], path, fragment });
      } else {
        parts.push({ kind: 'href', text: m[2], href: url });
      }
    } else {
      parts.push({ kind: 'strong', text: m[4] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ kind: 'text', text: text.slice(last) });
  }
  return parts;
}

/**
 * Renders doc text. Content stays text; nothing is parsed as HTML. Plain text sits in a span so
 * the template's own line breaks never add spaces around it.
 */
@Component({
  selector: 'app-doc-text',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `@for (p of parts(); track $index) {
    @switch (p.kind) {
      @case ('code') {
        <code>{{ p.text }}</code>
      }
      @case ('strong') {
        <strong>{{ p.text }}</strong>
      }
      @case ('route') {
        <a [routerLink]="p.path" [fragment]="p.fragment">{{ p.text }}</a>
      }
      @case ('href') {
        <a [href]="p.href" rel="noopener">{{ p.text }}</a>
      }
      @default {
        <span>{{ p.text }}</span>
      }
    }
  }`,
})
export class DocText {
  readonly text = input.required<string>();
  protected readonly parts = computed(
    () =>
      parseDocText(this.text()) as readonly (Part & {
        path?: string;
        fragment?: string;
        href?: string;
      })[],
  );
}
