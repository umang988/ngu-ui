import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { copyRow, NGU_PATH, ordered } from '../internal';
import { injectNguI18n } from '../messages';
import { isLeafDef, type ArrayDef, type FormDefinition, type LeafDef } from '../types';
import { NguField } from './ngu-field';
import { NguFormContext } from './ngu-form-context';
import { NguArrayTable } from './ngu-array-table';
import type { ArrayColumn, ArrayRow } from './ngu-array-table';
import { NguGroup } from './ngu-group';
import { NguSection } from './ngu-section';
import { injectNguLook } from '../look';

let nextArrayId = 0;
let nextRowId = 0;

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Rows rendered above and below the visible ones in a virtual list. */
const OVERSCAN = 4;

type Row = ArrayRow;
type Column = ArrayColumn;

/** A pointer drag in progress: the row picked up and the gap it would drop into. */
interface Drag {
  readonly from: number;
  /** Insert position, from 0 (before the first row) to the row count (after the last). */
  readonly over: number;
}

/**
 * Renders an array property as a list of rows, or as a table. The item definition is
 * rendered once per element; adding, removing, moving and copying rows updates the model.
 */
@Component({
  selector: 'ngu-array',
  imports: [NgTemplateOutlet, NguField, NguSection, NguArrayTable, forwardRef(() => NguGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ngu-unstyled]': "look().theme === 'none'",
    '[class]': 'look().classes.list',
    class: 'ngu-array',
    '[attr.data-ngu-path]': 'modelPath()',
    '[class.ngu-array--invalid]': 'showErrors()',
    '[class.ngu-array--table]': 'table()',
    '[class.ngu-array--dragging]': '!!drag()',
    '[attr.role]': "def().title ? 'group' : null",
    '[attr.aria-labelledby]': 'def().title ? titleId : null',
    '[class.ngu-array--narrow]': 'narrow()',
  },
  template: `
    @let d = def();
    @if (d.title) {
      <h3 class="ngu-array__title" [class]="look().classes.title" [id]="titleId">{{ i18n.text(d.title) }}</h3>
    }
    @if (d.description) {
      <p class="ngu-array__description">{{ i18n.text(d.description) }}</p>
    }
    <div
      #viewport
      class="ngu-array__viewport"
      [class.ngu-array__viewport--virtual]="virtual()"
      (scroll)="onScroll()"
    >
      @if (table()) {
        @defer (on immediate) {
          <ngu-array-table [host]="this" [actions]="actionsTpl" />
        }
      } @else {
        @if (padStart()) {
          <div class="ngu-spacer" aria-hidden="true" [style.height.px]="padStart()"></div>
        }
        <div class="ngu-array__rows" [attr.role]="rows().length ? 'list' : null">
          @for (row of visibleRows(); track row.field) {
            <div
              class="ngu-array__row"
              [class]="look().classes.row"
              role="listitem"
              [class.ngu-array__row--summarized]="!!d.summary"
              [class.ngu-array__row--tools]="!!d.reorder || !!d.duplicate"
              [class.ngu-array__row--picked]="drag()?.from === row.index"
              [class.ngu-array__row--drop-before]="dropBefore(row.index)"
              [class.ngu-array__row--drop-after]="dropAfter(row.index)"
              [attr.data-index]="row.index"
              [attr.aria-setsize]="virtual() ? rows().length : null"
              [attr.aria-posinset]="virtual() ? row.index + 1 : null"
            >
              @if (d.summary) {
                @let open = isExpanded(row.field);
                <div class="ngu-array__head">
                  <button
                    type="button"
                    class="ngu-array__toggle"
                    [attr.aria-expanded]="open"
                    [attr.aria-controls]="rowId(row.field)"
                    (click)="toggleRow(row.field)"
                  >
                    <span class="ngu-array__chevron" [class.ngu-array__chevron--open]="open" aria-hidden="true"></span>
                    <span class="ngu-array__summary">{{ summaryOf(row) }}</span>
                    @if (rowShowsErrors(row.field)) {
                      <span class="ngu-array__flag">{{ i18n.message('rowNeedsAttention') }}</span>
                    }
                  </button>
                  <ng-container *ngTemplateOutlet="actionsTpl; context: { $implicit: row }" />
                </div>
                <div
                  class="ngu-array__body"
                  [id]="rowId(row.field)"
                  [hidden]="!open"
                  nguSection
                  [nguSectionOpen]="open"
                  (nguSectionReveal)="expand(row.field)"
                >
                  <!-- Written out here, not through contentTpl, so the fields see this row's nguSection. -->
                  @if (isLeaf(d.item)) {
                    <ngu-field [def]="d.item" [field]="row.field" [path]="itemPath()" />
                  } @else {
                    <ngu-group [fields]="itemFields()" [tree]="row.field" [cols]="d.cols" [path]="itemPath()" />
                  }
                </div>
              } @else {
                <ng-container *ngTemplateOutlet="contentTpl; context: { $implicit: row }" />
                <ng-container *ngTemplateOutlet="actionsTpl; context: { $implicit: row }" />
              }
            </div>
          } @empty {
            <p class="ngu-array__empty">{{ emptyText() }}</p>
          }
        </div>
        @if (padEnd()) {
          <div class="ngu-spacer" aria-hidden="true" [style.height.px]="padEnd()"></div>
        }
      }
    </div>
    @if (offscreenProblems(); as rows) {
      @if (rows.length) {
        <p class="ngu-error ngu-array__offscreen" [class]="look().classes.error">
          {{ i18n.message('rowsNeedAttention', { count: rows.length, rows: rowList(rows) }) }}
          <button type="button" class="ngu-array__link" (click)="goToRow(rows[0])">{{ i18n.message('goToEntry', { index: rows[0] + 1 }) }}</button>
        </p>
      }
    }
    @if (addLabel() && editable()) {
      <button type="button" class="ngu-array__add" [class]="look().classes.button" [disabled]="!canAdd()" (click)="add()">
        {{ addLabel() }}
      </button>
    }
    @if (showErrors()) {
      <p class="ngu-error" [class]="look().classes.error" [id]="titleId + '-msg'" tabindex="-1">{{ message() }}</p>
    }

    <ng-template #contentTpl let-row>
      @if (isLeaf(d.item)) {
        <ngu-field [def]="d.item" [field]="row.field" [path]="itemPath()" />
      } @else {
        <ngu-group [fields]="itemFields()" [tree]="row.field" [cols]="d.cols" [path]="itemPath()" />
      }
    </ng-template>

    <ng-template #actionsTpl let-row>
      @if (hasActions()) {
        <div class="ngu-array__actions">
          @if (d.reorder) {
            <span
              class="ngu-array__handle"
              aria-hidden="true"
              [class.ngu-array__handle--off]="!enabled() || rows().length < 2"
              [attr.title]="i18n.message('dragToReorder')"
              (pointerdown)="startDrag($event, row.index)"
            >
              <svg viewBox="0 0 10 16" width="10" height="16"><circle cx="2.5" cy="3" r="1.5" /><circle cx="7.5" cy="3" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13" r="1.5" /><circle cx="7.5" cy="13" r="1.5" /></svg>
            </span>
            <button
              type="button"
              class="ngu-array__icon ngu-array__up"
              [class]="look().classes.button"
              [disabled]="!enabled() || row.index === 0"
              [attr.aria-label]="i18n.message('moveUp', { index: row.index + 1 })"
              (click)="moveBy(row.index, -1)"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 3 14 11H2z" /></svg>
            </button>
            <button
              type="button"
              class="ngu-array__icon ngu-array__down"
              [class]="look().classes.button"
              [disabled]="!enabled() || row.index === rows().length - 1"
              [attr.aria-label]="i18n.message('moveDown', { index: row.index + 1 })"
              (click)="moveBy(row.index, 1)"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 13 2 5h12z" /></svg>
            </button>
          }
          <!-- Table rows are short on room: the same buttons as icons, named and with a tooltip. -->
          @if (duplicateLabel(); as copy) {
            <button
              type="button"
              class="ngu-array__duplicate"
              [class]="look().classes.button"
              [class.ngu-array__button]="!table()"
              [class.ngu-array__icon]="table()"
              [disabled]="!enabled() || !canAdd()"
              [attr.aria-label]="i18n.message('duplicateItem', { label: copy, index: row.index + 1 })"
              [attr.title]="table() ? copy : null"
              (click)="duplicate(row.index)"
            >
              @if (table()) {
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 1h9v9h-2V3H5zM2 5h8v10H2zm2 2v6h4V7z" /></svg>
              } @else {
                {{ copy }}
              }
            </button>
          }
          @if (removeLabel()) {
            <button
              type="button"
              class="ngu-array__remove"
              [class]="look().classes.button"
              [class.ngu-array__button]="!table()"
              [class.ngu-array__icon]="table()"
              [disabled]="!enabled() || !canRemove()"
              [attr.aria-label]="i18n.message('removeItem', { label: removeLabel(), index: row.index + 1 })"
              [attr.title]="table() ? removeLabel() : null"
              (click)="remove(row.index)"
            >
              @if (table()) {
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.4 2 8 6.6 12.6 2 14 3.4 9.4 8l4.6 4.6-1.4 1.4L8 9.4 3.4 14 2 12.6 6.6 8 2 3.4z" /></svg>
              } @else {
                {{ removeLabel() }}
              }
            </button>
          }
        </div>
      }
    </ng-template>
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-gap, var(--_ngu-gap, 1rem));
      min-inline-size: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__title {
      margin: 0;
      font-size: var(--ngu-title-size, 1rem);
      font-weight: 600;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__description,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__empty {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__viewport {
      min-inline-size: 0;
    }
    .ngu-array__viewport--virtual {
      max-block-size: var(--ngu-list-height, 32rem);
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__viewport--virtual {
      padding: 0.5rem;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
    }
    :host(.ngu-array--table:not(.ngu-unstyled)) .ngu-array__viewport {
      overflow-x: auto;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__rows {
      display: flex;
      flex-direction: column;
      gap: var(--ngu-gap, var(--_ngu-gap, 1rem));
      container-type: inline-size;
    }
    /* Move, copy and remove buttons go under the fields when the list itself is narrow. */
    @container (max-width: 36rem) {
      :host(:where(:not(.ngu-unstyled))) .ngu-array__row--tools:not(.ngu-array__row--summarized) {
        grid-template-columns: minmax(0, 1fr);
      }
      :host(:where(:not(.ngu-unstyled))) .ngu-array__row--tools .ngu-array__actions {
        justify-content: flex-end;
      }
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--ngu-gap, var(--_ngu-gap, 1rem));
      align-items: start;
      padding: var(--ngu-row-padding, var(--_ngu-row-padding, 0.75rem));
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__row--summarized {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__toggle {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-inline-size: 0;
      padding: 0.25rem;
      font: inherit;
      font-weight: 500;
      text-align: start;
      color: inherit;
      background: none;
      border: 0;
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__summary {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__flag {
      flex: none;
      font-size: 0.8125rem;
      color: var(--ngu-error-color, #c62828);
    }
    /* Physical borders on purpose: the rotations below assume the right and bottom edges. */
    :host(:where(:not(.ngu-unstyled))) .ngu-array__chevron {
      flex: none;
      inline-size: 0.5rem;
      block-size: 0.5rem;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(-45deg);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__chevron:dir(rtl) {
      transform: rotate(135deg);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__chevron--open,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__chevron--open:dir(rtl) {
      transform: rotate(45deg);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__body {
      margin-block-start: 0.75rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.375rem;
    }
    /* The buttons are stamped into table cells from this template, so their styles live here. */
    :host(.ngu-array--table:not(.ngu-unstyled)) .ngu-array__actions {
      flex-wrap: nowrap;
      gap: 0.25rem;
    }
    :host(.ngu-array--table:not(.ngu-unstyled)) .ngu-array__icon {
      padding: 0.4375rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__button,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__icon,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__add {
      font: inherit;
      font-size: 0.875rem;
      padding: var(--ngu-button-padding, var(--_ngu-button-padding, 0.5rem 1rem));
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      color: inherit;
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__icon {
      display: inline-grid;
      place-items: center;
      padding: 0.5rem;
      line-height: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__icon svg,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__handle svg {
      fill: currentColor;
    }
    .ngu-array__handle {
      touch-action: none;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__handle {
      display: inline-grid;
      place-items: center;
      padding: 0.5rem 0.25rem;
      color: var(--ngu-hint-color, #6b6b6b);
      cursor: grab;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__handle--off {
      opacity: 0.4;
      cursor: default;
    }
    :host(.ngu-array--dragging),
    :host(.ngu-array--dragging) .ngu-array__handle {
      user-select: none;
    }
    :host(.ngu-array--dragging:not(.ngu-unstyled)),
    :host(.ngu-array--dragging:not(.ngu-unstyled)) .ngu-array__handle {
      cursor: grabbing;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__row--picked {
      opacity: 0.55;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__row--drop-before {
      box-shadow: 0 -3px 0 var(--ngu-primary, #1a73e8);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__row--drop-after {
      box-shadow: 0 3px 0 var(--ngu-primary, #1a73e8);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__add {
      align-self: flex-start;
      color: var(--ngu-primary, #1a73e8);
      border-color: currentColor;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__button:disabled,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__icon:disabled,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__add:disabled {
      opacity: 0.5;
      cursor: default;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__button:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__icon:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__add:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__toggle:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-array__link:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-array__link {
      font: inherit;
      padding: 0;
      margin-inline-start: 0.25rem;
      border: 0;
      background: none;
      color: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-error {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--ngu-error-color, #c62828);
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
    :host(.ngu-array--narrow:not(.ngu-unstyled)) .ngu-array__row:not(.ngu-array__row--summarized) {
      grid-template-columns: 1fr;
    }
    @media (forced-colors: active) {
      :host(:where(:not(.ngu-unstyled))) .ngu-array__row--drop-before {
        border-block-start: 3px solid Highlight;
      }
      :host(:where(:not(.ngu-unstyled))) .ngu-array__row--drop-after {
        border-block-end: 3px solid Highlight;
      }
    }
    @media print {
      :host(:where(:not(.ngu-unstyled))) .ngu-array__actions,
      :host(:where(:not(.ngu-unstyled))) .ngu-array__add,
      :host(:where(:not(.ngu-unstyled))) .ngu-array__link,
      :host(:where(:not(.ngu-unstyled))) .ngu-array__chevron {
        display: none;
      }
      :host(:where(:not(.ngu-unstyled))) .ngu-array__body[hidden] {
        display: block !important;
      }
      .ngu-array__viewport--virtual {
        max-block-size: none;
        overflow: visible;
      }
      :host(:where(:not(.ngu-unstyled))) .ngu-array__row {
        break-inside: avoid;
      }
    }
  `,
})
export class NguArray {
  protected readonly look = injectNguLook();
  readonly def = input.required<ArrayDef>();
  readonly tree = input.required<Field<any>>();
  /** Dot path of this list inside the form. */
  readonly path = input<string>('');

  readonly itemPath = computed(() => this.path() + '[]');
  /** The list's model path, `orders.0.lines`; for tests and tools. */
  protected readonly modelPath = computed(() => this.tree()().metadata(NGU_PATH)?.() ?? (this.path() || null));

  readonly titleId = `ngu-array-${nextArrayId++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly context = inject(NguFormContext, { optional: true });
  private readonly section = inject(NguSection, { optional: true });
  readonly i18n = this.context?.i18n ?? injectNguI18n();
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  /** `''` hides a button; unset uses the translated default. */
  protected readonly addLabel = computed(() => {
    const label = this.def().addLabel;
    return label === undefined ? this.i18n.message('add') : this.i18n.text(label);
  });
  protected readonly removeLabel = computed(() => {
    const label = this.def().removeLabel;
    return label === undefined ? this.i18n.message('remove') : this.i18n.text(label);
  });
  protected readonly duplicateLabel = computed(() => {
    const copy = this.def().duplicate;
    return !copy ? undefined : copy === true ? this.i18n.message('duplicate') : this.i18n.text(copy);
  });
  private readonly interacted = linkedSignal({
    source: () => this.context?.resets() ?? 0,
    computation: () => false,
  });

  protected readonly isLeaf = isLeafDef;
  protected readonly itemFields = computed(() => this.def().item as FormDefinition);

  protected readonly state = computed(() => this.tree()());
  readonly rows = computed<readonly Field<any>[]>(() => {
    const list = this.tree() as unknown as ArrayLike<Field<any>>;
    return Array.from({ length: list.length }, (_, i) => list[i]);
  });
  /** Read-only lists show no editing buttons; disabled lists show them disabled. */
  protected readonly editable = computed(() => !this.state().readonly());
  protected readonly enabled = computed(() => !this.state().readonly() && !this.state().disabled());
  protected readonly canAdd = computed(() => {
    const max = this.def().max;
    return this.enabled() && (max == null || this.rows().length < max);
  });
  protected readonly canRemove = computed(() => {
    const min = this.def().min ?? 0;
    return this.rows().length > min;
  });
  readonly hasActions = computed(() => {
    const d = this.def();
    return this.editable() && Boolean(d.reorder || this.duplicateLabel() || this.removeLabel());
  });
  readonly emptyText = computed(() => {
    const add = this.addLabel();
    return add && this.editable() ? this.i18n.message('emptyList', { add }) : this.i18n.message('emptyListNoAdd');
  });
  /** Errors show after a submit attempt, or after Next on the step this list is in. */
  private readonly errorsDue = computed(() => Boolean(this.context?.submitAttempted() || this.section?.attempted()));
  protected readonly showErrors = computed(() => {
    const errors = this.state().errors();
    if (errors.length === 0) {
      return false;
    }
    return this.errorsDue() || this.interacted();
  });
  protected readonly message = computed(() => {
    const first = this.state().errors()[0];
    if (!first) {
      return undefined;
    }
    const d = this.def();
    const label = this.i18n.text(d.title) ?? this.i18n.message('listFallback');
    if (first.message) {
      return this.i18n.text(first.message);
    }
    switch (first.kind) {
      case 'minLength':
        return this.i18n.message('minItems', { label, min: d.min ?? 0 });
      case 'maxLength':
        return this.i18n.message('maxItems', { label, max: d.max ?? 0 });
      default:
        return this.i18n.message('invalid', { label });
    }
  });

  constructor() {
    if (this.context) {
      const self = this;
      const unregister = this.context.register({
        id: this.titleId + '-msg',
        message: computed(() => (this.state().errors().length ? this.message() : undefined)),
        element: this.host.nativeElement,
        get field() {
          return self.tree();
        },
        section: this.section,
        focus: () => {
          const host = this.host.nativeElement;
          host.scrollIntoView?.({ block: 'center' });
          host.querySelector<HTMLElement>(':scope > .ngu-error')?.focus({ preventScroll: true });
        },
      });
      inject(DestroyRef).onDestroy(unregister);
    }
    this.measureVirtual();
    this.followPrinting();
  }

  /** Below the `sm` breakpoint the remove button moves under the row's fields, and tables become cards. */
  protected readonly narrow = computed(() => {
    const width = this.context?.width();
    return width != null && width < (this.context?.breakpoints.sm ?? 0);
  });
  protected readonly table = computed(() => this.def().layout === 'table' && !this.narrow());
  readonly columns = computed<readonly Column[]>(() => {
    if (this.def().layout !== 'table') {
      return [];
    }
    const entries = ordered(this.itemFields()) as [string, LeafDef][];
    const total = entries.reduce((sum, [, def]) => sum + (def.span ?? 1), 0) || 1;
    return entries.map(([key, def]) => ({ key, def, width: Math.round(((def.span ?? 1) / total) * 90) }));
  });

  // --- row ids, summaries and collapsing ----------------------------------------

  private readonly ids = new WeakMap<Field<any>, string>();

  protected rowId(field: Field<any>): string {
    let id = this.ids.get(field);
    if (!id) {
      id = `${this.titleId}-row-${nextRowId++}`;
      this.ids.set(field, id);
    }
    return id;
  }

  protected summaryOf(row: Row): string {
    const text = this.def().summary?.(row.field().value(), row.index);
    return text ? this.i18n.text(text) : this.i18n.message('entry', { index: row.index + 1 });
  }

  /** Expanded rows, by row; rows with problems open when a submit is refused. */
  private readonly expanded = linkedSignal<{ refusals: number; resets: number }, ReadonlySet<Field<any>>>({
    source: () => ({ refusals: this.context?.refusals() ?? 0, resets: this.context?.resets() ?? 0 }),
    computation: (source, previous) => {
      if (!previous || previous.source.resets !== source.resets) {
        return new Set();
      }
      if (previous.source.refusals !== source.refusals) {
        const invalid = untracked(() => this.rows().filter((row) => row().invalid()));
        return invalid.length ? new Set([...previous.value, ...invalid]) : previous.value;
      }
      return previous.value;
    },
  });

  protected isExpanded(field: Field<any>): boolean {
    return this.expanded().has(field);
  }

  protected toggleRow(field: Field<any>): void {
    const next = new Set(this.expanded());
    if (!next.delete(field)) {
      next.add(field);
    }
    this.expanded.set(next);
  }

  protected expand(field: Field<any>): void {
    if (!this.expanded().has(field)) {
      this.expanded.set(new Set([...this.expanded(), field]));
    }
  }

  protected rowShowsErrors(field: Field<any>): boolean {
    return this.errorsDue() && field().invalid();
  }

  // --- virtual scrolling ----------------------------------------------------------

  readonly virtual = computed(() => Boolean(this.def().virtual) && !this.printing());
  private readonly printing = signal(false);
  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(0);
  /** Estimated row height including the gap, measured from the rendered rows. */
  private readonly rowHeight = signal(0);
  /** A row that must be rendered: the first problem after a refused submit, or a new row. */
  private readonly pinned = linkedSignal<number, number>({
    source: () => this.context?.refusals() ?? 0,
    computation: (_, previous) => {
      if (!previous || !untracked(this.virtual)) {
        return -1;
      }
      return untracked(() => this.rows().findIndex((row) => row().invalid()));
    },
  });

  private readonly range = computed<readonly [number, number]>(
    () => {
      const count = this.rows().length;
      if (!this.virtual()) {
        return [0, count];
      }
      const height = this.rowHeight() || (this.def().layout === 'table' ? 56 : 160);
      const view = this.viewportHeight() || 512;
      let start = Math.floor(this.scrollTop() / height) - OVERSCAN;
      let end = Math.ceil((this.scrollTop() + view) / height) + OVERSCAN;
      const pin = this.pinned();
      if (pin >= 0 && (pin < start || pin >= end)) {
        start = pin - OVERSCAN;
        end = pin + Math.ceil(view / height) + OVERSCAN;
      }
      start = Math.max(0, Math.min(start, count));
      end = Math.max(start, Math.min(end, count));
      return [start, end];
    },
    { equal: (a, b) => a[0] === b[0] && a[1] === b[1] },
  );
  readonly visibleRows = computed<readonly Row[]>(() => {
    const [start, end] = this.range();
    return this.rows()
      .slice(start, end)
      .map((field, i) => ({ field, index: start + i }));
  });
  readonly padStart = computed(() => (this.virtual() ? this.range()[0] * this.estimate() : 0));
  readonly padEnd = computed(() =>
    this.virtual() ? (this.rows().length - this.range()[1]) * this.estimate() : 0,
  );
  private readonly estimate = computed(() => this.rowHeight() || (this.def().layout === 'table' ? 56 : 160));

  /** Problem rows scrolled out of view in a virtual list, once errors show. */
  protected readonly offscreenProblems = computed<readonly number[]>(() => {
    if (!this.virtual() || !this.errorsDue()) {
      return [];
    }
    const [start, end] = this.range();
    const out: number[] = [];
    this.rows().forEach((row, i) => {
      if ((i < start || i >= end) && row().invalid()) {
        out.push(i);
      }
    });
    return out;
  });

  protected rowList(rows: readonly number[]): string {
    const shown = rows.slice(0, 5).map((i) => this.i18n.number(i + 1));
    return rows.length > 5 ? shown.join(', ') + ', …' : shown.join(', ');
  }

  protected onScroll(): void {
    if (!this.virtual()) {
      return;
    }
    this.pinned.set(-1);
    this.scrollTop.set(this.viewport().nativeElement.scrollTop);
  }

  protected goToRow(index: number): void {
    this.pinned.set(index);
    this.focusRow(index);
  }

  /** Keeps the viewport size and the row height estimate up to date in virtual lists. */
  private measureVirtual(): void {
    let observer: ResizeObserver | undefined;
    afterRenderEffect({
      read: () => {
        if (!this.virtual()) {
          return;
        }
        this.visibleRows();
        const el = this.viewport().nativeElement;
        if (!observer && typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(([entry]) => this.viewportHeight.set(Math.round(entry.contentRect.height)));
          observer.observe(el);
        }
        const rows = this.ownRows();
        if (rows.length >= 2) {
          const first = rows[0].getBoundingClientRect();
          const last = rows[rows.length - 1].getBoundingClientRect();
          const average = (last.bottom - first.top) / rows.length;
          if (average > 0 && Math.abs(average - untracked(this.rowHeight)) > 2) {
            this.rowHeight.set(average);
          }
        }
      },
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }

  /** A virtual list renders every row while the page prints. */
  private followPrinting(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const before = () => {
      if (this.def().virtual) {
        this.printing.set(true);
        this.cdr.detectChanges();
      }
    };
    const after = () => this.printing.set(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    });
  }

  /** This list's own rendered rows, not those of lists nested inside them. */
  private ownRows(): HTMLElement[] {
    const viewport = this.viewport().nativeElement;
    return Array.from(
      viewport.querySelectorAll<HTMLElement>(
        ':scope > .ngu-array__rows > .ngu-array__row, :scope > ngu-array-table > table > tbody > .ngu-array__row',
      ),
    );
  }

  // --- editing ------------------------------------------------------------------

  protected add(): void {
    if (!this.canAdd()) {
      return;
    }
    this.interacted.set(true);
    const next = this.def().newItem();
    this.state().value.update((items: unknown[]) => [...items, next]);
    const index = this.rows().length - 1;
    this.openNewRow(index);
    // Move focus into the new row so keyboard users can type right away.
    this.focusRow(index);
  }

  protected remove(index: number): void {
    if (!this.enabled() || !this.canRemove()) {
      return;
    }
    this.interacted.set(true);
    this.state().value.update((items: unknown[]) => items.filter((_, i) => i !== index));
    // The focused remove button is gone: move to the row that took its place, the new last
    // row, or the add button when the list is empty.
    const count = this.rows().length;
    this.focusRow(Math.min(index, count - 1));
  }

  protected duplicate(index: number): void {
    if (!this.enabled() || !this.canAdd()) {
      return;
    }
    this.interacted.set(true);
    this.state().value.update((items: unknown[]) => [
      ...items.slice(0, index + 1),
      copyRow(items[index]),
      ...items.slice(index + 1),
    ]);
    this.openNewRow(index + 1);
    this.context?.announce(this.i18n.message('rowDuplicated', { index: index + 2 }));
    this.focusRow(index + 1);
  }

  /** Moves a row one place from its Move up or Move down button; focus stays on the row's buttons. */
  protected moveBy(index: number, step: -1 | 1): void {
    const to = index + step;
    if (!this.moveRow(index, to)) {
      return;
    }
    const last = this.rows().length - 1;
    // At either end the pressed button is disabled; continue from the other one.
    const button = (step < 0 && to > 0) || (step > 0 && to === last) ? '.ngu-array__up' : '.ngu-array__down';
    this.focusRow(to, button);
  }

  private moveRow(from: number, to: number): boolean {
    const count = this.rows().length;
    if (!this.enabled() || from === to || to < 0 || to >= count) {
      return false;
    }
    this.interacted.set(true);
    this.state().value.update((items: unknown[]) => {
      const next = [...items];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    this.context?.announce(this.i18n.message('rowMoved', { index: to + 1, count }));
    return true;
  }

  private openNewRow(index: number): void {
    if (this.virtual()) {
      this.pinned.set(index);
    }
    if (this.def().summary) {
      const row = this.rows()[index];
      if (row) {
        this.expand(row);
      }
    }
  }

  // --- dragging -----------------------------------------------------------------

  readonly drag = signal<Drag | null>(null);

  dropBefore(index: number): boolean {
    const d = this.drag();
    return !!d && d.over === index && d.over !== d.from && d.over !== d.from + 1;
  }

  dropAfter(index: number): boolean {
    const d = this.drag();
    return !!d && d.over === this.rows().length && index === this.rows().length - 1 && d.from !== index;
  }

  /**
   * Drags a row by its handle with a mouse, pen or finger. The Move up and Move down buttons
   * do the same for keyboards and switch devices, so the handle stays out of the tab order.
   */
  protected startDrag(event: PointerEvent, from: number): void {
    if (!this.enabled() || event.button !== 0 || this.rows().length < 2) {
      return;
    }
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture?.(event.pointerId);
    this.drag.set({ from, over: from });

    const viewport = this.viewport().nativeElement;
    const onMove = (e: PointerEvent) => {
      const rows = this.ownRows();
      let over = this.rows().length;
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          over = Number(row.dataset['index']);
          break;
        }
      }
      if (rows.length && over === this.rows().length) {
        over = Number(rows[rows.length - 1].dataset['index']) + 1;
      }
      // Near the edges of a scrolling list, keep scrolling.
      if (this.virtual()) {
        const box = viewport.getBoundingClientRect();
        if (e.clientY < box.top + 32) {
          viewport.scrollTop -= 16;
        } else if (e.clientY > box.bottom - 32) {
          viewport.scrollTop += 16;
        }
      }
      const current = this.drag();
      if (current && current.over !== over) {
        this.drag.set({ from: current.from, over });
      }
    };
    const finish = (commit: boolean) => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      const d = this.drag();
      this.drag.set(null);
      if (commit && d) {
        this.moveRow(d.from, d.over > d.from ? d.over - 1 : d.over);
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
  }

  // --- focus --------------------------------------------------------------------

  /** After the next render, focuses a row's control (or `selector` inside it), else the add button. */
  private focusRow(index: number, selector?: string): void {
    afterNextRender(
      () => {
        const host = this.host.nativeElement;
        const row = index >= 0 ? this.ownRows().find((r) => Number(r.dataset['index']) === index) : undefined;
        // In a row with a summary line, the fields come before the toggle button.
        const body = row?.querySelector<HTMLElement>(':scope > .ngu-array__body:not([hidden])');
        const target =
          (selector ? row?.querySelector<HTMLElement>(`${selector}:not([disabled])`) : undefined) ??
          body?.querySelector<HTMLElement>(FOCUSABLE) ??
          row?.querySelector<HTMLElement>(FOCUSABLE) ??
          host.querySelector<HTMLElement>(':scope > .ngu-array__add');
        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
