import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  type DoCheck,
  DOCUMENT,
  effect,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';
import { NGU_DROPDOWN_CONFIG } from './config';
import { hasPath, resolvePath } from './path';
import { NguDropdownOption, NguDropdownSelection } from './templates';
import type {
  NguAsync,
  NguDropdownFetch,
  NguDropdownLookup,
  NguDropdownOptionContext,
  NguDropdownPage,
  NguDropdownQuery,
  NguDropdownSortDirection,
  NguSubscribable,
} from './types';
import { furthestPages, pageSpan, virtualWindow } from './virtual';

/** Worked out from the bindings: `[fetchFn]` means server mode, otherwise `[options]`. */
export type NguDropdownSource = 'fetch' | 'client';

/** One slot in the rendered window. `loading` is a slot whose page is still in flight. */
interface RenderOption<T> {
  index: number;
  loading: boolean;
  row: T | null;
  label: string;
  selected: boolean;
  disabled: boolean;
  active: boolean;
  id: string;
  context: NguDropdownOptionContext<T> | null;
}

/**
 * Exactly one of `top`/`bottom` is set. Above the field the panel is anchored by its bottom
 * edge, so a short list sits on the field instead of hanging a `maxHeight` above it.
 */
interface PanelBox {
  left: number;
  top: number | null;
  bottom: number | null;
  width: number;
  maxHeight: number;
}

/** Rows drawn above and below the visible window, so a fast scroll shows no gap. */
const OVERSCAN = 4;

/** Pages kept in memory: 600 rows at the default size, however far someone scrolls. */
const MAX_CACHED_PAGES = 12;

/** Gap between field and panel, and the margin the panel keeps from the viewport edge. */
const PANEL_GAP = 4;
const VIEWPORT_MARGIN = 8;

/** Below this the panel would show two rows, so it flips above the field instead. */
const MIN_PANEL_HEIGHT = 160;

/** How long typed characters build one type-ahead search when the search box is hidden. */
const TYPE_AHEAD_MS = 500;

let nextId = 0;

/** Lower case without accents, so "zurich" finds "Zürich". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function isSubscribable<R>(source: NguAsync<R>): source is NguSubscribable<R> {
  return typeof (source as NguSubscribable<R>)?.subscribe === 'function';
}

/** Subscribes to an Observable or waits for a Promise. Returns the cancel function. */
function consume<R>(
  source: NguAsync<R>,
  handlers: { next(value: R): void; error(error: unknown): void; complete(): void },
): () => void {
  let done = false;

  if (isSubscribable(source)) {
    const sub = source.subscribe({
      next: (value) => !done && handlers.next(value),
      error: (error) => {
        if (done) return;
        done = true;
        handlers.error(error);
      },
      complete: () => {
        if (done) return;
        done = true;
        handlers.complete();
      },
    });
    return () => {
      done = true;
      sub.unsubscribe();
    };
  }

  Promise.resolve(source).then(
    (value) => {
      if (done) return;
      handlers.next(value);
      done = true;
      handlers.complete();
    },
    (error) => {
      if (done) return;
      done = true;
      handlers.error(error);
    },
  );
  return () => (done = true);
}

/**
 * A select with a search box and a virtual list that asks the server only for the page under
 * the scroll position.
 *
 * - `[fetchFn]`: server mode. The dropdown owns the query (page, search, sort, filters) and
 *   re-asks the server as the list is searched and scrolled.
 * - `[options]`: client mode. A list already in hand, filtered in the browser and still
 *   virtualized, so a thousand options cost about fifteen DOM nodes.
 *
 * ```html
 * <ngu-dropdown [fetchFn]="loadCustomers" [(value)]="customerId"
 *               optionValue="id" optionLabel="name" />
 * ```
 *
 * The scrollbar is sized to `totalElements` from the first response, so dragging the thumb
 * to the middle of 40,000 rows asks for the one page under it. Rows live in a sparse map
 * keyed by page index; a slot whose page has not landed draws a skeleton of the same height.
 *
 * Works with `[(value)]`, `[(ngModel)]`, `formControlName` and Signal Forms `[formField]`.
 */
@Component({
  selector: 'ngu-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Every class is prefixed, so apps can restyle without ::ng-deep, as with Angular Material.
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.css',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NguDropdown), multi: true },
  ],
  host: {
    class: 'ngu-dropdown',
    '[class.ngu-dropdown--open]': 'open()',
    '[class.ngu-dropdown--sm]': "size() === 'sm'",
    '[class.ngu-dropdown--invalid]': 'errorVisible()',
    '[class.ngu-dropdown--disabled]': 'isDisabled()',
    '[class.ngu-dropdown--readonly]': 'readonly()',
  },
})
export class NguDropdown<T = any> implements ControlValueAccessor, DoCheck {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly config = inject(NGU_DROPDOWN_CONFIG);

  // ── Data ───────────────────────────────────────────────────────────────────
  /**
   * Loads one page. Only whether it is bound is watched, not its identity, so an arrow
   * written in the template does not re-fetch on every change detection. Pass anything the
   * request depends on through `[filters]`, or the list will not know to reload.
   */
  readonly fetchFn = input<NguDropdownFetch<T> | null>(null);

  /** Names keys the loaded rows do not cover, such as an id an edit form loaded. */
  readonly lookupFn = input<NguDropdownLookup<T> | null>(null);

  /** Client mode's rows. Ignored while `fetchFn` is bound. */
  readonly options = input<readonly T[]>([]);

  /**
   * Dot path to each row's key, such as `employee.id`. A row without it is its own key.
   * `undefined` means the default from `provideNguDropdownConfig` (`'value'` unless set).
   */
  readonly optionValue = input(this.config.optionValue, {
    transform: (path: string | undefined) => path ?? this.config.optionValue,
  });

  /**
   * Dot path to each row's label, such as `employee.name`, or a function that builds one from
   * several fields. The label is what search, type-ahead, chips and screen readers use; a
   * `nguDropdownOption` template changes only how rows look. `undefined` means the default from
   * `provideNguDropdownConfig` (`'label'` unless set).
   */
  readonly optionLabel = input<string | ((row: T) => string), string | ((row: T) => string) | undefined>(
    this.config.optionLabel,
    { transform: (label) => label ?? this.config.optionLabel },
  );

  /** Returns `true` for rows that are shown but cannot be picked. By default every row can be. */
  readonly optionDisabled = input<(row: T) => boolean>(() => false);

  /**
   * Rows per request. More than a screenful, so a slow scroll is not always waiting.
   * `undefined` means the default from `provideNguDropdownConfig` (50 unless set).
   */
  readonly pageSize = input(this.config.pageSize, {
    transform: (size: number | undefined) => size ?? this.config.pageSize,
  });

  /** Passed through to `fetchFn`. */
  readonly sortBy = input<string | null>(null);
  /** Sort direction, passed through to `fetchFn` as `order`. A change reloads the list. */
  readonly sortOrder = input<NguDropdownSortDirection | null>(null);

  /**
   * Passed through to `fetchFn`; a change reloads the list. Compared by value, so an object
   * literal in the template does not reload on every change detection.
   */
  readonly filters = input<Record<string, unknown>>({});

  // ── Selection ──────────────────────────────────────────────────────────────
  /** The chosen key, or keys with `multiple`. Bind this or a form directive, not both. */
  readonly value = model<any>(null);

  /**
   * Lets people pick several rows. `value` is then an array of keys, the panel stays open
   * while they pick, and the closed control shows chips. Default `false`.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /** Rows for a value set from outside, so the closed control shows names, not keys. */
  readonly selectedOption = input<T | readonly T[] | null>(null);

  /**
   * Disables the control. `[formField]` sets it from a `disabled` rule, and a reactive form's
   * `control.disable()` disables it too. Default `false`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Shows the value but does not open the list or offer the clear button. `[formField]` sets
   * it from a `readonly` rule. Default `false`.
   */
  readonly readonly = input(false, { transform: booleanAttribute });
  /**
   * Sets `aria-required` on the trigger; it does not validate. `[formField]` sets it from a
   * `required` rule. Default `false`.
   */
  readonly required = input(false, { transform: booleanAttribute });
  /** Shows a button that clears the selection while something is chosen. Default `true`. */
  readonly clearable = input(true, { transform: booleanAttribute });

  /**
   * Bound by Signal Forms. With reactive and template-driven forms, the control's
   * `invalid && touched` state is read instead.
   */
  readonly invalid = input(false);
  /**
   * Bound by Signal Forms. The invalid style shows once `invalid` and `touched` are both
   * `true`. With other forms the control's touched state is read instead.
   */
  readonly touched = input(false);

  /** Overrides when the invalid style shows, for forms with their own error timing. */
  readonly errorShown = input<boolean | undefined>(undefined);

  // ── Chrome ─────────────────────────────────────────────────────────────────
  /** Shown in the closed control while nothing is chosen. Default: the `placeholder` message. */
  readonly placeholder = input<string | undefined>(undefined);

  /** The trigger's id, so `<label for>` names it. */
  readonly inputId = input<string | undefined>(undefined);

  /** The name where the screen has no visible label for the control. */
  readonly ariaLabel = input<string | null>(null);

  /** Ids of hint and error text, for the trigger's `aria-describedby`. */
  readonly describedBy = input<string | undefined>(undefined);

  /** `null` shows a search box in server mode and over long client lists. */
  readonly showSearch = input<boolean | null>(null);
  /** The search box's placeholder and accessible name. Default: the `searchPlaceholder` message. */
  readonly searchPlaceholder = input<string | undefined>(undefined);
  /**
   * How long a search waits after the last keystroke, in ms. Default `300`, or as set with
   * `provideNguDropdownConfig`.
   */
  readonly searchDebounce = input(this.config.searchDebounce);

  /** `sm` gives the closed control less padding and smaller text. Default `md`. */
  readonly size = input<'md' | 'sm'>('md');

  /** Panel width floor in px, for a field narrower than its options. `0` matches the field. */
  readonly panelMinWidth = input(0);

  /** Panel width ceiling in px. `0` lets it grow with the field. */
  readonly panelMaxWidth = input(0);

  /** `scroll` gives long labels a horizontal scrollbar instead of an ellipsis each. */
  readonly optionOverflow = input<'truncate' | 'scroll'>('truncate');

  /** A number, not a CSS length: the virtual scroller does arithmetic with it. */
  readonly optionHeight = input(this.config.optionHeight);
  /**
   * Panel height ceiling in px. Default `320`, or as set with `provideNguDropdownConfig`. Below
   * the field the panel keeps at least 160px, so smaller values act as 160 there.
   */
  readonly panelMaxHeight = input(this.config.panelMaxHeight);

  /** Chips shown before the rest become "+N more". */
  readonly maxChips = input(2);

  /** Heading of the notice shown when the list has no rows. Default: the `emptyTitle` message. */
  readonly emptyTitle = input<string | undefined>(undefined);
  /** Text under `emptyTitle`. Default: the `emptyMessage` message. */
  readonly emptyMessage = input<string | undefined>(undefined);

  /**
   * Shows the panel's footer: the number of options, a loading note while a page loads, and
   * with `multiple` how many are chosen. Default `true`.
   */
  readonly showCount = input(true, { transform: booleanAttribute });

  // ── Outputs ────────────────────────────────────────────────────────────────
  /** The chosen rows, where `value` carries only their keys. */
  readonly selectionChange = output<T | T[] | null>();
  /** The search term once the debounce has passed. */
  readonly searchChange = output<string>();
  /** The query of each `fetchFn` request, as it is made. */
  readonly queryChange = output<NguDropdownQuery>();
  /**
   * A `fetchFn` or `lookupFn` call failed. A failed `fetchFn` also shows a retry notice in the
   * panel; a failed lookup only emits this event.
   */
  readonly loadError = output<unknown>();
  /** The panel opened. */
  readonly opened = output<void>();
  /** The panel closed, whatever closed it. */
  readonly closed = output<void>();

  private readonly optionTemplate = contentChild<NguDropdownOption<T>>(NguDropdownOption);
  private readonly selectionTemplate = contentChild<NguDropdownSelection<T>>(NguDropdownSelection);
  protected readonly optionTemplateRef = computed(() => this.optionTemplate()?.template ?? null);

  private readonly fieldEl = viewChild<ElementRef<HTMLElement>>('field');
  private readonly triggerEl = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('list');
  private readonly searchEl = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  protected readonly listId = `ngu-dropdown-${++nextId}`;
  protected readonly triggerId = computed(() => this.inputId() ?? `${this.listId}-trigger`);

  protected readonly messages = computed(() => this.config.messages());
  protected readonly placeholderText = computed(
    () => this.placeholder() ?? this.messages().placeholder,
  );
  protected readonly searchPlaceholderText = computed(
    () => this.searchPlaceholder() ?? this.messages().searchPlaceholder,
  );
  protected readonly emptyTitleText = computed(
    () => this.emptyTitle() ?? this.messages().emptyTitle,
  );
  protected readonly emptyMessageText = computed(
    () => this.emptyMessage() ?? this.messages().emptyMessage,
  );

  protected readonly open = signal(false);
  protected readonly searchText = signal('');

  /** The listbox's name: `ariaLabel`, else the trigger's `<label>`, read when it opens. */
  protected readonly listLabel = signal('');

  /** The search box, one debounce behind. */
  private readonly term = signal('');

  /** Keyboard cursor. `-1` is nothing highlighted. */
  protected readonly active = signal(-1);

  // ── The buffer ─────────────────────────────────────────────────────────────
  // Sparse on purpose: page index → its rows. An array the size of the result set would
  // allocate 200,000 slots to show fifteen.
  private readonly pages = signal<ReadonlyMap<number, readonly T[]>>(new Map());
  private readonly pending = signal<ReadonlySet<number>>(new Set());
  private readonly total = signal(0);

  /** At least one response has landed for the current query. */
  private readonly loaded = signal(false);
  protected readonly failed = signal(false);

  /** Stale-response guard: a reset bumps it, and older responses are dropped. */
  private generation = 0;
  private readonly inFlight = new Map<number, () => void>();
  private readonly lookups = new Set<() => void>();
  private readonly lookedUp = new Set<unknown>();

  /**
   * Bumped by every reset, and read by the fetching effect. The window alone is not enough:
   * a reset after a request that never answered leaves the row count and scroll position at
   * zero, so the effect would not re-run and the new term would never be asked for.
   */
  private readonly resets = signal(0);

  /**
   * Rows behind the current selection, so a chosen key keeps its name after its page is
   * evicted. Only the selection: keeping every row seen would undo the eviction.
   */
  private readonly seen = new Map<unknown, T>();
  private readonly seenVersion = signal(0);

  private readonly scrollTop = signal(0);
  private readonly viewportHeight = signal(0);
  protected readonly panelBox = signal<PanelBox>({
    left: 0,
    top: 0,
    bottom: null,
    width: 0,
    maxHeight: 0,
  });

  /** Panel placed above the field, so its entrance comes from below. */
  protected readonly above = signal(false);

  /** Set by `setDisabledState`; either it or the input disables. */
  private readonly formDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /** `ng-invalid` and touched on a reactive or template-driven control, read in `ngDoCheck`. */
  private readonly formError = signal(false);
  private ngControl: NgControl | null | undefined;

  protected readonly errorVisible = computed(
    () => this.errorShown() ?? (this.formError() || (this.invalid() && this.touched())),
  );

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  private typeAhead = '';
  private typeAheadTimer: ReturnType<typeof setTimeout> | undefined;

  /** A boolean, so a new closure per change detection does not reach the query. */
  private readonly hasFetch = computed(() => this.fetchFn() !== null);
  private readonly hasLookup = computed(() => this.lookupFn() !== null);

  protected readonly source = computed<NguDropdownSource>(() =>
    this.hasFetch() ? 'fetch' : 'client',
  );

  /** Client labels, folded once per options list rather than once per keystroke. */
  private readonly clientLabels = computed(() =>
    this.source() === 'client' ? this.options().map((row) => fold(this.labelOf(row))) : [],
  );

  /** Client mode only; the server filters its own rows. */
  private readonly clientRows = computed<readonly T[]>(() => {
    if (this.source() !== 'client') return [];

    const term = fold(this.term());
    const rows = this.options();
    if (!term) return rows;

    const labels = this.clientLabels();
    return rows.filter((_, i) => labels[i].includes(term));
  });

  /** How many rows the scrollbar is sized for. */
  protected readonly count = computed(() =>
    this.source() === 'fetch' ? this.total() : this.clientRows().length,
  );

  protected readonly busy = computed(() => this.pending().size > 0);

  /** Keys, so a lookup per rendered row is a `Set.has` rather than a scan. */
  private readonly selectedKeys = computed<ReadonlySet<unknown>>(() => {
    const value = this.value();
    if (value === null || value === undefined) return new Set();

    return new Set(Array.isArray(value) ? value : [value]);
  });

  protected readonly searchVisible = computed(() => {
    const explicit = this.showSearch();
    if (explicit !== null) return explicit;

    return this.source() === 'fetch' || this.options().length > this.config.searchThreshold;
  });

  protected readonly hasValue = computed(() => this.selectedKeys().size > 0);
  protected readonly canClear = computed(
    () => this.clearable() && this.hasValue() && !this.isDisabled() && !this.readonly(),
  );

  /**
   * Client rows by key, unfiltered, so a value a form wrote in is named even while a search
   * term hides its row from the panel.
   */
  private readonly clientIndex = computed<ReadonlyMap<unknown, T>>(() => {
    if (this.source() !== 'client') return new Map();

    const index = new Map<unknown, T>();
    for (const row of this.options()) index.set(this.keyOf(row), row);
    return index;
  });

  /** What the closed control shows: names where the row is known, else the bare key. */
  protected readonly chips = computed(() => {
    this.seenVersion();
    const index = this.clientIndex();
    const pages = this.pages();

    return [...this.selectedKeys()].map((key) => {
      const row = this.seen.get(key) ?? index.get(key) ?? this.findInPages(pages, key);
      return { key, row, label: row !== undefined ? this.labelOf(row) : String(key) };
    });
  });

  /** The trigger's own template and its row, once there is a row to render. */
  protected readonly selectionView = computed(() => {
    const tpl = this.selectionTemplate();
    const row = this.chips()[0]?.row;

    return tpl && row !== undefined
      ? { template: tpl.template, context: { $implicit: row } }
      : null;
  });

  protected readonly visibleChips = computed(() => this.chips().slice(0, this.maxChips()));
  protected readonly overflowChips = computed(() =>
    Math.max(0, this.chips().length - this.maxChips()),
  );

  protected readonly visibleWindow = computed(() =>
    virtualWindow(
      this.scrollTop(),
      // Before the panel is measured, assume its configured height: one screenful too many
      // costs less than a blank list for a frame.
      this.viewportHeight() || this.panelMaxHeight(),
      this.count(),
      this.optionHeight(),
      OVERSCAN,
    ),
  );

  /**
   * Contexts kept per row object. Scrolling changes which rows are drawn, not the rows, so
   * a row that scrolls back into view reuses its context and its view is checked, not rebuilt.
   */
  private readonly contexts = new WeakMap<object, NguDropdownOptionContext<T>>();

  protected readonly rendered = computed<RenderOption<T>[]>(() => {
    const { first, last } = this.visibleWindow();
    if (last < first) return [];

    const selected = this.selectedKeys();
    const active = this.active();
    const disabled = this.optionDisabled();
    const templated = this.optionTemplate() !== undefined;
    const out: RenderOption<T>[] = [];

    for (let index = first; index <= last; index++) {
      const row = this.rowAt(index);
      const id = `${this.listId}-opt-${index}`;

      if (row === undefined) {
        out.push({
          index,
          loading: true,
          row: null,
          label: '',
          selected: false,
          disabled: true,
          active: false,
          id,
          context: null,
        });
        continue;
      }

      const isSelected = selected.has(this.keyOf(row));
      out.push({
        index,
        loading: false,
        row,
        label: this.labelOf(row),
        selected: isSelected,
        disabled: disabled(row),
        active: index === active,
        id,
        context: templated ? this.contextFor(row, index, isSelected) : null,
      });
    }

    return out;
  });

  protected readonly activeId = computed(() => {
    const index = this.active();
    return index < 0 || this.rowAt(index) === undefined ? null : `${this.listId}-opt-${index}`;
  });

  /** A cold list shows skeletons; a list with rows keeps them while the next page loads. */
  protected readonly showSkeleton = computed(
    () => this.source() === 'fetch' && !this.loaded() && !this.failed(),
  );

  protected readonly showEmpty = computed(
    () => !this.failed() && this.count() === 0 && (this.source() === 'client' || this.loaded()),
  );

  protected readonly skeletonRange = computed(() => {
    const rows = Math.ceil((this.viewportHeight() || this.panelMaxHeight()) / this.optionHeight());
    return Array.from({ length: Math.max(3, Math.min(rows, 10)) }, (_, i) => i);
  });

  constructor() {
    // A dropdown that becomes disabled or read-only while open closes, so nothing can be picked.
    effect(() => {
      if (this.isDisabled() || this.readonly()) {
        untracked(() => this.close());
      }
    });

    // Search, debounced. The term stays a plain signal that the client filter and the query
    // both read.
    effect((onCleanup) => {
      const next = this.searchText().trim();
      if (next === untracked(this.term)) return;

      const timer = setTimeout(() => {
        this.term.set(next);
        this.searchChange.emit(next);
      }, this.searchDebounce());

      onCleanup(() => clearTimeout(timer));
    });

    // Anything that changes the server's answer drops the buffer. `filters` is compared as
    // JSON because `[filters]="{ region: region() }"` is a new object on every pass.
    let lastKey = '';
    effect(() => {
      const key = JSON.stringify([
        this.term(),
        this.filters(),
        this.pageSize(),
        this.sortBy(),
        this.sortOrder(),
        this.hasFetch(),
      ]);
      if (key === lastKey) return;

      lastKey = key;
      untracked(() => this.reset());
    });

    // The one place fetching starts. The buffer is read untracked, so a page landing cannot
    // feed back into a new request.
    effect(() => {
      if (!this.open() || this.source() !== 'fetch') return;

      this.resets();
      const view = this.visibleWindow();
      untracked(() => this.ensurePages(view.first, view.last));
    });

    // Opening: place the panel in the top layer, move focus to the search box, measure the
    // list, follow the field as the page scrolls, and close on a click anywhere else.
    effect((onCleanup) => {
      const panel = this.panelEl()?.nativeElement;
      if (!this.open() || !panel) return;

      const win = this.doc.defaultView!;
      untracked(() => {
        this.reposition();
        // Focus after showing: an element in a popover that is not open cannot take focus.
        this.showInTopLayer(panel);
        if (this.searchVisible()) this.searchEl()?.nativeElement.focus();
      });

      const list = this.listEl()?.nativeElement;
      let observer: ResizeObserver | undefined;

      if (list) {
        this.viewportHeight.set(list.clientHeight);
        untracked(() => this.reveal(this.active()));

        // The list grows to full height when the first page lands. jsdom has no
        // ResizeObserver; without it the window assumes `panelMaxHeight`.
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => this.viewportHeight.set(list.clientHeight));
          observer.observe(list);
        }
      }

      // Capture phase: a field inside a scrolling card would otherwise leave its panel behind,
      // and a click whose propagation an ancestor stops still closes the panel.
      const follow = () => this.reposition();
      const outside = (event: Event) => {
        if (!event.composedPath().includes(this.host)) this.leave();
      };
      const escape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        this.leave();
        this.focus();
      };
      win.addEventListener('scroll', follow, true);
      win.addEventListener('resize', follow);
      this.doc.addEventListener('click', outside, true);
      this.doc.addEventListener('keydown', escape);

      onCleanup(() => {
        observer?.disconnect();
        win.removeEventListener('scroll', follow, true);
        win.removeEventListener('resize', follow);
        this.doc.removeEventListener('click', outside, true);
        this.doc.removeEventListener('keydown', escape);
      });
    });

    // Rows handed in from outside, named.
    effect(() => {
      const seed = this.selectedOption();
      if (seed === null || seed === undefined) return;

      untracked(() => {
        const rows = Array.isArray(seed) ? seed : [seed as T];
        for (const row of rows) this.learn(this.keyOf(row), row);
        this.seenVersion.update((v) => v + 1);
      });
    });

    // Keys nothing can name yet go to `lookupFn`, once each.
    effect(() => {
      if (!this.hasLookup()) return;

      const chips = this.chips();
      untracked(() => {
        const missing = chips
          .filter((chip) => chip.row === undefined && !this.lookedUp.has(chip.key))
          .map((chip) => chip.key);
        if (missing.length) this.lookup(missing);
      });
    });

    this.destroyRef.onDestroy(() => {
      this.cancelAll();
      for (const cancel of this.lookups) cancel();
      clearTimeout(this.typeAheadTimer);
    });
  }

  // ── ControlValueAccessor ───────────────────────────────────────────────────
  // `writeValue` only sets. The callbacks fire from `commit`, the one path a choice takes.
  /**
   * Called by Angular forms to write a value in. `null` becomes `[]` with `multiple`, and a
   * configured `rowMemory` is asked for the rows behind the keys.
   */
  writeValue(value: any): void {
    const next = value ?? (this.multiple() ? [] : null);
    this.recall(next);
    this.value.set(next);
  }

  /** Called by Angular forms with the function that reports a value picked or cleared. */
  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  /**
   * Called by Angular forms with the function that marks the control touched, which runs on
   * a pick or clear, when people close the list, and when they tab past the closed field.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Called by Angular forms to disable or enable the control. Disabling closes the panel.
   * Either this or the `disabled` input disables it.
   */
  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
    if (disabled) this.close();
  }

  ngDoCheck(): void {
    const control = this.control();
    this.formError.set(!!control?.invalid && !!control.touched);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  /** Drops the loaded pages and asks again for what is on screen. Call it after a save. */
  reload(): void {
    this.reset();
  }

  /** Moves focus to the control. */
  focus(options?: FocusOptions): void {
    this.triggerEl()?.nativeElement.focus(options);
  }

  // ── Opening and closing ────────────────────────────────────────────────────
  protected toggle(): void {
    if (this.open()) this.leave();
    else this.openPanel(false);
  }

  private openPanel(fromKeyboard: boolean): void {
    if (this.isDisabled() || this.readonly() || this.open()) return;

    // Placed before it exists, so its first paint is already under the field.
    this.reposition();

    const trigger = this.triggerEl()?.nativeElement;
    this.listLabel.set(
      this.ariaLabel() || trigger?.labels?.[0]?.textContent?.trim() || this.placeholderText(),
    );

    // A new list element starts at the top, so the window must too, or it draws rows far
    // below where the list is scrolled and the panel opens blank.
    this.scrollTop.set(0);
    const selected = this.selectedIndex();
    this.active.set(selected >= 0 ? selected : fromKeyboard && this.count() > 0 ? 0 : -1);
    this.open.set(true);
    this.opened.emit();
  }

  protected close(): void {
    if (!this.open()) return;

    this.open.set(false);
    this.active.set(-1);

    // A term left behind would narrow the list next time, with the box that explains it
    // not yet on screen.
    this.searchText.set('');
    if (untracked(this.term)) {
      this.term.set('');
      this.searchChange.emit('');
    }
    this.closed.emit();
  }

  /** A close the user asked for, which is what `touched` means. */
  private leave(): void {
    this.close();
    this.onTouched();
  }

  /** The field tabbed past without opening it, which no close path sees. */
  protected onTriggerBlur(): void {
    if (!this.open()) this.onTouched();
  }

  /** Escape closes this list only, not a dialog or panel around it. */
  private dismiss(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.leave();
    this.focus();
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || this.readonly()) return;

    // Without a search box focus stays here while the list is open.
    if (this.open()) {
      this.onListKeydown(event);
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.openPanel(true);
        break;
    }
  }

  /** Firefox clicks a button on Space's keyup even when keydown was handled. */
  protected onTriggerKeyup(event: KeyboardEvent): void {
    if (event.key === ' ') event.preventDefault();
  }

  protected onListKeydown(event: KeyboardEvent): void {
    const view = this.viewportHeight() || this.panelMaxHeight();
    const page = Math.max(1, Math.floor(view / this.optionHeight()) - 1);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'PageDown':
        event.preventDefault();
        this.goToIndex(Math.max(0, this.active()) + page);
        break;
      case 'PageUp':
        event.preventDefault();
        this.goToIndex(this.active() - page);
        break;
      case 'Home':
        if (this.searchVisible()) return;
        event.preventDefault();
        this.goToIndex(0);
        break;
      case 'End':
        if (this.searchVisible()) return;
        event.preventDefault();
        this.goToIndex(this.count() - 1);
        break;
      case 'Enter':
        event.preventDefault();
        this.pickActive();
        break;
      case ' ':
        if (this.searchVisible()) return;
        event.preventDefault();
        this.pickActive();
        break;
      case 'Escape':
        this.dismiss(event);
        break;
      case 'Tab':
        this.leave();
        break;
      default:
        if (!this.searchVisible() && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          this.findByTyping(event.key);
        }
    }
  }

  private pickActive(): void {
    const row = this.rowAt(this.active());
    if (row !== undefined && !this.optionDisabled()(row)) this.pick(row);
  }

  private moveActive(delta: number): void {
    const count = this.count();
    if (count <= 0) return;

    const current = this.active();
    this.goToIndex(current < 0 ? (delta > 0 ? 0 : count - 1) : current + delta);
  }

  /** Moves the cursor and scrolls it into view, which loads its page in server mode. */
  private goToIndex(index: number): void {
    const count = this.count();
    if (count <= 0) return;

    const target = Math.max(0, Math.min(index, count - 1));
    this.active.set(target);
    this.reveal(target);
  }

  private reveal(index: number): void {
    const list = this.listEl()?.nativeElement;
    if (!list || index < 0) return;

    const height = this.optionHeight();
    const top = index * height;
    const view = list.clientHeight || this.viewportHeight() || this.panelMaxHeight();

    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + height > list.scrollTop + view) list.scrollTop = top + height - view;
    else return;

    this.scrollTop.set(list.scrollTop);
  }

  /** Type-ahead for lists without a search box: jumps to the next label starting with it. */
  private findByTyping(char: string): void {
    clearTimeout(this.typeAheadTimer);
    this.typeAheadTimer = setTimeout(() => (this.typeAhead = ''), TYPE_AHEAD_MS);

    const repeat = this.typeAhead === char;
    this.typeAhead = repeat ? char : this.typeAhead + char;

    const prefix = fold(this.typeAhead);
    const count = this.count();
    const start = Math.max(0, this.active() + (repeat || this.typeAhead.length === 1 ? 1 : 0));

    for (let step = 0; step < count; step++) {
      const index = (start + step) % count;
      const row = this.rowAt(index);
      if (row !== undefined && fold(this.labelOf(row)).startsWith(prefix)) {
        this.goToIndex(index);
        return;
      }
    }
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  protected pick(row: T): void {
    if (this.optionDisabled()(row)) return;

    const key = this.keyOf(row);
    this.learn(key, row);
    this.seenVersion.update((v) => v + 1);

    if (!this.multiple()) {
      this.commit(key);
      this.close();
      // The option is about to leave the DOM; put focus back so Tab carries on from here.
      this.focus();
      return;
    }

    const keys = [...this.selectedKeys()];
    this.commit(keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]);
  }

  protected clear(): void {
    this.commit(this.multiple() ? [] : null);
    this.focus();
  }

  /** The one path a user's choice takes, and so the only one that tells the form. */
  private commit(next: any): void {
    this.value.set(next);
    this.onChange(next);
    this.onTouched();

    const keys: unknown[] = Array.isArray(next) ? next : next === null ? [] : [next];
    const rows = keys.map((key) => this.seen.get(key)).filter((row): row is T => row !== undefined);

    // Read the rows out first, then forget everything no longer chosen.
    for (const key of [...this.seen.keys()]) {
      if (!keys.includes(key)) this.seen.delete(key);
    }

    this.selectionChange.emit(this.multiple() ? rows : (rows[0] ?? null));
  }

  /** Keeps focus in the search box (or on the trigger) when an option is clicked. */
  protected keepFocus(event: MouseEvent): void {
    event.preventDefault();
  }

  // ── Scrolling ──────────────────────────────────────────────────────────────
  protected onScroll(event: Event): void {
    this.scrollTop.set((event.target as HTMLElement).scrollTop);
  }

  // ── Fetching ───────────────────────────────────────────────────────────────
  /** Asks for every page the window touches that is neither held nor in flight. */
  private ensurePages(first: number, last: number): void {
    // Before the first response the total is unknown and the window empty: page 0 it is.
    if (!this.loaded()) {
      this.requestPage(0);
      return;
    }

    const span = pageSpan(first, last, this.pageSize());
    for (let page = span.from; page <= span.to; page++) this.requestPage(page);
  }

  private requestPage(index: number): void {
    if (this.pages().has(index) || this.inFlight.has(index)) return;

    const fetch = this.fetchFn();
    if (!fetch) return;

    const generation = this.generation;
    const query: NguDropdownQuery = {
      page: index,
      size: this.pageSize(),
      search: this.term(),
      sort: this.sortBy(),
      order: this.sortOrder(),
      filters: this.filters(),
    };
    const controller = new AbortController();
    const current = () => generation === this.generation;
    let settled = false;
    let received = false;

    this.pending.update((set) => new Set(set).add(index));
    this.queryChange.emit(query);

    const fail = (error: unknown) => {
      settled = true;
      if (!current()) return;
      this.failed.set(true);
      this.settle(index);
      this.loadError.emit(error);
    };

    let cancel: () => void;
    try {
      cancel = consume(fetch(query, { signal: controller.signal }), {
        next: (page) => {
          if (!current()) return;
          received = true;
          this.applyPage(index, page);
          this.settle(index);
        },
        error: fail,
        complete: () => {
          if (!received) fail(new Error('fetchFn completed without a page'));
          settled = true;
        },
      });
    } catch (error) {
      fail(error);
      return;
    }

    // A synchronous source has already settled; storing it would block the page for good.
    if (!settled) {
      this.inFlight.set(index, () => {
        cancel();
        controller.abort();
      });
    }
  }

  private applyPage(index: number, page: NguDropdownPage<T>): void {
    const rows = page.content ?? [];

    // Only the selected rows: how a form loaded with a bare id gets its name.
    const selected = this.selectedKeys();
    for (const row of rows) {
      const key = this.keyOf(row);
      if (selected.has(key)) this.learn(key, row);
    }

    this.total.set(page.totalElements ?? rows.length);
    this.pages.update((prev) => this.evict(new Map(prev).set(index, rows), index));
    this.loaded.set(true);
    this.failed.set(false);
    this.seenVersion.update((v) => v + 1);
  }

  /** Drops the pages furthest from the one just read, which is the one being looked at. */
  private evict(pages: Map<number, readonly T[]>, around: number): Map<number, readonly T[]> {
    for (const key of furthestPages(pages.keys(), around, MAX_CACHED_PAGES)) pages.delete(key);
    return pages;
  }

  private settle(index: number): void {
    this.inFlight.delete(index);
    this.pending.update((set) => {
      const next = new Set(set);
      next.delete(index);
      return next;
    });
  }

  private reset(): void {
    this.cancelAll();
    this.resets.update((n) => n + 1);
    this.pages.set(new Map());
    this.pending.set(new Set());
    this.total.set(0);
    this.loaded.set(false);
    this.failed.set(false);
    this.active.set(-1);
    this.scrollTop.set(0);

    const list = this.listEl()?.nativeElement;
    if (list) list.scrollTop = 0;
  }

  private cancelAll(): void {
    this.generation++;
    for (const cancel of this.inFlight.values()) cancel();
    this.inFlight.clear();
  }

  protected retry(): void {
    this.reset();
  }

  private lookup(keys: unknown[]): void {
    const fn = this.lookupFn();
    if (!fn) return;

    for (const key of keys) this.lookedUp.add(key);
    const controller = new AbortController();
    let done = false;
    let stop = () => {};
    const finish = () => {
      done = true;
      this.lookups.delete(stop);
    };

    try {
      const cancel = consume(fn(keys, { signal: controller.signal }), {
        next: (rows) => {
          const selected = this.selectedKeys();
          for (const row of rows) {
            const key = this.keyOf(row);
            if (selected.has(key)) this.learn(key, row);
          }
          this.seenVersion.update((v) => v + 1);
        },
        error: (error) => {
          // Forget the attempt, so the next change to the value tries again.
          for (const key of keys) this.lookedUp.delete(key);
          finish();
          this.loadError.emit(error);
        },
        complete: finish,
      });
      stop = () => {
        cancel();
        controller.abort();
      };
      if (!done) this.lookups.add(stop);
    } catch (error) {
      for (const key of keys) this.lookedUp.delete(key);
      this.loadError.emit(error);
    }
  }

  // ── Placement ──────────────────────────────────────────────────────────────
  /**
   * Fixed coordinates from the field's box, with the panel in the top layer through the
   * popover API, so no ancestor's `overflow`, `transform` or `filter` can clip or re-anchor
   * it. Nothing moves in the DOM, so the panel's events still bubble through this host.
   */
  private reposition(): void {
    const field = this.fieldEl()?.nativeElement;
    const win = this.doc.defaultView;
    if (!field || !win) return;

    const rect = field.getBoundingClientRect();
    const below = win.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
    const above = rect.top - PANEL_GAP - VIEWPORT_MARGIN;

    // As wide as the field unless asked for more, never wider than the viewport, and slid
    // back inside it near an edge. Right-to-left pages align the right edges.
    const width = Math.min(
      Math.max(rect.width, this.panelMinWidth()),
      this.panelMaxWidth() || Number.POSITIVE_INFINITY,
      win.innerWidth - VIEWPORT_MARGIN * 2,
    );
    const rtl = win.getComputedStyle(field).direction === 'rtl';
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rtl ? rect.right - width : rect.left, win.innerWidth - VIEWPORT_MARGIN - width),
    );

    // Flip only when below is too short, above is taller, and above is worth having: a
    // panel that changes sides while the page scrolls is worse than a short one.
    const wanted = Math.min(this.panelMaxHeight(), MIN_PANEL_HEIGHT);
    const flip = below < wanted && above > below && above >= wanted;

    // Below, the panel may overrun the viewport by its floor rather than show two rows;
    // above, the room is a hard ceiling.
    const maxHeight = flip
      ? Math.min(this.panelMaxHeight(), above)
      : Math.max(MIN_PANEL_HEIGHT, Math.min(this.panelMaxHeight(), below));

    this.above.set(flip);
    this.panelBox.set({
      left: Math.round(left),
      top: flip ? null : Math.round(rect.bottom + PANEL_GAP),
      bottom: flip ? Math.round(win.innerHeight - rect.top + PANEL_GAP) : null,
      width: Math.round(width),
      maxHeight: Math.round(maxHeight),
    });
  }

  /** Without the popover API the panel still shows where `position: fixed` puts it. */
  private showInTopLayer(panel: HTMLElement): void {
    if (typeof panel.showPopover !== 'function') return;

    try {
      if (!panel.matches(':popover-open')) panel.showPopover();
    } catch {
      // Detached, or a DOM that does not know `:popover-open`.
    }
  }

  // ── Rows ───────────────────────────────────────────────────────────────────
  /** `undefined` for a slot whose page has not landed. A row may itself be `null`. */
  private rowAt(index: number): T | undefined {
    if (index < 0) return undefined;

    if (this.source() === 'client') {
      const rows = this.clientRows();
      return index < rows.length ? rows[index] : undefined;
    }

    const size = this.pageSize();
    const page = this.pages().get(Math.floor(index / size));
    return page && index % size < page.length ? page[index % size] : undefined;
  }

  /** The first selected row's index in client mode, for opening at the selection. */
  private selectedIndex(): number {
    if (this.source() !== 'client' || !this.hasValue()) return -1;

    const selected = this.selectedKeys();
    return this.clientRows().findIndex((row) => selected.has(this.keyOf(row)));
  }

  private findInPages(pages: ReadonlyMap<number, readonly T[]>, key: unknown): T | undefined {
    for (const rows of pages.values()) {
      for (const row of rows) if (this.keyOf(row) === key) return row;
    }
    return undefined;
  }

  // ── Row memory ─────────────────────────────────────────────────────────────
  /** Names a selected key, and tells the configured row memory. */
  private learn(key: unknown, row: T): void {
    this.seen.set(key, row);
    const memory = this.config.rowMemory;
    const control = memory ? this.control() : null;
    if (control) memory!.remember(control, key, row);
  }

  /** Names keys written in from outside, such as a restored draft. */
  private recall(value: unknown): void {
    const memory = this.config.rowMemory;
    const control = memory ? this.control() : null;
    if (!control) return;

    const keys = Array.isArray(value) ? value : value == null ? [] : [value];
    let named = false;
    for (const key of keys) {
      if (this.seen.has(key)) continue;
      const row = memory!.recall(control, key);
      if (row === undefined) continue;
      this.seen.set(key, row as T);
      named = true;
    }
    if (named) this.seenVersion.update((v) => v + 1);
  }

  /** Looked up late: the form directive on the host is created after this component. */
  private control(): NgControl | null {
    if (this.ngControl === undefined) {
      this.ngControl = this.injector.get(NgControl, null, { self: true });
    }
    return this.ngControl;
  }

  private keyOf(row: T): unknown {
    // A row that has the field is keyed by it even when it is null (an "Any" option);
    // a primitive list is its own key.
    const path = this.optionValue();
    return hasPath(row, path) ? resolvePath(row, path) : row;
  }

  private labelOf(row: T): string {
    const source = this.optionLabel();
    const label = typeof source === 'function' ? source(row) : resolvePath(row, source);
    return label === null || label === undefined ? String(row ?? '') : String(label);
  }

  private contextFor(row: T, index: number, selected: boolean): NguDropdownOptionContext<T> {
    const cacheable = typeof row === 'object' && row !== null;
    const hit = cacheable ? this.contexts.get(row as object) : undefined;

    // Mutated rather than replaced: the embedded view is checked against the same object.
    if (hit) {
      hit.index = index;
      hit.selected = selected;
      return hit;
    }

    const context: NguDropdownOptionContext<T> = { $implicit: row, index, selected };
    if (cacheable) this.contexts.set(row as object, context);
    return context;
  }
}
