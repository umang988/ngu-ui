import type { ComponentFixture } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import type { NguDropdownPage, NguDropdownQuery } from '../lib/types';

export interface Row {
  id: number;
  name: string;
}

export const TOTAL = 10_000;
export const SIZE = 50;
export const ROW_HEIGHT = 36;
export const PANEL_HEIGHT = 288;

/** Records what the dropdown asked for, and answers out of a 10,000-row table. */
export class FakeServer {
  readonly queries: NguDropdownQuery[] = [];
  readonly signals: AbortSignal[] = [];

  /** While set, requests are accepted and never answered. */
  hold = false;

  /** While set, requests fail. */
  fail = false;

  readonly load = (
    query: NguDropdownQuery,
    context?: { signal: AbortSignal },
  ): Observable<NguDropdownPage<Row>> => {
    this.queries.push(query);
    if (context) this.signals.push(context.signal);
    if (this.hold) return new Subject<NguDropdownPage<Row>>();
    if (this.fail) return throwError(() => new Error('the connection dropped'));

    return of(page(query));
  };

  get pagesAsked(): number[] {
    return this.queries.map((q) => q.page);
  }
}

/** A search narrows the set to a tenth, so a search visibly resizes the list. */
export function page(query: NguDropdownQuery): NguDropdownPage<Row> {
  const start = query.page * query.size;
  const matched = query.search ? TOTAL / 10 : TOTAL;
  const content = Array.from(
    { length: Math.max(0, Math.min(query.size, matched - start)) },
    (_, i) => ({
      id: start + i,
      name: `Row ${start + i}`,
    }),
  );
  return { content, totalElements: matched };
}

/**
 * jsdom hides `[popover]` until it is shown but has no `showPopover()`, so nothing in the
 * panel could take focus. This stands in for an open popover.
 */
export function showPopovers(): () => void {
  const style = document.createElement('style');
  style.textContent = '[popover] { display: flex !important; }';
  document.head.append(style);
  return () => style.remove();
}

/** DOM helpers over a mounted host. */
export function driver(fixture: ComponentFixture<unknown>) {
  const el = fixture.nativeElement as HTMLElement;

  const api = {
    el,
    trigger: () => el.querySelector<HTMLButtonElement>('.ngu-dd-trigger')!,
    root: () => el.querySelector<HTMLElement>('ngu-dropdown')!,
    list: () => el.querySelector<HTMLElement>('.ngu-dd-list'),
    panel: () => el.querySelector<HTMLElement>('.ngu-dd-panel'),
    options: () => [
      ...el.querySelectorAll<HTMLElement>('.ngu-dd-option:not(.ngu-dd-option--loading)'),
    ],
    labels: () => api.options().map((o) => o.textContent!.trim()),
    loading: () => [...el.querySelectorAll<HTMLElement>('.ngu-dd-option--loading')],
    spacer: () => el.querySelector<HTMLElement>('.ngu-dd-spacer'),
    search: () => el.querySelector<HTMLInputElement>('.ngu-dd-search input'),
    notice: () => el.querySelector<HTMLElement>('.ngu-dd-notice'),
    retry: () => el.querySelector<HTMLButtonElement>('.ngu-dd-notice button'),
    clear: () => el.querySelector<HTMLButtonElement>('.ngu-dd-clear'),
    async open() {
      api.trigger().click();
      await fixture.whenStable();
    },
    /** Types into the search box and waits out the debounce. */
    async type(term: string) {
      const box = api.search()!;
      box.value = term;
      box.dispatchEvent(new Event('input'));
      await new Promise((done) => setTimeout(done, 400));
      await fixture.whenStable();
    },
    /** jsdom has no layout, so the scroll is faked the way a browser reports it. */
    async scrollTo(px: number) {
      const list = api.list()!;
      Object.defineProperty(list, 'scrollTop', { value: px, writable: true, configurable: true });
      list.dispatchEvent(new Event('scroll'));
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

/** jsdom has no layout: place the field where the test needs it. */
export function placeField(el: HTMLElement, top: number, height = 36): void {
  const field = el.querySelector('.ngu-dd-field')!;
  field.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + height,
      left: 100,
      right: 340,
      width: 240,
      height,
      x: 100,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}
