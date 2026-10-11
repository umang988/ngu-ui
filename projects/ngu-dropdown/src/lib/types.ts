export type NguDropdownSortDirection = 'asc' | 'desc';

/**
 * A static option, for `[options]` lists such as statuses or a period picker. Point the
 * dropdown at it with `optionValue="value" optionLabel="label"`. A plain `string[]` needs
 * neither: a path the option does not have falls back to the option itself.
 */
export interface NguDropdownItem<V = string> {
  value: V;
  label: string;
}

/**
 * What the dropdown asks `fetchFn` for. The same fields a paged table usually sends, so one
 * service method can feed both.
 */
export interface NguDropdownQuery {
  /** Zero-based page index. */
  page: number;
  size: number;
  /** The search term, trimmed. `''` when empty. */
  search: string;
  sort: string | null;
  order: NguDropdownSortDirection | null;
  /** The `[filters]` binding, as of its last change. */
  filters: Record<string, unknown>;
}

/**
 * One page of rows plus the size of the whole result set. This is the shape Spring Data's
 * `Page` serializes to; only `content` and `totalElements` are read.
 */
export interface NguDropdownPage<T> {
  content: readonly T[];
  totalElements: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

/** The second argument to `fetchFn` and `lookupFn`. */
export interface NguDropdownFetchContext {
  /** Aborted when the dropdown no longer needs the answer, for `fetch(url, { signal })`. */
  signal: AbortSignal;
}

/**
 * Anything with a `subscribe` method, which includes every RxJS `Observable` and so
 * `HttpClient`'s results. The dropdown takes the first value and unsubscribes when it no
 * longer needs the answer.
 */
export interface NguSubscribable<T> {
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
  $implicit: T;
  /** Position in the whole result set, not in the rendered window. */
  index: number;
  selected: boolean;
}

/** `<ng-template nguDropdownSelection let-row>`, the closed control's display. */
export interface NguDropdownSelectionContext<T = any> {
  $implicit: T;
}
