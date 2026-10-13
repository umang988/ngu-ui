/** A sort direction, passed to `fetchFn` as `order`. */
export type NguDropdownSortDirection = 'asc' | 'desc';

/**
 * A static option, for `[options]` lists such as statuses or a period picker. Point the
 * dropdown at it with `optionValue="value" optionLabel="label"`. A plain `string[]` needs
 * neither: a path the option does not have falls back to the option itself.
 */
export interface NguDropdownItem<V = string> {
  /** The key, which the default `optionValue` path reads. */
  value: V;
  /** The text shown, searched and announced, which the default `optionLabel` path reads. */
  label: string;
}

/**
 * What the dropdown asks `fetchFn` for. The same fields a paged table usually sends, so one
 * service method can feed both.
 */
export interface NguDropdownQuery {
  /** Zero-based page index. */
  page: number;
  /** Rows per page, from `[pageSize]`. */
  size: number;
  /** The search term, trimmed. `''` when empty. */
  search: string;
  /** The `[sortBy]` binding, or `null`. */
  sort: string | null;
  /** The `[sortOrder]` binding, or `null`. */
  order: NguDropdownSortDirection | null;
  /** The `[filters]` binding, as of its last change. */
  filters: Record<string, unknown>;
}

/**
 * One page of rows plus the size of the whole result set. This is the shape Spring Data's
 * `Page` serializes to; only `content` and `totalElements` are read.
 */
export interface NguDropdownPage<T> {
  /** The rows of this page. */
  content: readonly T[];
  /** Rows in the whole result set, which sizes the scrollbar. */
  totalElements: number;
  /** Pages in the whole result set, as Spring Data sends it. Not read. */
  totalPages?: number;
  /** This page's zero-based index, as Spring Data sends it. Not read. */
  number?: number;
  /** Rows per page, as Spring Data sends it. Not read. */
  size?: number;
}

/** The second argument to `fetchFn` and `lookupFn`. */
export interface NguDropdownFetchContext {
  /** Aborted when the dropdown no longer needs the answer, for `fetch(url, { signal })`. */
  signal: AbortSignal;
}

/**
 * Anything with a `subscribe` method, which includes every RxJS `Observable` and so
 * `HttpClient`'s results. Each value it sends is used (`HttpClient` sends one); the
 * dropdown unsubscribes when it no longer needs the answer before the first value arrives.
 */
export interface NguSubscribable<T> {
  /** Starts the request. Its subscription is unsubscribed if the answer is no longer needed. */
  subscribe(observer: {
    next: (value: T) => void;
    error: (error: unknown) => void;
    complete: () => void;
  }): { unsubscribe(): void };
}

/** An Observable or a Promise of `T`. */
export type NguAsync<T> = NguSubscribable<T> | PromiseLike<T>;

/** Loads one page. Keep it a class field rather than an arrow written in the template. */
export type NguDropdownFetch<T> = (
  query: NguDropdownQuery,
  context: NguDropdownFetchContext,
) => NguAsync<NguDropdownPage<T>>;

/**
 * Loads the rows behind keys the dropdown cannot name yet, such as an id an edit form
 * loaded. Return the rows in any order; keys with no row keep showing the bare key.
 */
export type NguDropdownLookup<T> = (
  keys: readonly unknown[],
  context: NguDropdownFetchContext,
) => NguAsync<readonly T[]>;

/** `<ng-template nguDropdownOption let-row let-selected="selected">` */
export interface NguDropdownOptionContext<T = any> {
  /** The row, as `let-row`. */
  $implicit: T;
  /** Position in the whole result set, not in the rendered window. */
  index: number;
  /** Whether the row is chosen, as `let-selected="selected"`. */
  selected: boolean;
}

/** `<ng-template nguDropdownSelection let-row>`, the closed control's display. */
export interface NguDropdownSelectionContext<T = any> {
  /** The chosen row, as `let-row`. */
  $implicit: T;
}
