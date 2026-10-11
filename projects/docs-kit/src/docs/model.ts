import type { Type } from '@angular/core';
import type { CodeLang } from '../ui/highlighter';

/**
 * One documentation page. Text fields are plain strings in which `backticks` mark code and
 * `[words](/path#fragment)` marks a link.
 */
export interface DocPage {
  readonly title: string;
  /** One or two sentences under the title. */
  readonly description: string;
  readonly sections: readonly DocSection[];
  /** The API tab. Pages without it show no tabs. */
  readonly api?: readonly ApiGroup[];
}

export interface DocSection {
  /** Anchor id, unique on the page. */
  readonly id: string;
  readonly title: string;
  /** Paragraphs. */
  readonly text?: readonly string[];
  readonly list?: readonly string[];
  /** A live form above its own source. */
  readonly demo?: DocDemo;
  /** Code without a live demo. */
  readonly code?: readonly DocCode[];
  readonly table?: DocTable;
  /** Paragraphs after the demo, code or table. */
  readonly after?: readonly string[];
  /** A Markdown file under `/source`, rendered in place (the changelog). */
  readonly markdown?: string;
  /** Smaller headings inside the section. */
  readonly children?: readonly DocSection[];
}

export interface DocDemo {
  /** Path under `src/app/docs/demos`; the file is shown under the live form. */
  readonly src: string;
  readonly load: () => Promise<Type<unknown>>;
  /** Show the model value beside the form. Default `true`. */
  readonly value?: boolean;
  /** More source files the demo uses, shown as tabs after its own. */
  readonly files?: readonly string[];
}

export interface DocCode {
  readonly code: string;
  readonly lang?: CodeLang;
  readonly filename?: string;
}

export interface DocTable {
  /** Read by screen readers; the section heading already shows. */
  readonly caption: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** A table of options, inputs or members on the API tab. */
export interface ApiGroup {
  readonly id: string;
  readonly title: string;
  readonly text?: string;
  readonly rows: readonly ApiRow[];
}

export interface ApiRow {
  readonly name: string;
  readonly type: string;
  readonly default?: string;
  readonly description: string;
}
