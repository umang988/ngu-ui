import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { driver, wait } from '../testing/helpers';
import { NguTable } from './table';
import type { NguTableColumn, NguTablePage, NguTableQuery } from './types';
import { furthestPages, pageSpan, virtualWindow } from './virtual';

interface Line {
  id: number;
  code: string;
}

const line = (i: number): Line => ({ id: i, code: `L-${String(i).padStart(5, '0')}` });
const LINES: readonly Line[] = Array.from({ length: 10_000 }, (_, i) => line(i));
const COLUMNS: NguTableColumn<Line>[] = [
  { field: 'code', header: 'Code' },
  { field: 'id', header: 'Id', type: 'number' },
];

/*
 * jsdom has no layout: the scroller reads as 0px tall, so the table assumes 600px, and rows
 * as 42px. 600 / 42 = 15 rows in view, plus 6 above and 6 below: 27, drawn as indices
 * first..first+27.
 */
const ROW = 42;
const DRAWN = 28;

/** Scrolls the table's scroller the way a browser reports it. */
async function scrollTo(
  fixture: { nativeElement: HTMLElement; whenStable(): Promise<unknown> },
  px: number,
) {
  const box = fixture.nativeElement.querySelector<HTMLElement>('.ngu-tbl-wrap')!;
  Object.defineProperty(box, 'scrollTop', { value: px, writable: true, configurable: true });
  box.dispatchEvent(new Event('scroll'));
  await fixture.whenStable();
}

const indices = (rows: HTMLElement[]) =>
  rows.map((r) => Number(r.getAttribute('aria-rowindex')) - 2);
const spacers = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLElement>('.ngu-tbl-spacer td')].map((td) => td.style.height);

describe('virtual window arithmetic', () => {
  it('draws the rows in view plus the overscan, and spaces for the rest', () => {
    expect(virtualWindow(0, 600, 10_000, 42, 6)).toEqual({
      first: 0,
      last: 27,
      before: 0,
      after: (10_000 - 28) * 42,
    });
    const deep = virtualWindow(5000 * 42, 600, 10_000, 42, 6);
    expect(deep.first).toBe(4994);
    expect(deep.last).toBe(5021);
    expect(deep.before).toBe(4994 * 42);
  });

  it('draws the last rows for a position past the end, and nothing for an empty list', () => {
    const past = virtualWindow(99_999_999, 600, 100, 42, 6);
    expect(past.last).toBe(99);
    expect(past.after).toBe(0);
    expect(virtualWindow(0, 600, 0, 42, 6).last).toBe(-1);
  });

  it('finds the pages a window touches and the pages to drop', () => {
    expect(pageSpan(4994, 5021, 50)).toEqual({ from: 99, to: 100 });
    expect(pageSpan(0, 27, 50)).toEqual({ from: 0, to: 0 });
    expect(furthestPages([0, 1, 2, 50, 51], 50, 3)).toEqual([0, 1]);
    expect(furthestPages([0, 1], 0, 3)).toEqual([]);
  });
});

@Component({
  selector: 'test-virtual-rows',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguTable],
  template: `
    <ngu-table
      [rows]="rows()"
      [columns]="columns"
      [mode]="mode()"
      pagination="virtual"
      [rowHeight]="rowHeight()"
      [searchDebounce]="0"
      striped
    />
  `,
})
class RowsHost {
  readonly rows = signal<readonly Line[]>(LINES);
  readonly mode = signal<'client' | 'server'>('client');
  readonly rowHeight = signal<number | undefined>(undefined);
  readonly columns = COLUMNS;
}

async function mountRows(setup?: (host: RowsHost) => void) {
  const fixture = TestBed.createComponent(RowsHost);
  setup?.(fixture.componentInstance);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, ...driver(fixture) };
}

describe('NguTable virtual rows in hand', () => {
  it('draws only the rows in view, and tells screen readers the whole count', async () => {
    const t = await mountRows();

    expect(t.rows()).toHaveLength(DRAWN);
    expect(t.el.querySelector('table')!.getAttribute('aria-rowcount')).toBe('10001');
    expect(t.el.querySelector('thead tr')!.getAttribute('aria-rowindex')).toBe('1');
    expect(indices(t.rows()).slice(0, 3)).toEqual([0, 1, 2]);
    expect(spacers(t.el)).toEqual([`${(10_000 - DRAWN) * ROW}px`]);
  });

  it('shows the size of the list instead of a pager', async () => {
    const t = await mountRows();

    expect(t.range()).toBe('10,000 rows');
    expect(t.el.querySelector('.ngu-tbl-pager')).toBeNull();
    expect(t.el.querySelector('.ngu-tbl-page-size')).toBeNull();
    // A scroller with a default height, which the browser must not re-anchor.
    const box = t.el.querySelector<HTMLElement>('.ngu-tbl-wrap')!;
    expect(box.style.maxHeight).toBe('32rem');
    expect(box.classList).toContain('ngu-tbl-wrap--virtual');
  });

  it('draws the rows under the scroll position, with space above and below', async () => {
    const t = await mountRows();
    await scrollTo(t.fixture, 5000 * ROW);

    const drawn = indices(t.rows());
    expect(drawn[0]).toBe(4994);
    expect(drawn).toHaveLength(DRAWN);
    expect(t.column(0)[0]).toBe('L-04994');
    expect(spacers(t.el)).toEqual([`${4994 * ROW}px`, `${(10_000 - 5022) * ROW}px`]);
  });

  it('stripes by the place in the list, not in the DOM', async () => {
    const t = await mountRows();
    await scrollTo(t.fixture, 5001 * ROW);

    for (const row of t.rows()) {
      const index = Number(row.getAttribute('aria-rowindex')) - 2;
      expect(row.classList.contains('ngu-tbl-row--alt'), `row ${index}`).toBe(index % 2 === 1);
    }
  });

  it('goes back to the top for a new search, which it runs over the whole list', async () => {
    const t = await mountRows();
    await scrollTo(t.fixture, 5000 * ROW);

    await t.type('L-0999', 0);

    expect(t.el.querySelector<HTMLElement>('.ngu-tbl-wrap')!.scrollTop).toBe(0);
    expect(t.range()).toBe('10 rows');
    expect(t.column(0)).toEqual(LINES.slice(9990).map((l) => l.code));
    expect(spacers(t.el)).toEqual([]);
  });

  it('sizes the columns for the longest values in the list with a hidden row of no height', async () => {
    const rows = LINES.map((l) =>
      l.id === 7_000 ? { ...l, code: 'L-07000 (a much longer code)' } : l,
    );
    const t = await mountRows((host) =>
      host.rows.set(rows.filter((l) => l.id % 50 === 0 || l.id < 100)),
    );

    const sizer = t.el.querySelector<HTMLElement>('tbody tr.ngu-tbl-sizer')!;
    expect(sizer.getAttribute('aria-hidden')).toBe('true');
    // Row 7,000 is far below the rows drawn, but in the sample.
    expect(sizer.querySelectorAll('td')[0].textContent!.trim()).toBe(
      'L-07000 (a much longer code)',
    );
    expect(t.rows().some((r) => r.textContent!.includes('much longer'))).toBe(false);
  });

  it('uses a given row height for the rows and the spaces', async () => {
    const t = await mountRows((host) => host.rowHeight.set(60));

    // 600 / 60 = 10 in view, plus 12.
    expect(t.rows()).toHaveLength(23);
    expect(t.rows()[0].style.height).toBe('60px');
    expect(spacers(t.el)).toEqual([`${(10_000 - 23) * 60}px`]);
  });

  it('windows rows its app pages itself, counting what it was given', async () => {
    const t = await mountRows((host) => {
      host.mode.set('server');
      host.rows.set(LINES.slice(0, 1000));
    });

    expect(t.range()).toBe('1,000 rows');
    expect(t.rows()).toHaveLength(DRAWN);
  });
});

/** Answers from 10,000 lines, and can hold or fail requests. */
class BigServer {
  readonly queries: NguTableQuery[] = [];
  readonly signals: AbortSignal[] = [];
  hold = false;
  fail = false;
  private readonly held: { query: NguTableQuery; subject: Subject<NguTablePage<Line>> }[] = [];

  readonly load = (
    query: NguTableQuery,
    { signal }: { signal: AbortSignal },
  ): Observable<NguTablePage<Line>> => {
    this.queries.push(query);
    this.signals.push(signal);
    if (this.fail) return throwError(() => new Error('down'));
    if (this.hold) {
      const subject = new Subject<NguTablePage<Line>>();
      this.held.push({ query, subject });
      return subject;
    }
    return of(answer(query));
  };

  /** Answers every held request. */
  release(): void {
    for (const { query, subject } of this.held.splice(0)) {
      subject.next(answer(query));
      subject.complete();
    }
  }

  get pages(): number[] {
    return this.queries.map((q) => q.page);
  }
}

function answer(query: NguTableQuery): NguTablePage<Line> {
  const rows = query.search
    ? LINES.filter((l) => l.code.toLowerCase().includes(query.search.toLowerCase()))
    : LINES;
  const start = query.page * query.size;
  return { content: rows.slice(start, start + query.size), totalElements: rows.length };
}

@Component({
  selector: 'test-virtual-fetch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguTable],
  template: `
    <ngu-table
      [fetchFn]="server.load"
      [columns]="columns"
      pagination="virtual"
      [pageSize]="50"
      [searchDebounce]="0"
      showExport
      (queryChange)="asked.push($event.page)"
      (loadError)="errors.push($event)"
    />
  `,
})
class FetchHost {
  readonly server = new BigServer();
  readonly columns = COLUMNS;
  readonly asked: number[] = [];
  readonly errors: unknown[] = [];
  readonly table = viewChild.required(NguTable);
}

async function mountFetch(setup?: (host: FetchHost) => void) {
  const fixture = TestBed.createComponent(FetchHost);
  setup?.(fixture.componentInstance);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, ...driver(fixture) };
}

describe('NguTable virtual fetch', () => {
  it('asks for page 0, then sizes the list to the server total', async () => {
    const t = await mountFetch();

    expect(t.host.server.pages).toEqual([0]);
    expect(t.host.server.queries[0]).toMatchObject({ page: 0, size: 50, search: '' });
    expect(t.el.querySelector('table')!.getAttribute('aria-rowcount')).toBe('10001');
    expect(t.rows()).toHaveLength(DRAWN);
    expect(t.range()).toBe('10,000 rows');
    expect(t.host.asked).toEqual([0]);
  });

  it('shows skeleton rows until the first page arrives', async () => {
    const t = await mountFetch((host) => (host.server.hold = true));

    expect(t.skeletons()).toBe(5);
    expect(t.rows()).toHaveLength(0);
  });

  it('asks only for the pages under the scroll position, with placeholders until they arrive', async () => {
    const t = await mountFetch();
    t.host.server.hold = true;

    await scrollTo(t.fixture, 5000 * ROW);

    // Rows 4994 to 5021: pages 99 and 100 of 50, not the 98 before them.
    expect(t.host.server.pages).toEqual([0, 99, 100]);
    const slots = [...t.el.querySelectorAll<HTMLElement>('tbody tr.ngu-tbl-placeholder')];
    expect(slots).toHaveLength(DRAWN);
    expect(indices(slots)[0]).toBe(4994);
    expect(t.rows()).toHaveLength(0);

    t.host.server.release();
    await t.fixture.whenStable();
    expect(t.column(0)[0]).toBe('L-04994');
    expect(t.el.querySelectorAll('tbody tr.ngu-tbl-placeholder')).toHaveLength(0);
  });

  it('asks for each page once', async () => {
    const t = await mountFetch();
    await scrollTo(t.fixture, 100 * ROW);
    await scrollTo(t.fixture, 101 * ROW);
    await scrollTo(t.fixture, 100 * ROW);

    expect(t.host.server.pages).toEqual([0, 1, 2]);
  });

  it('drops pages far from the scroll position, and asks again on the way back', async () => {
    const t = await mountFetch();
    for (let page = 10; page <= 190; page += 10) await scrollTo(t.fixture, page * 50 * ROW);
    const before = t.host.server.pages.filter((p) => p === 0).length;

    await scrollTo(t.fixture, 0);

    expect(t.host.server.pages.filter((p) => p === 0).length).toBe(before + 1);
  });

  it('starts over for a new search: cancels what is in flight and asks for page 0', async () => {
    const t = await mountFetch();
    t.host.server.hold = true;
    await scrollTo(t.fixture, 5000 * ROW);
    const inFlight = t.host.server.signals.slice(-2);

    t.host.server.hold = false;
    await t.type('L-01', 0);

    expect(inFlight.every((s) => s.aborted)).toBe(true);
    expect(t.host.server.queries.at(-1)).toMatchObject({ page: 0, search: 'L-01' });
    expect(t.el.querySelector<HTMLElement>('.ngu-tbl-wrap')!.scrollTop).toBe(0);
    expect(t.range()).toBe('1,000 rows');
  });

  it('keeps its rows when a later page fails, and asks again from the footer', async () => {
    const t = await mountFetch();
    t.host.server.fail = true;
    await scrollTo(t.fixture, 5000 * ROW);

    const alert = t.el.querySelector<HTMLElement>('.ngu-tbl-range--error')!;
    expect(alert.getAttribute('role')).toBe('alert');
    expect(t.host.errors.length).toBeGreaterThan(0);

    t.host.server.fail = false;
    const asked = t.host.server.queries.length;
    await t.click(alert.querySelector('button'));

    expect(t.host.server.pages.slice(asked)).toEqual([99, 100]);
    expect(t.el.querySelector('.ngu-tbl-range--error')).toBeNull();
    expect(t.column(0)[0]).toBe('L-04994');
  });

  it('shows the error notice when the first page fails', async () => {
    const t = await mountFetch((host) => (host.server.fail = true));

    expect(t.notice()!.getAttribute('role')).toBe('alert');
  });

  it('starts over on reload()', async () => {
    const t = await mountFetch();
    await scrollTo(t.fixture, 5000 * ROW);

    t.host.table().reload();
    await t.fixture.whenStable();
    await wait();
    await t.fixture.whenStable();

    expect(t.host.server.pages.slice(-1)).toEqual([0]);
    expect(indices(t.rows())[0]).toBe(0);
  });

  it('exports the rows loaded so far, in order', async () => {
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return 'blob:x';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const t = await mountFetch();
    await scrollTo(t.fixture, 5000 * ROW);
    await t.click(t.button('Export'));

    const lines = (await blobs[0].text()).replace(/^\uFEFF/, '').split('\r\n');
    // The heading, page 0, then pages 99 and 100.
    expect(lines).toHaveLength(1 + 150);
    expect(lines[1]).toBe('L-00000,0');
    expect(lines[51]).toBe('L-04950,"4,950"');
    vi.restoreAllMocks();
  });
});
