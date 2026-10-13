/** A sort direction, passed to `fetchFn` as `order`. */
export type NguTableSortDirection = 'asc' | 'desc';

/** The column a table is sorted by, as `[(sort)]` holds it. */
export interface NguTableSort {
  /** The column's `sortField` when it has one, else its `field`. */
  field: string;
  /** Ascending or descending. */
  direction: NguTableSortDirection;
}

/** How a column draws and formats its values. `'text'` is the default. */
export type NguTableColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'datetime'
  | 'badge'
  | 'boolean'
  | 'avatar'
  | 'image'
  | 'email'
  | 'phone'
  | 'link'
  | 'progress';

import type { NguBadgeTone } from 'ngu-table/config';

export type { NguBadgeTone };

/** One column of `[columns]`. Only `field` and `header` are required. */
export interface NguTableColumn<T = any> {
  /** Dot path into the row, such as `customer.name`. A row with no customer reads empty. */
  field: string;
  /** The heading text, also the CSV heading. */
  header: string;
  /** How values are drawn and formatted. Default `'text'`. */
  type?: NguTableColumnType;
  /** Whether the heading sorts by this column. Default `true`. */
  sortable?: boolean;
  /** The sort key sent to the server when it differs from `field`. */
  sortField?: string;
  /**
   * Draws the cell with the `<ng-template nguTableCell="<field>">` of the same field instead
   * of by type. Without a matching template the plain value is shown.
   */
  template?: boolean;
  /** Right-aligned with tabular figures. Implied by `number`, `currency` and `percent`. */
  numeric?: boolean;
  /** Lets long text wrap. Cells stay on one line otherwise. */
  wrap?: boolean;
  /** A CSS width for the column, such as `'8rem'` or `'20%'`. */
  width?: string;
  /** Leaves the column out of the table and the CSV export. */
  hidden?: boolean;

  /** `date` and `datetime`: an Angular date pattern. Defaults come from the config. */
  format?: string;
  /** `currency`: an ISO 4217 code. Default: the config's, else Angular's `DEFAULT_CURRENCY_CODE`. */
  currencyCode?: string;
  /** `number`, `currency` and `percent`: an Angular `digitsInfo` such as `'1.0-2'`. */
  digitsInfo?: string;
  /**
   * `badge`: value to tone. Values not in the map fall back to the config's `badgeTones`, then
   * to a built-in vocabulary (`ACTIVE` is success, `PENDING` warning...), then `neutral`.
   */
  badgeMap?: Record<string, NguBadgeTone>;
  /** `avatar`: dot path to an image URL. Without one, initials of the cell value are shown. */
  avatarSrc?: string;
  /** `image`: a CSS length for the square thumbnail. Default `36px`. */
  imageSize?: string;
  /** `progress`: the value that counts as full. Default 100. */
  progressMax?: number;

  /** The cell's text, overriding the type's own formatting. Also used by the CSV export. */
  formatter?: (value: any, row: T) => string;
  /** Dot path to export instead of `field`, for a templated cell whose field is not the text. */
  exportField?: string;
}

/**
 * What the table asks `fetchFn` for. The same fields ngu-dropdown sends, so one service method
 * can feed both.
 */
export interface NguTableQuery {
  /** Zero-based page index. */
  page: number;
  /** Rows per page. */
  size: number;
  /** The settled search term, trimmed. `''` when empty. */
  search: string;
  /** The sort key, or `null` when unsorted. */
  sort: string | null;
  /** The sort direction, or `null` when unsorted. */
  order: NguTableSortDirection | null;
  /** The filter model as of the last Apply or `commitFilters()`. */
  filters: Record<string, unknown>;
}

/**
 * One page of rows plus the size of the whole result set. This is the shape Spring Data's
 * `Page` serializes to; `content` and `totalElements` are required.
 */
export interface NguTablePage<T> {
  /** The rows of this page. */
  content: readonly T[];
  /** Rows in the whole result set. */
  totalElements: number;
  /** Pages in the whole result set. Worked out from `totalElements` when missing. */
  totalPages?: number;
  /** This page's zero-based index, as Spring Data sends it. Not read. */
  number?: number;
  /** Rows per page, as Spring Data sends it. Not read. */
  size?: number;
}

/** The second argument to `fetchFn`. */
export interface NguTableFetchContext {
  /** Aborted when the table no longer needs the answer, for `fetch(url, { signal })`. */
  signal: AbortSignal;
}

/**
 * Anything with a `subscribe` method, which includes every RxJS `Observable` and so
 * `HttpClient`'s results. The table unsubscribes when it no longer needs the answer.
 */
export interface NguTableSubscribable<T> {
  /** Starts the request. Its subscription is unsubscribed if the answer is no longer needed. */
  subscribe(observer: {
    next: (value: T) => void;
    error: (error: unknown) => void;
    complete: () => void;
  }): { unsubscribe(): void };
}

/** An Observable or a Promise of `T`. */
export type NguTableAsync<T> = NguTableSubscribable<T> | PromiseLike<T>;

/** Loads one page. Keep it a class field rather than an arrow written in the template. */
export type NguTableFetch<T> = (
  query: NguTableQuery,
  context: NguTableFetchContext,
) => NguTableAsync<NguTablePage<T>>;

/** The context of an `<ng-template nguTableCell>`. */
export interface NguTableCellContext<T = any> {
  /** The cell's value, read from the column's `field`. */
  $implicit: any;
  /** The whole row. */
  row: T;
  /** The column being drawn. */
  column: NguTableColumn<T>;
}

/** The context of an `<ng-template nguTableRowActions>`. */
export interface NguTableRowContext<T = any> {
  /** The row whose buttons these are. */
  $implicit: T;
}

/** What `(linkClick)` emits for a `link` column. */
export interface NguTableLinkEvent<T = any> {
  /** The row whose link was pressed. */
  row: T;
  /** The link's column. */
  column: NguTableColumn<T>;
}
