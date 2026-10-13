import type { ComponentFixture } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import type { NguTableFetchContext, NguTablePage, NguTableQuery } from '../lib/types';

export interface Order {
  id: number;
  code: string;
  customer: { name: string };
  total: number;
  status: string;
}

export const TOTAL = 57;

const STATUSES = ['ACTIVE', 'PENDING', 'CANCELLED'];

export function order(id: number): Order {
  return {
    id,
    code: `ORD-${String(id).padStart(3, '0')}`,
    customer: { name: id % 2 ? 'Basmati Traders' : 'Sona Foods' },
    total: id * 100,
    status: STATUSES[id % 3],
  };
}

export const ORDERS: readonly Order[] = Array.from({ length: TOTAL }, (_, i) => order(i + 1));

/** Records what the table asked for, and answers from 57 orders. */
export class FakeServer {
  readonly queries: NguTableQuery[] = [];
  readonly signals: AbortSignal[] = [];

  /** While set, requests are accepted and never answered. */
  hold = false;

  /** While set, requests fail. */
  fail = false;

  readonly load = (
    query: NguTableQuery,
    context: NguTableFetchContext,
  ): Observable<NguTablePage<Order>> => {
    this.queries.push(query);
    this.signals.push(context.signal);
    if (this.hold) return new Subject<NguTablePage<Order>>();
    if (this.fail) return throwError(() => new Error('the connection dropped'));

    return of(answer(query));
  };

  get last(): NguTableQuery {
    return this.queries[this.queries.length - 1];
  }
}

/** A search matches codes; sorting by code or total; the page is cut from the result. */
export function answer(query: NguTableQuery): NguTablePage<Order> {
  const term = query.search.toLowerCase();
  let rows = ORDERS.filter((o) => !term || o.code.toLowerCase().includes(term));
  const status = query.filters['status'];
  if (status) rows = rows.filter((o) => o.status === status);
  if (query.sort) {
    const sign = query.order === 'desc' ? -1 : 1;
    const key = query.sort as 'code' | 'total';
    rows = [...rows].sort((a, b) => (a[key] > b[key] ? sign : a[key] < b[key] ? -sign : 0));
  }
  const start = query.page * query.size;
  return {
    content: rows.slice(start, start + query.size),
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / query.size),
  };
}

export const wait = (ms = 0) => new Promise((done) => setTimeout(done, ms));

/** DOM helpers over a mounted host. */
export function driver(fixture: ComponentFixture<unknown>) {
  const el = fixture.nativeElement as HTMLElement;

  const api = {
    el,
    rows: () => [...el.querySelectorAll<HTMLTableRowElement>('tbody tr.ngu-tbl-row')],
    /** The text of one column across the rows on screen. */
    column: (index: number) =>
      api.rows().map((row) => row.querySelectorAll('td')[index]?.textContent!.trim()),
    headers: () => [...el.querySelectorAll<HTMLTableCellElement>('thead th')],
    sortButton: (text: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('.ngu-tbl-sort')].find((b) =>
        b.textContent!.includes(text),
      )!,
    search: () => el.querySelector<HTMLInputElement>('.ngu-tbl-search-input')!,
    range: () => el.querySelector('.ngu-tbl-range')?.textContent!.trim(),
    pageButton: (label: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('.ngu-tbl-page')].find(
        (b) => b.getAttribute('aria-label') === label || b.textContent!.trim() === label,
      )!,
    currentPage: () => el.querySelector('.ngu-tbl-page--current')?.textContent!.trim(),
    skeletons: () => el.querySelectorAll('.ngu-tbl-placeholder').length,
    notice: () => el.querySelector<HTMLElement>('.ngu-tbl-notice'),
    button: (text: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent!.trim() === text || b.getAttribute('aria-label') === text,
      ),
    filterPanel: () => el.querySelector<HTMLElement>('.ngu-tbl-filter'),
    filterTrigger: () => el.querySelector<HTMLButtonElement>('[aria-controls$="-filters"]')!,
    dialog: () => el.querySelector<HTMLDialogElement>('.ngu-tbl-dialog')!,
    async click(target: HTMLElement | undefined | null) {
      target!.click();
      await fixture.whenStable();
    },
    /** Types into the search box and waits out the debounce. */
    async type(text: string, debounce = 400) {
      const box = api.search();
      box.value = text;
      box.dispatchEvent(new Event('input'));
      await wait(debounce + 20);
      await fixture.whenStable();
    },
    async key(target: HTMLElement, key: string) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      await fixture.whenStable();
      return event;
    },
  };

  return api;
}

/** Answers every request at once, for tests that don't care about the server. */
export function instant<T>(rows: readonly T[]) {
  return (query: NguTableQuery) => {
    const start = query.page * query.size;
    return of({ content: rows.slice(start, start + query.size), totalElements: rows.length });
  };
}

/**
 * jsdom hides `[popover]` until it is shown but has no `showPopover()`, so nothing in the
 * filter panel could take focus. This stands in for an open popover.
 */
export function showPopovers(): () => void {
  const style = document.createElement('style');
  style.textContent = '[popover] { display: flex !important; }';
  document.head.append(style);
  return () => style.remove();
}
