import { DOCUMENT, NgTemplateOutlet, isPlatformServer } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DEFAULT_CURRENCY_CODE,
  DestroyRef,
  ElementRef,
  InjectionToken,
  LOCALE_ID,
  PLATFORM_ID,
  PendingTasks,
  ViewEncapsulation,
  afterRenderEffect,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  type OnInit,
  type ProviderToken,
} from '@angular/core';
import { consume } from './async';
import { buildCells, cellText, isNumeric, type CellFormat, type RenderCell } from './cells';
import { NGU_TABLE_CONFIG, type NguTableSearchMemory } from './config';
import { NguTableIcon, type NguTableIconName } from './icon';
import { resolvePath } from './path';
import { NguTableCell, NguTableEmpty, NguTableRowActions } from './templates';
import {
  EMPTY_WINDOW,
  furthestPages,
  pageSpan,
  sameWindow,
  virtualWindow,
  type VirtualWindow,
} from './virtual';
import type {
  NguTableColumn,
  NguTableFetch,
  NguTableLinkEvent,
  NguTablePage,
  NguTableQuery,
  NguTableRowContext,
  NguTableSort,
  NguTableSortDirection,
} from './types';

/**
 * Where the rows come from, worked out from the bindings rather than set: a mode that
 * disagreed with the bindings would render nothing.
 */
export type NguTableSource = 'fetch' | 'client' | 'server';

/** A drawn row. `index` is its place in the whole result set, for stripes and screen readers. */
interface RenderRow<T> {
  placeholder: false;
  key: unknown;
  index: number;
  row: T;
  cells: RenderCell<T>[];
  actions: NguTableRowContext<T>;
  canEdit: boolean;
  canDelete: boolean;
}

/** A virtual row whose page has not arrived: a skeleton of the same height. */
interface PlaceholderRow {
  placeholder: true;
  key: string;
  index: number;
}

type ViewRow<T> = RenderRow<T> | PlaceholderRow;

/** Page numbers offered either side of the current one. */
const PAGE_WINDOW = 2;

/** Kept in step with `.ngu-tbl-filter`'s width, which the placement has to know. */
const FILTER_WIDTH = 320;

/** Breathing room between the panel and both the trigger and the viewport. */
const FILTER_GAP = 8;

/** Below this much room underneath the trigger, the panel opens upwards. */
const FILTER_MIN_BELOW = 260;

/** Virtual rows drawn beyond each edge of the scroller, so a fast scroll shows no gap. */
const OVERSCAN = 6;

/** The scroller's height before it is measured (and on the server), in px. */
const FALLBACK_VIEWPORT = 600;

/** Row heights assumed until a drawn row is measured, in px. */
const ROW_HEIGHT = 42;
const COMPACT_ROW_HEIGHT = 34;

/** A virtual table's scroller height when `maxHeight` is not set. */
const VIRTUAL_HEIGHT = '32rem';

/** Pages a virtual table keeps at least, however small they are. */
const MIN_PAGES = 12;

/** Rows sampled across a virtual list for the widest value of each column. */
const SIZER_SAMPLE = 200;

let nextId = 0;

/** What a row click ignores: controls inside the row, and the actions column. */
const INTERACTIVE =
  'a[href], button, input, select, textarea, label, summary, [role="button"], [role="link"], [tabindex]:not(tr), .ngu-tbl-col-actions';

/** A filter the user actually set: a blank control is not a filter. */
function isSet(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;

  return true;
}

/** Where the filter panel is put, measured from its trigger. */
export interface FilterPos {
  left: number;
  top: number | null;
  bottom: number | null;
  maxHeight: number;
}

/**
 * Where to put the filter panel: right-aligned under its trigger, kept inside the viewport,
 * flipped above when there isn't room below. Anchoring the flipped case by `bottom` means the
 * panel's own height never has to be known before it is rendered.
 */
export function placeFilterPanel(
  rect: { top: number; bottom: number; right: number },
  viewWidth: number,
  viewHeight: number,
): FilterPos {
  const left = Math.max(
    FILTER_GAP,
    Math.min(rect.right - FILTER_WIDTH, viewWidth - FILTER_WIDTH - FILTER_GAP),
  );
  const below = viewHeight - rect.bottom;

  return below < FILTER_MIN_BELOW && rect.top > below
    ? {
        left,
        top: null,
        bottom: viewHeight - rect.top + FILTER_GAP,
        maxHeight: rect.top - FILTER_GAP * 2,
      }
    : {
        left,
        top: rect.bottom + FILTER_GAP,
        bottom: null,
        maxHeight: below - FILTER_GAP * 2,
      };
}

/** Injects a memory given as a class or token; an object is used as it is. */
function resolveMemory(
  memory: NguTableSearchMemory | ProviderToken<NguTableSearchMemory> | null,
): NguTableSearchMemory | null {
  if (!memory) return null;
  if (typeof memory === 'function' || memory instanceof InjectionToken) return inject(memory);
  return memory as NguTableSearchMemory;
}

/** Without the popover API the panel still shows where `position: fixed` puts it. */
function showInTopLayer(panel: HTMLElement): void {
  if (typeof panel.showPopover !== 'function') return;

  try {
    if (!panel.matches(':popover-open')) panel.showPopover();
  } catch {
    // Detached, or a DOM that does not know `:popover-open`.
  }
}

/**
 * A data table for list screens: a toolbar, sortable typed columns, row actions and paging.
 *
 * Three ways to give it rows, worked out from the bindings:
 * - `[fetchFn]`: the table owns the query (page, size, search, sort, filters) and asks the
 *   server again whenever it changes.
 * - `[rows]` with `mode="client"`: it searches, sorts and pages in the browser.
 * - `[rows]` alone: your component owns everything and listens to the outputs.
 *
 * ```html
 * <ngu-table [fetchFn]="loadOrders" [columns]="columns" showEdit (editRow)="edit($event)" />
 * ```
 */
@Component({
  selector: 'ngu-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Every class is prefixed, so apps can restyle without ::ng-deep, as with Angular Material.
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, NguTableIcon],
  templateUrl: './table.html',
  styleUrl: './table.css',
  host: {
    class: 'ngu-table',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape($event)',
  },
})
export class NguTable<T = any> implements OnInit {
  private readonly config = inject(NGU_TABLE_CONFIG);
  private readonly locale = inject(LOCALE_ID);
  private readonly defaultCurrency = inject(DEFAULT_CURRENCY_CODE);
  private readonly doc = inject(DOCUMENT);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  private readonly pendingTasks = inject(PendingTasks);
  private readonly memory = resolveMemory(this.config.searchMemory);
  private searchKey = '';

  /** Prefix of the ids that tie labels to their controls. */
  protected readonly id = `ngu-tbl-${nextId++}`;

  // ── Data ───────────────────────────────────────────────────────────────────
  /** The columns, in order. Hidden ones are left out of the table and the export. */
  readonly columns = input.required<readonly NguTableColumn<T>[]>();

  /** The rows, for client and server mode. Ignored while `fetchFn` is bound. */
  readonly rows = input<readonly T[]>([]);

  /**
   * Loads one page. Only whether it is bound is watched, not which function it is, so keep
   * it a class field. Pass anything the request depends on through `[filters]`.
   */
  readonly fetchFn = input<NguTableFetch<T> | null>(null);

  /** With `[rows]`: `'client'` searches, sorts and pages them here; `'server'` leaves it to you. */
  readonly mode = input<'server' | 'client'>('server');

  /** Shows the loading state. Read only in server mode; fetch mode knows when it is loading. */
  readonly loading = input(false, { transform: booleanAttribute });

  /** Your filter model. Copied into the query when the filter panel's Apply is pressed. */
  readonly filters = input<Record<string, unknown>>({});

  /** Dot path to each row's identity. Default: the config's, else `'id'`. */
  readonly rowKey = input<string | undefined>(undefined);

  /** Placeholder rows shown while the first page loads. */
  readonly skeletonRows = input(5);

  /** Shown for `null`, `undefined` and `''`. Default: the config's, else `—`. */
  readonly emptyText = input<string | undefined>(undefined);

  /** The key the configured search memory keeps this table's search under. Default: the page's path. */
  readonly stateKey = input<string | undefined>(undefined);

  /** Accessible name of the `<table>`. */
  readonly ariaLabel = input<string | undefined>(undefined);

  // ── Look ───────────────────────────────────────────────────────────────────
  /** Draws the table as a card. Turn off when it already sits inside one. */
  readonly surface = input(true, { transform: booleanAttribute });
  /** Denser rows. */
  readonly compact = input(false, { transform: booleanAttribute });
  /** Tints every other row. */
  readonly striped = input(false, { transform: booleanAttribute });
  /** A CSS length. The rows scroll inside it, under a sticky heading. */
  readonly maxHeight = input<string | null>(null);
  /** Heading of the empty notice. Default: the `emptyTitle` message. */
  readonly emptyTitle = input<string | undefined>(undefined);
  /** Text of the empty notice. Default: the `emptyMessage` message. */
  readonly emptyMessage = input<string | undefined>(undefined);

  // ── Toolbar ────────────────────────────────────────────────────────────────
  /** Shows the search box. */
  readonly showSearch = input(true, { transform: booleanAttribute });
  /** Placeholder and accessible name of the search box. Default: the message. */
  readonly searchPlaceholder = input<string | undefined>(undefined);
  /** Typing pause before searching, in ms. Default: the config's, else 400. */
  readonly searchDebounce = input<number | undefined>(undefined);
  /** Shorter terms do not search. Default: the config's, else 1. */
  readonly searchMinLength = input<number | undefined>(undefined);
  /** Offers a Clear button once a search, sort or filter is applied. */
  readonly showClear = input(true, { transform: booleanAttribute });
  /** Shows the Filter button, which opens the `[nguTableFilters]` content. */
  readonly showFilter = input(false, { transform: booleanAttribute });
  /**
   * Whether the Filter button shows filters as applied. Unbound, it does whenever an applied
   * filter has a value; bind it when some applied filters (a tab, say) should not count, or
   * when your component applies filters itself.
   */
  readonly filterActive = input<boolean | undefined, unknown>(undefined, {
    transform: (value: unknown) => (value === undefined ? undefined : booleanAttribute(value)),
  });
  /** Shows the Import button. */
  readonly showImport = input(false, { transform: booleanAttribute });
  /** File types the Import button's picker accepts. */
  readonly importAccept = input('.csv,.xls,.xlsx');
  /** Import emits `(importClick)` instead of opening a file picker, for your own import dialog. */
  readonly importOpensDialog = input(false, { transform: booleanAttribute });
  /** Shows the Export button, which downloads the rows in hand as CSV. */
  readonly showExport = input(false, { transform: booleanAttribute });
  /** Name of the CSV file, without `.csv`. */
  readonly exportFileName = input('export');
  /** Shows the Add button, which emits `(addClick)`. */
  readonly showAdd = input(false, { transform: booleanAttribute });
  /** Text of the Add button. Default: the `add` message. */
  readonly addLabel = input<string | undefined>(undefined);
  /** Disables the Add button. */
  readonly addDisabled = input(false, { transform: booleanAttribute });

  // ── Row actions ────────────────────────────────────────────────────────────
  /** Shows a View button in each row, which emits `(viewRow)`. */
  readonly showView = input(false, { transform: booleanAttribute });
  /** Shows an Edit button in each row `canEdit` allows, which emits `(editRow)`. */
  readonly showEdit = input(false, { transform: booleanAttribute });
  /** Shows a Delete button in each row `canDelete` allows, which emits `(deleteRow)`. */
  readonly showDelete = input(false, { transform: booleanAttribute });
  /** Which rows get an Edit button. */
  readonly canEdit = input<(row: T) => boolean>(() => true);
  /** Which rows get a Delete button. */
  readonly canDelete = input<(row: T) => boolean>(() => true);
  /** Asks before `(deleteRow)` fires. */
  readonly confirmDelete = input(true, { transform: booleanAttribute });
  /** Text of the delete dialog. Default: the `deleteMessage` message. */
  readonly deleteMessage = input<string | undefined>(undefined);
  /** Makes rows clickable (and focusable, with Enter), emitting `(rowClick)`. */
  readonly rowClickable = input(false, { transform: booleanAttribute });

  // ── Paging and sorting ─────────────────────────────────────────────────────
  /**
   * `'pages'` shows a pager; `'none'` shows every row; `'virtual'` draws only the rows in view
   * inside a scroller (`maxHeight`, default `32rem`), and in fetch mode asks the server only for
   * the pages under the scroll position.
   */
  readonly pagination = input<'none' | 'pages' | 'virtual'>('pages');
  /**
   * Height of each virtual row in px. Default: measured from the first rows drawn. Set it when
   * some rows are taller than the first ones, such as a cell template with two lines.
   */
  readonly rowHeight = input<number | undefined>(undefined);
  /** Zero-based page index, two-way. */
  readonly page = model(0);
  /** Rows per page, two-way. Default: the config's, else 10. */
  readonly pageSize = model(this.config.pageSize);
  /** Shows the rows-per-page picker. */
  readonly showPageSize = input(true, { transform: booleanAttribute });
  /** The rows-per-page choices. Default: the config's, else `[10, 25, 50, 100]`. */
  readonly pageSizeOptions = input<readonly number[] | undefined>(undefined);
  /** The size of the whole result set, in server mode. Client mode counts; fetch mode is told. */
  readonly totalRows = input(0);
  /** The column sorted by, two-way. */
  readonly sort = model<NguTableSort | null>(null);
  /** The search box's text, two-way, so a screen can seed it from its own URL. */
  readonly searchText = model('');

  // ── Outputs ────────────────────────────────────────────────────────────────
  /** The search term once it has settled, which is the one worth acting on. */
  readonly searchChange = output<string>();
  /** Every change of page, size, search, sort or applied filters. Fetch mode only. */
  readonly queryChange = output<NguTableQuery>();
  /** The toolbar's Clear button reset search, sort and filters. */
  readonly cleared = output<void>();
  /** The filter panel's Apply was pressed, with the filters applied. */
  readonly filtersApplied = output<Record<string, unknown>>();
  /** The filter panel's Clear was pressed. Reset your filter controls here. */
  readonly filtersCleared = output<void>();
  /** A file was picked with the Import button. */
  readonly fileSelected = output<File>();
  /** Import was pressed on a table with `importOpensDialog`. */
  readonly importClick = output<void>();
  /** The rows just exported to CSV. */
  readonly exported = output<T[]>();
  /** The Add button was pressed. */
  readonly addClick = output<void>();
  /** A row was clicked, with `rowClickable`. */
  readonly rowClick = output<T>();
  /** A `link` cell was pressed. */
  readonly linkClick = output<NguTableLinkEvent<T>>();
  /** A row's View button was pressed. */
  readonly viewRow = output<T>();
  /** A row's Edit button was pressed. */
  readonly editRow = output<T>();
  /** A row's deletion was confirmed (or asked for, without `confirmDelete`). */
  readonly deleteRow = output<T>();
  /** `fetchFn` failed. The table shows a notice with a Try again button. */
  readonly loadError = output<unknown>();

  private readonly cellTemplates = contentChildren<NguTableCell<T>>(NguTableCell);
  protected readonly rowActions = contentChild<NguTableRowActions<T>>(NguTableRowActions);
  protected readonly emptyTemplate = contentChild(NguTableEmpty);

  private readonly filterTrigger = viewChild<ElementRef<HTMLElement>>('filterTrigger');
  private readonly filterPanel = viewChild<ElementRef<HTMLElement>>('filterPanel');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly scrollBox = viewChild<ElementRef<HTMLElement>>('scrollBox');
  private readonly tableEl = viewChild<ElementRef<HTMLTableElement>>('table');
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  /** Non-null while the filter panel is open: it is also where it sits. */
  protected readonly filterPos = signal<FilterPos | null>(null);
  protected readonly filterOpen = computed(() => this.filterPos() !== null);

  /** The row the delete dialog asks about. Boxed, so a falsy row still opens it. */
  protected readonly pendingDelete = signal<{ row: T } | null>(null);

  /** The Delete button that opened the dialog, which gets focus back when it closes. */
  private returnFocus: HTMLElement | null = null;

  /** The search box, one debounce behind. */
  private readonly term = signal('');

  /** The filter model as of the last Apply, not the last keystroke. */
  private readonly appliedFilters = signal<Record<string, unknown>>({});

  // ── Text ───────────────────────────────────────────────────────────────────
  protected readonly messages = computed(() => this.config.messages());
  protected readonly searchLabel = computed(
    () => this.searchPlaceholder() ?? this.messages().searchPlaceholder,
  );
  protected readonly emptyHeading = computed(() => this.emptyTitle() ?? this.messages().emptyTitle);
  protected readonly emptyBody = computed(
    () => this.emptyMessage() ?? this.messages().emptyMessage,
  );
  protected readonly addText = computed(() => this.addLabel() ?? this.messages().add);
  protected readonly deleteText = computed(
    () => this.deleteMessage() ?? this.messages().deleteMessage,
  );

  private readonly debounce = computed(() => this.searchDebounce() ?? this.config.searchDebounce);
  private readonly minLength = computed(
    () => this.searchMinLength() ?? this.config.searchMinLength,
  );
  private readonly key = computed(() => this.rowKey() ?? this.config.rowKey);

  // ── Source ─────────────────────────────────────────────────────────────────
  /**
   * A boolean, not the function. A fetcher written inline in a template is a new closure on
   * every check; funnelling it through a boolean stops that churn reaching `query` and
   * fetching the same page forever.
   */
  private readonly hasFetch = computed(() => this.fetchFn() !== null);

  /** Where the rows come from. */
  protected readonly source = computed<NguTableSource>(() =>
    this.hasFetch() ? 'fetch' : this.mode() === 'client' ? 'client' : 'server',
  );

  protected readonly virtual = computed(() => this.pagination() === 'virtual');
  private readonly virtualFetch = computed(() => this.virtual() && this.hasFetch());

  /** `undefined` leaves the loader idle. */
  private readonly query = computed<NguTableQuery | undefined>(() => {
    if (!this.hasFetch() || this.virtual()) return undefined;

    const order = this.sort();
    return {
      page: this.page(),
      size: this.pageSize(),
      search: this.term(),
      sort: order?.field ?? null,
      order: order?.direction ?? null,
      filters: this.appliedFilters(),
    };
  });

  /** The last page `fetchFn` sent. Kept while the next one loads, so the rows stay put. */
  private readonly response = signal<NguTablePage<T> | undefined>(undefined);
  private readonly fetching = signal(false);
  private readonly failure = signal<{ error: unknown } | null>(null);
  private readonly reloads = signal(0);

  protected readonly failed = computed(() => this.hasFetch() && this.failure() !== null);

  // ── Virtual fetch: a sparse buffer of pages around the scroll position ─────
  /** Loaded pages by index. Pages far from the scroll position are dropped. */
  private readonly vPages = signal<ReadonlyMap<number, readonly T[]>>(new Map());
  private readonly vPending = signal<ReadonlySet<number>>(new Set());
  /** The server's total, unknown until the first page arrives. */
  private readonly vTotal = signal<number | undefined>(undefined);
  /** Stale-response guard: a reset bumps it, and older answers are dropped. */
  private vGeneration = 0;
  private readonly vInFlight = new Map<number, () => void>();
  /** What the buffer was loaded for; a change starts it over. */
  private vLoadedFor: { base: unknown; reload: number } | null = null;

  /** The query without its page: a change empties the buffer. Undefined unless virtual fetch. */
  private readonly vBase = computed(() =>
    this.virtualFetch()
      ? {
          size: this.pageSize(),
          search: this.term(),
          sort: this.sort(),
          filters: this.appliedFilters(),
        }
      : undefined,
  );

  private readonly sourceRows = computed<readonly T[]>(() => {
    if (!this.hasFetch()) return this.rows();
    if (!this.virtual()) return this.response()?.content ?? [];
    // The rows loaded so far, in order: what a virtual fetch table can export.
    return [...this.vPages()].sort(([a], [b]) => a - b).flatMap(([, rows]) => rows);
  });

  protected readonly busy = computed(() => {
    if (this.virtualFetch()) return this.vPending().size > 0;
    return this.hasFetch() ? this.fetching() : this.loading();
  });

  // ── Virtual scrolling ──────────────────────────────────────────────────────
  private readonly scrollTop = signal(0);
  private readonly viewport = signal(0);
  /** The tallest of the first rows drawn; 0 until measured. */
  private readonly measuredHeight = signal(0);

  /**
   * The widest cell seen in each column, drawn in a hidden row of no height. The browser sizes
   * the columns for it, so rows scrolling in don't make the columns jump: they only ever grow.
   */
  protected readonly sizer = signal<readonly RenderCell<T>[] | null>(null);
  private sizerFor: readonly unknown[] = [];

  /** Buttons in the actions column, which the sizer keeps room for. */
  protected readonly actionSlots = computed(
    () => +this.showView() + +this.showEdit() + +this.showDelete(),
  );

  /** The virtual row height in px. */
  protected readonly rowHeightPx = computed(
    () =>
      this.rowHeight() ||
      this.measuredHeight() ||
      (this.compact() ? COMPACT_ROW_HEIGHT : ROW_HEIGHT),
  );

  /** The explicit height of each virtual row, once it is known. */
  protected readonly rowStyleHeight = computed(() =>
    this.virtual() && (this.rowHeight() || this.measuredHeight()) ? this.rowHeightPx() : null,
  );

  /** The scroller's height: `maxHeight`, or a default when virtual rows need a scroller. */
  protected readonly scrollHeight = computed(
    () => this.maxHeight() ?? (this.virtual() ? VIRTUAL_HEIGHT : null),
  );

  /** Rows in the whole virtual list. */
  private readonly count = computed(() =>
    this.virtualFetch() ? (this.vTotal() ?? 0) : this.processed().length,
  );

  /** Evenly spread rows of the whole list (rows in hand) or of the pages loaded (fetch). */
  private readonly sizerSample = computed<readonly T[]>(() => {
    if (!this.virtual()) return [];
    const rows = this.virtualFetch() ? this.sourceRows() : this.processed();
    const step = Math.max(1, Math.floor(rows.length / SIZER_SAMPLE));
    const sample: T[] = [];
    for (let i = 0; i < rows.length; i += step) sample.push(rows[i]);
    return sample;
  });

  protected readonly window = computed<VirtualWindow>(
    () =>
      this.virtual()
        ? virtualWindow(
            this.scrollTop(),
            this.viewport() || FALLBACK_VIEWPORT,
            this.count(),
            this.rowHeightPx(),
            OVERSCAN,
          )
        : EMPTY_WINDOW,
    { equal: sameWindow },
  );

  protected readonly visibleColumns = computed(() =>
    this.columns().filter((column) => !column.hidden),
  );

  /** Resolved here so the `<th>`s cost nothing on a check that changed nothing. */
  protected readonly headerCells = computed(() =>
    this.visibleColumns().map((column) => {
      const sortable = column.sortable !== false;
      const direction = this.sortedBy(column);

      return {
        column,
        sortable,
        numeric: isNumeric(column),
        direction,
        icon: (direction ?? 'unsorted') as NguTableIconName,
        aria: sortable
          ? direction === 'asc'
            ? 'ascending'
            : direction === 'desc'
              ? 'descending'
              : 'none'
          : null,
      };
    }),
  );

  protected readonly showActions = computed(
    () =>
      this.showView() || this.showEdit() || this.showDelete() || this.rowActions() !== undefined,
  );

  protected readonly columnCount = computed(
    () => this.visibleColumns().length + (this.showActions() ? 1 : 0),
  );

  private readonly anyApplied = computed(() => Object.values(this.appliedFilters()).some(isSet));

  /**
   * Whether there is anything to clear. `filterActive` covers a screen that runs its own
   * filter controls instead of the panel.
   */
  protected readonly dirty = computed(
    () =>
      this.searchText().trim() !== '' ||
      this.sort() !== null ||
      !!this.filterActive() ||
      this.anyApplied(),
  );

  /** Only worth offering once something is applied. */
  protected readonly clearVisible = computed(() => this.showClear() && this.dirty());

  /** The Filter button looks pressed while filters apply: `filterActive` when bound. */
  protected readonly filtering = computed(() => this.filterActive() ?? this.anyApplied());

  protected readonly showToolbar = computed(
    () =>
      this.showSearch() ||
      this.clearVisible() ||
      this.showFilter() ||
      this.showImport() ||
      this.showExport() ||
      this.showAdd(),
  );

  /**
   * Client mode only. The other two came back searched and sorted, and doing it again would
   * re-sort one page of an already sorted set.
   */
  private readonly processed = computed<readonly T[]>(() => {
    if (this.source() !== 'client') return this.sourceRows();

    // `term`, not the box, so the debounce and the minimum length apply here as well.
    const term = this.term().toLowerCase();
    const columns = this.visibleColumns();

    const matched = term
      ? this.sourceRows().filter((row) =>
          columns.some((column) =>
            String(resolvePath(row, column.field) ?? '')
              .toLowerCase()
              .includes(term),
          ),
        )
      : this.sourceRows();

    const order = this.sort();
    if (!order) return matched;

    const direction = order.direction === 'asc' ? 1 : -1;
    return [...matched].sort(
      (a, b) => this.compare(resolvePath(a, order.field), resolvePath(b, order.field)) * direction,
    );
  });

  protected readonly total = computed(() => {
    switch (this.source()) {
      case 'fetch':
        return this.virtual() ? (this.vTotal() ?? 0) : (this.response()?.totalElements ?? 0);
      case 'client':
        return this.processed().length;
      default:
        return this.virtual() ? this.rows().length : this.totalRows();
    }
  });

  /** Only the client cuts pages out of its own list. */
  private readonly pageRows = computed<readonly T[]>(() => {
    if (this.source() !== 'client' || this.pagination() !== 'pages') return this.processed();

    const start = this.page() * this.pageSize();
    return this.processed().slice(start, start + this.pageSize());
  });

  /** What formatting needs, resolved once. A change drops every row's cells. */
  private readonly format = computed<CellFormat>(() => {
    const messages = this.messages();
    return {
      empty: this.emptyText() ?? this.config.emptyText,
      locale: this.locale,
      currencyCode: this.config.currencyCode ?? this.defaultCurrency,
      currencyLocale: this.config.currencyLocale,
      dateFormat: this.config.dateFormat,
      datetimeFormat: this.config.datetimeFormat,
      badgeTones: this.config.badgeTones,
      yes: messages.yes,
      no: messages.no,
    };
  });

  /**
   * Formatted cells, kept per row object. Sorting and paging re-order rows; they don't change
   * them, so neither runs `Intl` again or replaces a template context.
   */
  private cellCache = new WeakMap<object, RenderCell<T>[]>();
  private cacheKey: readonly unknown[] = [];

  protected readonly viewRows = computed<ViewRow<T>[]>(() => {
    const columns = this.visibleColumns();
    const templates = this.cellTemplates();
    const format = this.format();
    const key = this.key();
    // Folded together here so the template's `@if` is one property read.
    const canEdit = this.showEdit() ? this.canEdit() : () => false;
    const canDelete = this.showDelete() ? this.canDelete() : () => false;

    // Anything that changes what a cell says drops the memo.
    const cacheKey = [columns, templates, format];
    if (cacheKey.some((part, i) => part !== this.cacheKey[i])) {
      this.cellCache = new WeakMap();
      this.cacheKey = cacheKey;
    }

    const render = (row: T, index: number): RenderRow<T> => ({
      placeholder: false,
      key: resolvePath(row, key) ?? index,
      index,
      row,
      canEdit: canEdit(row),
      canDelete: canDelete(row),
      actions: { $implicit: row },
      cells: this.cellsFor(row, columns, templates, format),
    });

    if (!this.virtual()) return this.pageRows().map(render);

    // Only the rows in view; a row whose page has not arrived is a placeholder.
    const { first, last } = this.window();
    const out: ViewRow<T>[] = [];
    for (let index = first; index <= last; index++) {
      const row = this.rowAt(index);
      out.push(
        row === undefined
          ? { placeholder: true, key: `\u0000slot:${index}`, index }
          : render(row, index),
      );
    }
    return out;
  });

  protected readonly skeletonRange = computed(() =>
    Array.from({ length: this.skeletonRows() }, (_, i) => i),
  );

  /** A page turn dims the rows it has; only a cold start shows skeletons. */
  protected readonly showSkeleton = computed(() => this.busy() && !this.viewRows().length);
  /** Virtual rows don't dim: rows still loading are placeholders of their own. */
  protected readonly refreshing = computed(
    () => this.busy() && this.viewRows().length > 0 && !this.virtual(),
  );
  protected readonly showEmpty = computed(() => !this.busy() && !this.viewRows().length);

  protected readonly pageCount = computed(() => {
    const size = Math.max(1, this.pageSize());
    if (this.source() === 'fetch') {
      const response = this.response();
      return Math.max(1, response?.totalPages ?? Math.ceil((response?.totalElements ?? 0) / size));
    }
    return Math.max(1, Math.ceil(this.total() / size));
  });

  /**
   * The whole footer, resolved here: one memo, recomputed only when the page or the total
   * moves, instead of an expression per button on every check.
   */
  protected readonly pager = computed(() => {
    const count = this.pageCount();
    const current = this.page();
    const total = this.total();
    const size = this.pageSize();
    const messages = this.messages();

    // A window, not 300 buttons: the first and last arrows cover the ends.
    const from = Math.max(0, Math.min(current - PAGE_WINDOW, count - PAGE_WINDOW * 2 - 1));
    const to = Math.min(count - 1, Math.max(current + PAGE_WINDOW, PAGE_WINDOW * 2));
    const first = total ? current * size + 1 : 0;
    const last = Math.min(total, current * size + this.pageRows().length);

    const virtual = this.virtual();

    return {
      // Shown with one page or none as well: controls that hold their place stop the foot of
      // the table jumping as rows come and go.
      show: this.pagination() !== 'none',
      // A virtual list has no pages, only its size.
      paged: !virtual,
      range: !total
        ? messages.noRecords
        : virtual
          ? messages.count(total)
          : messages.range(first, last, total),
      atStart: current === 0,
      atEnd: current >= count - 1,
      prev: current - 1,
      next: current + 1,
      lastPage: count - 1,
      pages: Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => {
        const index = from + i;
        return {
          index,
          label: index + 1,
          name: messages.page(index + 1),
          active: index === current,
          aria: index === current ? 'page' : null,
        };
      }),
    };
  });

  /** The choices, with the current size added when it is not one of them. */
  protected readonly pageSizeChoices = computed(() => {
    const options = this.pageSizeOptions() ?? this.config.pageSizeOptions;
    const current = this.pageSize();
    return options.includes(current) ? options : [...options, current].sort((a, b) => a - b);
  });

  protected readonly canExport = computed(() =>
    this.virtual() ? this.count() > 0 : this.viewRows().length > 0,
  );

  constructor() {
    /*
     * Search, debounced. A timer cleared by the effect's own cleanup keeps the term a signal,
     * which both the client filter and the query read directly. A term below the minimum
     * length shows the unfiltered list rather than an error.
     */
    effect((onCleanup) => {
      const next = this.settledTerm(this.searchText());
      if (next === this.term()) return;

      const timer = setTimeout(() => {
        this.page.set(0);
        this.term.set(next);
        this.searchChange.emit(next);
      }, this.debounce());

      onCleanup(() => clearTimeout(timer));
    });

    // Its first run comes after `ngOnInit`, which set the key and restored the text.
    effect(() => {
      const text = this.searchText();
      if (this.memory && this.searchKey) this.memory.remember(this.searchKey, text);
    });

    /*
     * One request per query. The cleanup cancels the one in flight (unsubscribe, abort) when
     * the query changes, so a late answer to an old search never replaces a newer one.
     */
    effect((onCleanup) => {
      const query = this.query();
      this.reloads();
      if (!query) {
        untracked(() => this.fetching.set(false));
        return;
      }
      untracked(() => this.load(query, onCleanup));
    });

    // Clamp the page, but only against a total we know: `pageCount` reads 1 until the first
    // response, which would drop a deep link to page 3.
    effect(() => {
      if (this.busy() || this.virtual()) return;
      if (this.source() === 'fetch' && this.response() === undefined) return;

      const last = this.pageCount() - 1;
      if (this.page() > last) this.page.set(last);
    });

    // A new page starts at the top of the list.
    effect(() => {
      this.page();
      if (!untracked(this.virtual)) this.scrollToTop();
    });

    // A virtual list in the browser follows its scroller: the scroll position, and the
    // scroller's size (when ResizeObserver is there to tell).
    effect((onCleanup) => {
      const box = this.scrollBox()?.nativeElement;
      if (!box || !this.virtual()) return;

      const measure = () => this.viewport.set(box.clientHeight);
      const scrolled = () => this.scrollTop.set(box.scrollTop);
      measure();
      box.addEventListener('scroll', scrolled, { passive: true });
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
      observer?.observe(box);

      onCleanup(() => {
        box.removeEventListener('scroll', scrolled);
        observer?.disconnect();
      });
    });

    // A new search or sort starts a virtual list in hand at the top. (Fetch mode resets its
    // buffer, which does the same.)
    effect(() => {
      this.term();
      this.sort();
      this.appliedFilters();
      if (untracked(this.virtual) && !untracked(this.virtualFetch))
        untracked(() => this.scrollToTop());
    });

    // Measure again when what decides the rows' height changes.
    effect(() => {
      this.visibleColumns();
      this.compact();
      this.showActions();
      untracked(() => this.measuredHeight.set(0));
    });

    // The sizer: the longest text per column among the rows drawn so far and a spread of rows
    // from the whole list (or the pages loaded). Starts again when the columns change.
    effect(() => {
      if (!this.virtual()) {
        untracked(() => this.sizer.set(null));
        return;
      }
      const drawn = this.viewRows();
      const sample = this.sizerSample();
      const columns = this.visibleColumns();
      const templates = this.cellTemplates();
      const format = this.format();

      untracked(() => {
        const current = this.sizer();
        const fresh = [columns, templates, format].some((part, i) => part !== this.sizerFor[i]);
        this.sizerFor = [columns, templates, format];
        const widest: RenderCell<T>[] = fresh || !current ? [] : [...current];
        const consider = (cells: readonly RenderCell<T>[]) =>
          cells.forEach((cell, i) => {
            if (!widest[i] || cell.text.length > widest[i].text.length) widest[i] = cell;
          });

        for (const row of drawn) if (!row.placeholder) consider(row.cells);
        for (const row of sample) consider(this.cellsFor(row, columns, templates, format));

        if (fresh || widest.some((cell, i) => cell !== current?.[i])) this.sizer.set(widest);
      });
    });

    // After the first real rows are drawn, the tallest becomes the row height.
    afterRenderEffect(() => {
      if (!this.virtual()) return;
      const hasRows = this.viewRows().some((row) => !row.placeholder);
      const table = this.tableEl()?.nativeElement;
      if (!table || !hasRows) return;

      untracked(() => {
        if (!this.rowHeight() && !this.measuredHeight()) {
          let tallest = 0;
          for (const row of table.querySelectorAll<HTMLElement>('tbody tr.ngu-tbl-row')) {
            tallest = Math.max(tallest, row.getBoundingClientRect().height);
          }
          if (tallest > 0) this.measuredHeight.set(Math.ceil(tallest));
        }
      });
    });

    /*
     * Virtual fetch: the buffer starts over when the query (without its page) changes or on
     * reload(); otherwise the pages under the window are asked for, each once.
     */
    effect(() => {
      const base = this.vBase();
      const reload = this.reloads();
      const { first, last } = this.window();

      untracked(() => {
        if (!base) {
          if (this.vLoadedFor) this.vReset();
          this.vLoadedFor = null;
          return;
        }
        if (this.vLoadedFor?.base !== base || this.vLoadedFor.reload !== reload) {
          this.vLoadedFor = { base, reload };
          this.vReset();
          this.requestPage(0);
          return;
        }
        this.ensurePages(first, last);
      });
    });

    inject(DestroyRef).onDestroy(() => this.vCancel());

    effect(() => {
      const query = this.query();
      if (query) this.queryChange.emit(query);
    });

    // The panel is measured once, so it has to go when its trigger moves. Capture, because
    // the scroll may come from the table's own scroller. A scroll inside the panel (its body,
    // a dropdown's list) moves no trigger.
    effect((onCleanup) => {
      if (!this.filterOpen()) return;
      const win = this.doc.defaultView;
      if (!win) return;

      const close = (event: Event) => {
        const panel = this.filterPanel()?.nativeElement;
        if (panel && event.target instanceof Node && panel.contains(event.target)) return;
        this.filterPos.set(null);
      };
      win.addEventListener('scroll', close, true);
      win.addEventListener('resize', close);

      onCleanup(() => {
        win.removeEventListener('scroll', close, true);
        win.removeEventListener('resize', close);
      });
    });

    // In the top layer, so no card, overflow or transformed ancestor can clip or trap it.
    afterRenderEffect(() => {
      const panel = this.filterPanel()?.nativeElement;
      if (panel) showInTopLayer(panel);
    });
  }

  /**
   * Restores this table's last search from the configured memory. Not in the constructor, so
   * a screen's own `[searchText]` wins.
   */
  ngOnInit(): void {
    if (!this.memory) return;

    this.searchKey = this.stateKey() ?? this.doc.location?.pathname ?? '';
    if (!this.searchKey || this.searchText()) return;

    const saved = this.memory.recall(this.searchKey);
    if (!saved) return;

    this.searchText.set(saved);
    this.term.set(this.settledTerm(saved));
    this.searchChange.emit(this.term());
  }

  /** Runs the current query again: call it after a save or a delete. Fetch mode only. */
  reload(): void {
    if (this.hasFetch()) this.reloads.update((n) => n + 1);
  }

  /**
   * Puts a filter model into the query without the panel, for a control that acts at once,
   * such as a tab in `[nguTableTabs]`. The model is passed in rather than read from
   * `[filters]`, which still holds its old value during the click that changed it.
   */
  commitFilters(filters: Record<string, unknown>): void {
    // Written together, so the query changes once and the table fetches once.
    this.page.set(0);
    // A copy: the screen's object keeps changing as its controls are used again.
    this.appliedFilters.set({ ...filters });
  }

  /** The box as a search term: below the minimum length counts as empty. */
  private settledTerm(text: string): string {
    const typed = text.trim();
    return typed.length < this.minLength() ? '' : typed;
  }

  private load(query: NguTableQuery, onCleanup: (cleanup: () => void) => void): void {
    const fetch = this.fetchFn();
    if (!fetch) return;

    const controller = new AbortController();
    // On the server, rendering waits for the first page, so the HTML has the rows.
    const task = this.isServer ? this.pendingTasks.add() : null;
    let settled = false;
    let received = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      task?.();
    };
    const fail = (error: unknown) => {
      if (settled) return;
      // Dropped, so the error notice shows instead of the last page's rows.
      this.response.set(undefined);
      this.failure.set({ error });
      this.fetching.set(false);
      finish();
      this.loadError.emit(error);
    };

    this.fetching.set(true);
    this.failure.set(null);

    let cancel = () => {};
    try {
      cancel = consume(fetch(query, { signal: controller.signal }), {
        next: (page) => {
          received = true;
          this.response.set(page);
          this.fetching.set(false);
          finish();
        },
        error: fail,
        complete: () => {
          if (!received) fail(new Error('fetchFn completed without a page'));
        },
      });
    } catch (error) {
      fail(error);
    }

    onCleanup(() => {
      cancel();
      controller.abort();
      finish();
    });
  }

  // ── Virtual rows ───────────────────────────────────────────────────────────
  /** The row at an index of the whole virtual list, or `undefined` while its page loads. */
  private rowAt(index: number): T | undefined {
    if (!this.virtualFetch()) return this.processed()[index];

    const size = this.pageSize();
    const page = this.vPages().get(Math.floor(index / size));
    return page && index % size < page.length ? page[index % size] : undefined;
  }

  private scrollToTop(): void {
    this.scrollTop.set(0);
    const box = this.scrollBox()?.nativeElement;
    if (typeof box?.scrollTo === 'function') box.scrollTo({ top: 0 });
    else if (box) box.scrollTop = 0;
  }

  /** Asks for every page the window touches that is neither held nor in flight. */
  private ensurePages(first: number, last: number): void {
    // Before the first answer the total is unknown and the window empty: page 0 it is.
    if (this.vTotal() === undefined) {
      this.requestPage(0);
      return;
    }
    if (last < first) return;

    const span = pageSpan(first, last, this.pageSize());
    for (let page = span.from; page <= span.to; page++) this.requestPage(page);
  }

  private requestPage(index: number): void {
    if (this.vPages().has(index) || this.vInFlight.has(index)) return;
    const fetch = this.fetchFn();
    if (!fetch) return;

    const order = this.sort();
    const query: NguTableQuery = {
      page: index,
      size: this.pageSize(),
      search: this.term(),
      sort: order?.field ?? null,
      order: order?.direction ?? null,
      filters: this.appliedFilters(),
    };
    const generation = this.vGeneration;
    const current = () => generation === this.vGeneration;
    const controller = new AbortController();
    const task = this.isServer ? this.pendingTasks.add() : null;
    let settled = false;
    let received = false;

    const settle = () => {
      if (settled) return;
      settled = true;
      task?.();
      this.vInFlight.delete(index);
      if (!current()) return;
      this.vPending.update((set) => {
        const next = new Set(set);
        next.delete(index);
        return next;
      });
    };
    const fail = (error: unknown) => {
      if (settled) return;
      const live = current();
      settle();
      if (!live) return;
      this.failure.set({ error });
      this.loadError.emit(error);
    };

    this.vPending.update((set) => new Set(set).add(index));
    this.queryChange.emit(query);

    let cancel = () => {};
    // Registered before the request, so a source that answers at once finds it to delete.
    this.vInFlight.set(index, () => {
      cancel();
      controller.abort();
      settle();
    });
    try {
      cancel = consume(fetch(query, { signal: controller.signal }), {
        next: (page) => {
          received = true;
          if (current()) this.applyPage(index, page);
          settle();
        },
        error: fail,
        complete: () => {
          if (!received) fail(new Error('fetchFn completed without a page'));
        },
      });
    } catch (error) {
      fail(error);
    }
  }

  private applyPage(index: number, page: NguTablePage<T>): void {
    const rows = page.content ?? [];
    this.vTotal.set(page.totalElements ?? rows.length);
    this.failure.set(null);

    // Enough pages for a few screens either way, at least MIN_PAGES; the furthest go first.
    const { first, last } = this.window();
    const perWindow = Math.ceil((last - first + 1) / Math.max(1, this.pageSize())) + 1;
    const max = Math.max(MIN_PAGES, perWindow * 4);

    this.vPages.update((held) => {
      const next = new Map(held).set(index, rows);
      for (const drop of furthestPages(next.keys(), index, max)) next.delete(drop);
      return next;
    });
  }

  /** Cancels every request in flight; their late answers are dropped. */
  private vCancel(): void {
    this.vGeneration++;
    for (const cancel of [...this.vInFlight.values()]) cancel();
    this.vInFlight.clear();
    this.vPending.set(new Set());
  }

  private vReset(): void {
    this.vCancel();
    this.vPages.set(new Map());
    this.vTotal.set(undefined);
    this.failure.set(null);
    this.scrollToTop();
  }

  /** The footer's Try again in a virtual list: asks again for the rows in view. */
  protected retryVirtual(): void {
    this.failure.set(null);
    const { first, last } = this.window();
    this.ensurePages(first, last);
  }

  private cellsFor(
    row: T,
    columns: readonly NguTableColumn<T>[],
    templates: readonly NguTableCell<T>[],
    format: CellFormat,
  ): RenderCell<T>[] {
    const cacheable = typeof row === 'object' && row !== null;
    const hit = cacheable ? this.cellCache.get(row as object) : undefined;
    if (hit) return hit;

    const cells = buildCells(row, columns, templates, format);
    if (cacheable) this.cellCache.set(row as object, cells);

    return cells;
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  /**
   * A plain `[value]` / `(input)` pair rather than `ngModel`: `ngModel` inside a component
   * placed in a parent `[formGroup]` tries to register with that form and throws.
   */
  protected onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchText.set('');
  }

  // ── Sorting ────────────────────────────────────────────────────────────────
  private sortKey(column: NguTableColumn<T>): string {
    return column.sortField ?? column.field;
  }

  private sortedBy(column: NguTableColumn<T>): NguTableSortDirection | null {
    const order = this.sort();
    return order && order.field === this.sortKey(column) ? order.direction : null;
  }

  protected toggleSort(column: NguTableColumn<T>): void {
    const current = this.sortedBy(column);
    this.sort.set({
      field: this.sortKey(column),
      direction: current === 'asc' ? 'desc' : 'asc',
    });
    // Re-ordering cuts the pages again.
    this.page.set(0);
  }

  // ── Toolbar ────────────────────────────────────────────────────────────────
  protected clearAll(): void {
    // The term is set here rather than left to the debounce: one query change, one fetch.
    this.searchText.set('');
    this.term.set('');
    this.sort.set(null);
    this.appliedFilters.set({});
    this.page.set(0);
    this.cleared.emit();
  }

  protected toggleFilter(): void {
    this.filterPos.set(this.filterOpen() ? null : this.placeFilter());
  }

  private placeFilter(): FilterPos {
    const rect = this.filterTrigger()?.nativeElement.getBoundingClientRect();
    const win = this.doc.defaultView;
    if (!rect || !win) return { left: FILTER_GAP, top: FILTER_GAP, bottom: null, maxHeight: 400 };

    return placeFilterPanel(rect, win.innerWidth, win.innerHeight);
  }

  /** Closes the panel, and puts focus back on its trigger when it was inside. */
  protected closeFilter(): void {
    const panel = this.filterPanel()?.nativeElement;
    const focusInside = !!panel && panel.contains(this.doc.activeElement);
    this.filterPos.set(null);
    if (focusInside) this.filterTrigger()?.nativeElement.focus();
  }

  protected applyFilters(): void {
    const snapshot = { ...this.filters() };
    this.closeFilter();
    this.commitFilters(snapshot);
    this.filtersApplied.emit(snapshot);
  }

  protected clearFilters(): void {
    this.closeFilter();
    this.page.set(0);
    this.appliedFilters.set({});
    this.filtersCleared.emit();
  }

  /**
   * A click outside the panel and its trigger closes it. The path is read rather than
   * `contains`, because a click can remove its own target, such as an option in a dropdown
   * inside the panel, before this runs.
   */
  protected onDocumentClick(event: Event): void {
    if (!this.filterOpen()) return;

    const path = event.composedPath();
    const panel = this.filterPanel()?.nativeElement;
    const trigger = this.filterTrigger()?.nativeElement;
    if ((panel && path.includes(panel)) || (trigger && path.includes(trigger))) return;

    this.filterPos.set(null);
  }

  /** Escape closes the filter panel, unless something inside it handled the key first. */
  protected onEscape(event: Event): void {
    if (event.defaultPrevented || !this.filterOpen()) return;
    this.closeFilter();
  }

  protected pickFile(): void {
    if (this.importOpensDialog()) {
      this.importClick.emit();
      return;
    }
    this.fileInput()?.nativeElement.click();
  }

  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.fileSelected.emit(file);

    // So the same file twice in a row still fires a change.
    input.value = '';
  }

  // ── Paging ─────────────────────────────────────────────────────────────────
  protected goToPage(page: number): void {
    const target = Math.max(0, Math.min(page, this.pageCount() - 1));
    if (target !== this.page()) this.page.set(target);
  }

  protected onPageSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (!size || size === this.pageSize()) return;

    this.pageSize.set(size);
    // Row 40 is on a different page once the pages are a different length.
    this.page.set(0);
  }

  // ── Rows ───────────────────────────────────────────────────────────────────
  /**
   * A click on the row, but not on a button, link or field inside it (row actions, a link
   * cell, a templated control) and not in the actions column: those are other actions.
   */
  protected onRowClick(event: Event, row: T): void {
    if (!this.rowClickable()) return;

    const target = event.target as Element | null;
    const inner = target?.closest?.(INTERACTIVE);
    if (inner && (event.currentTarget as Element).contains(inner)) return;

    this.rowClick.emit(row);
  }

  /** Enter on the focused row itself, not on a button inside it. */
  protected onRowKey(event: Event, row: T): void {
    if (!this.rowClickable() || event.target !== event.currentTarget) return;
    event.preventDefault();
    this.rowClick.emit(row);
  }

  protected onLink(row: T, column: NguTableColumn<T>): void {
    this.linkClick.emit({ row, column });
  }

  protected askDelete(row: T, event?: Event): void {
    if (!this.confirmDelete()) {
      this.deleteRow.emit(row);
      return;
    }

    // Safari and Firefox on macOS don't focus a clicked button, so the dialog can't rely on
    // the browser to put focus back: it goes back to this button by hand.
    this.returnFocus = (event?.currentTarget as HTMLElement | null) ?? null;
    this.pendingDelete.set({ row });
    const dialog = this.dialog()?.nativeElement;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  protected confirmPendingDelete(): void {
    const pending = this.pendingDelete();
    if (!pending) return;

    this.closeDialog();
    this.deleteRow.emit(pending.row);
  }

  protected closeDialog(): void {
    const dialog = this.dialog()?.nativeElement;
    if (dialog?.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
    this.onDialogClosed();
  }

  /** However the dialog closed (a button, Escape, the backdrop), focus goes back to Delete. */
  protected onDialogClosed(): void {
    if (!this.pendingDelete() && !this.returnFocus) return;
    this.pendingDelete.set(null);

    const target = this.returnFocus;
    this.returnFocus = null;
    if (target?.isConnected) target.focus();
  }

  /** A click on the dialog element itself is a click on its backdrop. */
  protected onDialogClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeDialog();
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  /**
   * CSV of the rows in hand, with the table's own headings and formatting. Client mode
   * exports every matching row; fetch mode the page in hand, since a whole-set export is a
   * server job.
   */
  protected exportCsv(): void {
    const columns = this.visibleColumns();
    const rows = this.source() === 'client' ? this.processed() : this.sourceRows();
    const format = { ...this.format(), empty: '' };

    const lines = [
      columns.map((column) => csvCell(column.header)).join(','),
      ...rows.map((row) =>
        columns
          .map((column) => {
            const value = resolvePath(row, column.exportField ?? column.field);
            return csvCell(cellText(value, column, row, format));
          })
          .join(','),
      ),
    ];

    // The byte order mark is what makes Excel read the file as UTF-8.
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = this.doc.createElement('a');
    link.href = url;
    link.download = `${this.exportFileName()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.exported.emit([...rows]);
  }

  /** Numbers and dates by size, the rest by locale with digits compared as numbers. */
  private compare(a: any, b: any): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

    return String(a).localeCompare(String(b), this.locale, {
      numeric: true,
      sensitivity: 'base',
    });
  }
}

/** Quotes a CSV field when it holds a quote, a comma or a line break. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
