import {
  InjectionToken,
  inject,
  type ProviderToken,
  type Provider,
  type Signal,
} from '@angular/core';

/**
 * What a badge means, not its color: the stylesheet decides what each tone looks like,
 * through the `--ngu-tbl-<tone>` variables.
 */
export type NguBadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'neutral';

/** Every built-in string. Functions take the numbers they describe, for plurals. */
export interface NguTableMessages {
  /** Placeholder and accessible name of the search box. Default `Search…`. */
  searchPlaceholder: string;
  /** Accessible name of the button that empties the search box. Default `Clear search`. */
  clearSearch: string;
  /** The toolbar button that resets search, sort and filters. Default `Clear`. */
  clear: string;
  /** The toolbar button that opens the filter panel. Default `Filter`. */
  filter: string;
  /** Heading of the filter panel. Default `Filters`. */
  filtersTitle: string;
  /** Accessible name of the filter panel's close button. Default `Close filters`. */
  closeFilters: string;
  /** The filter panel's reset button. Default `Clear`. */
  clearFilters: string;
  /** The filter panel's submit button. Default `Apply`. */
  applyFilters: string;
  /** The toolbar's import button. Default `Import`. */
  import: string;
  /** The toolbar's CSV export button. Default `Export`. */
  export: string;
  /** The toolbar's add button, unless `addLabel` is set. Default `Add`. */
  add: string;
  /** Heading of the row actions column. Default `Actions`. */
  actions: string;
  /** Name of the row's view button. Default `View`. */
  view: string;
  /** Name of the row's edit button. Default `Edit`. */
  edit: string;
  /** Name of the row's delete button and the dialog's confirm button. Default `Delete`. */
  delete: string;
  /** The delete dialog's cancel button. Default `Cancel`. */
  cancel: string;
  /** Heading of the delete dialog. Default `Delete this record?`. */
  deleteTitle: string;
  /** Text of the delete dialog, unless `deleteMessage` is set. */
  deleteMessage: string;
  /** Heading of the notice shown when there are no rows. Default `Nothing to show`. */
  emptyTitle: string;
  /** Text under `emptyTitle`. */
  emptyMessage: string;
  /** Heading of the notice a failed `fetchFn` shows. Default `Could not load this list`. */
  errorTitle: string;
  /** Text under `errorTitle`. */
  errorMessage: string;
  /** The error notice's button, which asks again. Default `Try again`. */
  retry: string;
  /** A true `boolean` cell, for screen readers and the CSV. Default `Yes`. */
  yes: string;
  /** A false `boolean` cell, for screen readers and the CSV. Default `No`. */
  no: string;
  /** The footer's range, such as "Showing 11–20 of 57". */
  range: (first: number, last: number, total: number) => string;
  /** The footer's text when the result set is empty. Default `No records`. */
  noRecords: string;
  /** The footer of a virtual table, which has no pages: the size of the list, such as "5,000 rows". */
  count: (total: number) => string;
  /** One choice of the rows-per-page picker, such as "25 / page". */
  pageSize: (size: number) => string;
  /** Accessible name of the rows-per-page picker. Default `Rows per page`. */
  rowsPerPage: string;
  /** Accessible name of the pager. Default `Pagination`. */
  pagination: string;
  /** Accessible name of the first-page button. Default `First page`. */
  firstPage: string;
  /** Accessible name of the previous-page button. Default `Previous page`. */
  previousPage: string;
  /** Accessible name of the next-page button. Default `Next page`. */
  nextPage: string;
  /** Accessible name of the last-page button. Default `Last page`. */
  lastPage: string;
  /** Accessible name of a numbered page button, such as "Page 3". */
  page: (page: number) => string;
}

/**
 * Keeps each table's search text while people move between screens, so a list opened again
 * shows what was searched. `key` is the table's `stateKey`, or the page's path.
 */
export interface NguTableSearchMemory {
  /** The text last remembered for `key`, or `''`. */
  recall(key: string): string;
  /** Called as the search box changes; `''` means forget. */
  remember(key: string, text: string): void;
}

/**
 * Defaults for every `<ngu-table>` under an injector, passed to `provideNguTableConfig`.
 * Options left out keep the parent injector's value, or the built-in default.
 */
export interface NguTableConfig {
  /** Replaces some or all built-in strings. A signal switches language live. */
  messages?: Partial<NguTableMessages> | Signal<Partial<NguTableMessages>>;
  /** Dot path to each row's identity, which keeps rows apart across sorts. Default `'id'`. */
  rowKey?: string;
  /** Rows per page. Default 10. */
  pageSize?: number;
  /** The rows-per-page choices. Default `[10, 25, 50, 100]`. */
  pageSizeOptions?: readonly number[];
  /** How long typing has to pause before the table searches, in ms. Default 400. */
  searchDebounce?: number;
  /**
   * Shorter terms do not search; the list stays unfiltered until the term is this long. An
   * empty box always searches, since that is how a search is cancelled. Default 1.
   */
  searchMinLength?: number;
  /** Shown for `null`, `undefined` and `''`. Default `—`. */
  emptyText?: string;
  /** Angular date pattern of `date` columns. Default `'d MMM y'`. */
  dateFormat?: string;
  /** Angular date pattern of `datetime` columns. Default `'d MMM y, h:mm a'`. */
  datetimeFormat?: string;
  /** ISO 4217 code of `currency` columns without one. Default Angular's `DEFAULT_CURRENCY_CODE`. */
  currencyCode?: string;
  /**
   * The locale an amount in `currencyCode` is formatted in. Default: the app's `LOCALE_ID` for
   * every currency. For Indian grouping of rupees only: `code => code === 'INR' ? 'en-IN' : 'en-US'`
   * (register the locale data with `registerLocaleData` first).
   */
  currencyLocale?: (currencyCode: string) => string;
  /**
   * Status words and their tones for `badge` columns, checked after a column's `badgeMap` and
   * before the built-in vocabulary. Keys ignore case, spaces, dots, dashes and underscores.
   */
  badgeTones?: Record<string, NguBadgeTone>;
  /**
   * Keeps search text across screens: an object, or a class or token the table injects (so it
   * can use the router).
   */
  searchMemory?: NguTableSearchMemory | ProviderToken<NguTableSearchMemory>;
}

/**
 * The config with every default filled in and the messages merged across injectors, as
 * `NGU_TABLE_CONFIG` holds it.
 */
export interface ResolvedNguTableConfig {
  /** The merged messages; a function, so a signal of messages stays live. */
  messages: () => NguTableMessages;
  /** Default `rowKey`. */
  rowKey: string;
  /** Default page size. */
  pageSize: number;
  /** Default rows-per-page choices. */
  pageSizeOptions: readonly number[];
  /** Default search debounce, in ms. */
  searchDebounce: number;
  /** Default minimum search length. */
  searchMinLength: number;
  /** Default text for empty values. */
  emptyText: string;
  /** Pattern of `date` columns. */
  dateFormat: string;
  /** Pattern of `datetime` columns. */
  datetimeFormat: string;
  /** Currency of `currency` columns without one; `null` for `DEFAULT_CURRENCY_CODE`. */
  currencyCode: string | null;
  /** Locale per currency; `null` for `LOCALE_ID`. */
  currencyLocale: ((currencyCode: string) => string) | null;
  /** App status words by normalized key. */
  badgeTones: Readonly<Record<string, NguBadgeTone>>;
  /** The search memory, or `null`. */
  searchMemory: NguTableSearchMemory | ProviderToken<NguTableSearchMemory> | null;
}

const number = (n: number) => n.toLocaleString();

/** The built-in English strings. */
export const DEFAULT_MESSAGES: NguTableMessages = {
  searchPlaceholder: 'Search…',
  clearSearch: 'Clear search',
  clear: 'Clear',
  filter: 'Filter',
  filtersTitle: 'Filters',
  closeFilters: 'Close filters',
  clearFilters: 'Clear',
  applyFilters: 'Apply',
  import: 'Import',
  export: 'Export',
  add: 'Add',
  actions: 'Actions',
  view: 'View',
  edit: 'Edit',
  delete: 'Delete',
  cancel: 'Cancel',
  deleteTitle: 'Delete this record?',
  deleteMessage: 'This record will be removed. This cannot be undone.',
  emptyTitle: 'Nothing to show',
  emptyMessage: 'No records match what you are looking for.',
  errorTitle: 'Could not load this list',
  errorMessage: 'The request failed. It may just be the connection.',
  retry: 'Try again',
  yes: 'Yes',
  no: 'No',
  range: (first, last, total) => `Showing ${number(first)}–${number(last)} of ${number(total)}`,
  noRecords: 'No records',
  count: (total) => `${number(total)} ${total === 1 ? 'row' : 'rows'}`,
  pageSize: (size) => `${number(size)} / page`,
  rowsPerPage: 'Rows per page',
  pagination: 'Pagination',
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  page: (page) => `Page ${number(page)}`,
};

const ROOT: ResolvedNguTableConfig = {
  messages: () => DEFAULT_MESSAGES,
  rowKey: 'id',
  pageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  searchDebounce: 400,
  searchMinLength: 1,
  emptyText: '—',
  dateFormat: 'd MMM y',
  datetimeFormat: 'd MMM y, h:mm a',
  currencyCode: null,
  currencyLocale: null,
  badgeTones: {},
  searchMemory: null,
};

/** The resolved config every `<ngu-table>` reads. Set it with `provideNguTableConfig`. */
export const NGU_TABLE_CONFIG = new InjectionToken<ResolvedNguTableConfig>('NGU_TABLE_CONFIG', {
  providedIn: 'root',
  factory: () => ROOT,
});

/**
 * Sets defaults for every `<ngu-table>` under this injector. Nested calls merge, so a route
 * can replace one message and keep the app's others.
 */
export function provideNguTableConfig(config: NguTableConfig): Provider {
  return {
    provide: NGU_TABLE_CONFIG,
    useFactory: (): ResolvedNguTableConfig => {
      const parent = inject(NGU_TABLE_CONFIG, { skipSelf: true, optional: true }) ?? ROOT;
      const { messages, badgeTones, ...rest } = config;
      const own = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));

      return {
        ...parent,
        ...own,
        badgeTones: { ...parent.badgeTones, ...normalizeTones(badgeTones) },
        messages: () => ({
          ...parent.messages(),
          ...(typeof messages === 'function' ? messages() : messages),
        }),
      };
    },
  };
}

/** The key a status word is looked up by: no case, spaces, dots, dashes or underscores. */
function toneKey(value: string): string {
  return value.toLowerCase().replace(/[\s._-]+/g, '');
}

function normalizeTones(
  tones: Record<string, NguBadgeTone> | undefined,
): Record<string, NguBadgeTone> {
  return Object.fromEntries(Object.entries(tones ?? {}).map(([k, v]) => [toneKey(k), v]));
}
