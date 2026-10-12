import { ChangeDetectionStrategy, Component, forwardRef, inject, input, output } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { injectNguI18n } from '../messages';
import type { AnyFieldDef } from '../types';
import { NguArray } from './ngu-array';
import { NguDynamic } from './ngu-dynamic';
import { NguFormContext } from './ngu-form-context';
import { NguGroup } from './ngu-group';
import { NguSection } from './ngu-section';

/** A group or list shown under a tab or a panel header. */
export interface SectionEntry {
  readonly key: string;
  readonly path: string;
  /** The definition without its title; the header shows it. */
  readonly inner: AnyFieldDef;
  readonly tree: Field<any> | undefined;
  readonly title: string | undefined;
}

/** The content of a tab or panel, written out where the section's injector is in reach. */
const CONTENT = `
  @switch (entry.inner.__ngu) {
    @case ('group') {
      <ngu-group
        [fields]="$any(entry.inner).fields"
        [tree]="entry.tree!"
        [cols]="$any(entry.inner).cols ?? 1"
        [description]="$any(entry.inner).description"
        [layout]="$any(entry.inner).layout ?? 'grid'"
        [path]="entry.path"
      />
    }
    @case ('array') {
      <ngu-array [def]="$any(entry.inner)" [tree]="entry.tree!" [path]="entry.path" />
    }
    @case ('dynamic') {
      <ngu-dynamic [def]="$any(entry.inner)" [tree]="entry.tree!" [path]="entry.path" />
    }
  }
`;

const BADGE = `
  @if (problems(entry); as count) {
    <span class="ngu-badge"><span aria-hidden="true">{{ count }}</span><span class="ngu-sr-only">{{ i18n.message('sectionProblems', { count }) }}</span></span>
  }
`;

const SHARED_STYLES = `
  .ngu-badge {
    min-inline-size: 1.25rem;
    padding: 0 0.375rem;
    border-radius: 999px;
    background: var(--ngu-error-color, #c62828);
    color: #fff;
    font-size: 0.75rem;
    line-height: 1.25rem;
    text-align: center;
  }
  .ngu-sr-only {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
  @media (forced-colors: active) {
    .ngu-badge {
      border: 1px solid CanvasText;
    }
  }
  @media print {
    .ngu-badge {
      display: none;
    }
  }
`;

/** Counts the problems inside a tab or panel once they would show. */
abstract class SectionBase {
  private readonly context = inject(NguFormContext, { optional: true });
  private readonly around = inject(NguSection, { optional: true });
  protected readonly i18n = this.context?.i18n ?? injectNguI18n();

  protected problems(entry: SectionEntry): number {
    const state = entry.tree?.();
    if (!state) {
      return 0;
    }
    const due = this.context?.submitAttempted() || this.around?.attempted() || (state.touched() && state.dirty());
    return due ? state.errorSummary().length : 0;
  }

  protected heading(entry: SectionEntry): string {
    return this.i18n.text(entry.title) ?? entry.key;
  }
}

/**
 * Child groups and lists of a group with `layout: 'tabs'`, as the ARIA tabs pattern. The
 * group keeps the selected tab, so it can follow refused submits.
 */
@Component({
  selector: 'ngu-tabs',
  imports: [NguSection, forwardRef(() => NguGroup), forwardRef(() => NguArray), forwardRef(() => NguDynamic)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-tabs' },
  template: `
    @let current = active();
    <div class="ngu-tabs__list" role="tablist" [attr.aria-labelledby]="labelledBy()" (keydown)="onKeydown($event)">
      @for (entry of tabs(); track entry.key) {
        <button
          type="button"
          role="tab"
          class="ngu-tab"
          [id]="idPrefix() + '-tab-' + entry.key"
          [attr.data-key]="entry.key"
          [attr.aria-selected]="entry.key === current"
          [attr.aria-controls]="idPrefix() + '-panel-' + entry.key"
          [tabIndex]="entry.key === current ? 0 : -1"
          (click)="select.emit(entry.key)"
        >
          <span>{{ heading(entry) }}</span>
          ${BADGE}
        </button>
      }
    </div>
    @for (entry of tabs(); track entry.key) {
      <div
        role="tabpanel"
        class="ngu-tabs__panel"
        [id]="idPrefix() + '-panel-' + entry.key"
        [attr.aria-labelledby]="idPrefix() + '-tab-' + entry.key"
        [hidden]="entry.key !== current"
        nguSection
        [nguSectionOpen]="entry.key === current"
        (nguSectionReveal)="select.emit(entry.key)"
      >
        <p class="ngu-print-title" aria-hidden="true">{{ heading(entry) }}</p>
        ${CONTENT}
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .ngu-tabs__list {
      display: flex;
      gap: 0.25rem;
      overflow-x: auto;
      border-block-end: 1px solid var(--ngu-border-color, #c7c7c7);
      margin-block-end: var(--ngu-gap, 1rem);
    }
    .ngu-tab {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      margin-block-end: -1px;
      font: inherit;
      font-weight: 500;
      color: var(--ngu-hint-color, #6b6b6b);
      background: none;
      border: 0;
      border-block-end: 2px solid transparent;
      cursor: pointer;
    }
    .ngu-tab[aria-selected='true'] {
      color: inherit;
      border-block-end-color: var(--ngu-primary, #1a73e8);
    }
    .ngu-tab:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: -2px;
    }
    .ngu-print-title {
      display: none;
    }
    @media (forced-colors: active) {
      .ngu-tab[aria-selected='true'] {
        border-block-end-color: Highlight;
      }
    }
    @media print {
      .ngu-tabs__list {
        display: none;
      }
      .ngu-tabs__panel[hidden] {
        display: block !important;
      }
      .ngu-print-title {
        display: block;
        margin: 1rem 0 0.5rem;
        font-weight: 600;
      }
    }
    ${SHARED_STYLES}
  `,
})
export class NguTabs extends SectionBase {
  readonly tabs = input.required<readonly SectionEntry[]>();
  /** Key of the selected tab. */
  readonly active = input<string>();
  readonly labelledBy = input<string | null>(null);
  readonly idPrefix = input.required<string>();
  readonly select = output<string>();

  /** Arrow keys move between tabs (mirrored right to left), Home and End go to the ends. */
  protected onKeydown(event: KeyboardEvent): void {
    const list = event.currentTarget as HTMLElement;
    const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>(':scope > [role="tab"]'));
    const at = buttons.indexOf(event.target as HTMLButtonElement);
    if (at < 0) {
      return;
    }
    const rtl = getComputedStyle(list).direction === 'rtl';
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = at + (rtl ? -1 : 1);
        break;
      case 'ArrowLeft':
        next = at + (rtl ? 1 : -1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = buttons[(next + buttons.length) % buttons.length];
    target.focus();
    const key = target.dataset['key'];
    if (key) {
      this.select.emit(key);
    }
  }
}

/** A collapsible group or list: a button in a heading and a named region. */
@Component({
  selector: 'ngu-panel',
  imports: [NguSection, forwardRef(() => NguGroup), forwardRef(() => NguArray), forwardRef(() => NguDynamic)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-panel', '[class.ngu-panel--open]': 'open()' },
  template: `
    @let entry = section();
    <h3 class="ngu-panel__heading">
      <button
        type="button"
        class="ngu-panel__toggle"
        [id]="idPrefix() + '-tab-' + entry.key"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="idPrefix() + '-panel-' + entry.key"
        (click)="toggle.emit()"
      >
        <span class="ngu-panel__chevron" aria-hidden="true"></span>
        <span class="ngu-panel__title">{{ heading(entry) }}</span>
        ${BADGE}
      </button>
    </h3>
    <div
      role="region"
      class="ngu-panel__body"
      [id]="idPrefix() + '-panel-' + entry.key"
      [attr.aria-labelledby]="idPrefix() + '-tab-' + entry.key"
      [hidden]="!open()"
      nguSection
      [nguSectionOpen]="open()"
      (nguSectionReveal)="toggle.emit()"
    >
      ${CONTENT}
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-inline-size: 0;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
    }
    .ngu-panel__heading {
      margin: 0;
      font-size: var(--ngu-title-size, 1rem);
    }
    .ngu-panel__toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      inline-size: 100%;
      padding: 0.75rem;
      font: inherit;
      font-weight: 600;
      text-align: start;
      color: inherit;
      background: none;
      border: 0;
      cursor: pointer;
    }
    .ngu-panel__toggle:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: -2px;
    }
    .ngu-panel__title {
      flex: 1;
    }
    /* Physical borders on purpose: the rotations below assume the right and bottom edges. */
    .ngu-panel__chevron {
      inline-size: 0.5rem;
      block-size: 0.5rem;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(-45deg);
      transition: transform 0.15s;
    }
    .ngu-panel__chevron:dir(rtl) {
      transform: rotate(135deg);
    }
    :host(.ngu-panel--open) .ngu-panel__chevron {
      transform: rotate(45deg);
    }
    .ngu-panel__body {
      padding: 0 0.75rem 0.75rem;
    }
    @media (prefers-reduced-motion: reduce) {
      .ngu-panel__chevron {
        transition: none;
      }
    }
    @media print {
      :host {
        border: 0;
      }
      .ngu-panel__chevron {
        display: none;
      }
      .ngu-panel__body[hidden] {
        display: block !important;
      }
      .ngu-panel__toggle,
      .ngu-panel__body {
        padding-inline: 0;
      }
    }
    ${SHARED_STYLES}
  `,
})
export class NguPanel extends SectionBase {
  readonly section = input.required<SectionEntry>();
  readonly open = input(false);
  readonly idPrefix = input.required<string>();
  /** The header was pressed, or a summary link asked to reveal the closed panel. */
  readonly toggle = output<void>();
}
