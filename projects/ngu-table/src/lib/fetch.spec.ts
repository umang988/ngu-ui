import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { answer, driver, FakeServer, wait, type Order } from '../testing/helpers';
import { provideNguTableConfig } from './config';
import { NguTable } from './table';
import type { NguTableColumn, NguTableFetchContext, NguTableQuery } from './types';

const COLUMNS: NguTableColumn<Order>[] = [
  { field: 'code', header: 'Code' },
  { field: 'customer.name', header: 'Customer', sortable: false },
  { field: 'total', header: 'Total', type: 'number' },
];

@Component({
  selector: 'test-fetch-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguTable],
  template: `
    <ngu-table
      [fetchFn]="server.load"
      [columns]="columns"
      [(page)]="page"
      [searchMinLength]="minLength()"
      (queryChange)="queries.push($event)"
      (loadError)="errors.push($event)"
    />
  `,
})
class FetchHost {
  readonly server = new FakeServer();
  readonly columns = COLUMNS;
  readonly page = signal(0);
  readonly minLength = signal<number | undefined>(undefined);
  readonly queries: NguTableQuery[] = [];
  readonly errors: unknown[] = [];
  readonly table = viewChild.required(NguTable);
}

async function mount(setup?: (host: FetchHost) => void) {
  const fixture = TestBed.createComponent(FetchHost);
  setup?.(fixture.componentInstance);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, ...driver(fixture) };
}

describe('NguTable with fetchFn', () => {
  it('asks for the first page and shows it', async () => {
    const t = await mount();

    expect(t.host.server.queries).toEqual([
      { page: 0, size: 10, search: '', sort: null, order: null, filters: {} },
    ]);
    expect(t.rows()).toHaveLength(10);
    expect(t.column(0)[0]).toBe('ORD-001');
    expect(t.column(1)[0]).toBe('Basmati Traders');
    expect(t.range()).toBe('Showing 1–10 of 57');
  });

  it('shows skeleton rows until the first page arrives', async () => {
    const t = await mount((host) => (host.server.hold = true));

    expect(t.skeletons()).toBe(5);
    expect(t.rows()).toHaveLength(0);
    expect(t.notice()).toBeNull();
    expect(t.el.querySelector('tbody')!.getAttribute('aria-busy')).toBe('true');
  });

  it('keeps the rows, dimmed, while the next page loads', async () => {
    const t = await mount();
    t.host.server.hold = true;
    await t.click(t.pageButton('Next page'));

    expect(t.rows()).toHaveLength(10);
    expect(t.skeletons()).toBe(0);
    expect(t.el.querySelector('.ngu-tbl-wrap--refreshing')).not.toBeNull();
  });

  it('pages, with a window of page numbers and the last page short', async () => {
    const t = await mount();
    expect(t.currentPage()).toBe('1');

    await t.click(t.pageButton('Last page'));
    expect(t.host.server.last.page).toBe(5);
    expect(t.host.page()).toBe(5);
    expect(t.rows()).toHaveLength(7);
    expect(t.range()).toBe('Showing 51–57 of 57');
    expect(t.pageButton('Next page').disabled).toBe(true);

    await t.click(t.pageButton('Page 3'));
    expect(t.host.server.last.page).toBe(2);
    expect(t.currentPage()).toBe('3');
    expect(t.pageButton('Page 3').getAttribute('aria-current')).toBe('page');
  });

  it('sorts by a heading, flips on the second press and goes back to page 0', async () => {
    const t = await mount();
    await t.click(t.pageButton('Next page'));

    await t.click(t.sortButton('Total'));
    expect(t.host.server.last).toMatchObject({ page: 0, sort: 'total', order: 'asc' });
    expect(t.headers()[2].getAttribute('aria-sort')).toBe('ascending');

    await t.click(t.sortButton('Total'));
    expect(t.host.server.last).toMatchObject({ sort: 'total', order: 'desc' });
    expect(t.column(0)[0]).toBe('ORD-057');
    expect(t.headers()[2].getAttribute('aria-sort')).toBe('descending');
  });

  it('gives an unsortable column no button and no aria-sort', async () => {
    const t = await mount();
    const customer = t.headers()[1];

    expect(customer.querySelector('button')).toBeNull();
    expect(customer.hasAttribute('aria-sort')).toBe(false);
    expect(t.headers()[0].getAttribute('aria-sort')).toBe('none');
  });

  it('searches once typing settles, from page 0', async () => {
    const t = await mount();
    await t.click(t.pageButton('Next page'));
    const before = t.host.server.queries.length;

    await t.type('ord-05');

    expect(t.host.server.queries.length).toBe(before + 1);
    expect(t.host.server.last).toMatchObject({ page: 0, search: 'ord-05' });
    expect(t.rows()).toHaveLength(8);
  });

  it('does not search below the minimum length, but does search an emptied box', async () => {
    const t = await mount((host) => host.minLength.set(2));
    await t.type('o');
    expect(t.host.server.queries).toHaveLength(1);

    await t.type('or');
    expect(t.host.server.last.search).toBe('or');

    await t.type('');
    expect(t.host.server.last.search).toBe('');
  });

  it('runs the same query again on reload()', async () => {
    const t = await mount();
    t.host.table().reload();
    await t.fixture.whenStable();

    expect(t.host.server.queries).toHaveLength(2);
    expect(t.host.server.queries[1]).toEqual(t.host.server.queries[0]);
    // A reload is the same query, so (queryChange) stays quiet.
    expect(t.host.queries).toHaveLength(1);
  });

  it('shows an error notice with a retry that asks again', async () => {
    const t = await mount((host) => (host.server.fail = true));

    expect(t.notice()!.getAttribute('role')).toBe('alert');
    expect(t.notice()!.textContent).toContain('Could not load this list');
    expect(t.host.errors).toHaveLength(1);

    t.host.server.fail = false;
    await t.click(t.button('Try again'));

    expect(t.rows()).toHaveLength(10);
    expect(t.notice()).toBeNull();
  });

  it('cancels the request in flight when the query changes', async () => {
    const t = await mount((host) => (host.server.hold = true));
    const first = t.host.server.signals[0];

    await t.click(t.sortButton('Code'));

    expect(first.aborted).toBe(true);
    expect(t.host.server.signals[1].aborted).toBe(false);
  });

  it('opens a deep link on its page, and clamps one past the end once the total is known', async () => {
    const deep = await mount((host) => host.page.set(3));
    expect(deep.host.server.queries[0].page).toBe(3);
    expect(deep.currentPage()).toBe('4');

    TestBed.resetTestingModule();
    const past = await mount((host) => host.page.set(9));
    await past.fixture.whenStable();
    expect(past.host.page()).toBe(5);
    expect(past.host.server.last.page).toBe(5);
  });

  it('emits every query change', async () => {
    const t = await mount();
    await t.click(t.pageButton('Next page'));

    expect(t.host.queries.map((q) => q.page)).toEqual([0, 1]);
  });

  it('takes a Promise and passes an AbortSignal', async () => {
    @Component({
      selector: 'test-promise-host',
      imports: [NguTable],
      template: `<ngu-table [fetchFn]="load" [columns]="columns" />`,
    })
    class PromiseHost {
      readonly columns = COLUMNS;
      readonly signals: AbortSignal[] = [];
      readonly load = (query: NguTableQuery, { signal }: NguTableFetchContext) => {
        this.signals.push(signal);
        return Promise.resolve(answer(query));
      };
    }

    const fixture = TestBed.createComponent(PromiseHost);
    await fixture.whenStable();
    await wait();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('tbody tr.ngu-tbl-row')).toHaveLength(10);
    expect(fixture.componentInstance.signals[0]).toBeInstanceOf(AbortSignal);
  });

  it('works out the page count from totalElements when totalPages is missing', async () => {
    @Component({
      selector: 'test-total-host',
      imports: [NguTable],
      template: `<ngu-table [fetchFn]="load" [columns]="columns" />`,
    })
    class TotalHost {
      readonly columns = COLUMNS;
      readonly load = (query: NguTableQuery) => {
        const { content, totalElements } = answer(query);
        return Promise.resolve({ content, totalElements });
      };
    }

    const fixture = TestBed.createComponent(TotalHost);
    await fixture.whenStable();
    await wait();
    await fixture.whenStable();
    const t = driver(fixture);

    await t.click(t.pageButton('Last page'));
    await wait();
    await fixture.whenStable();

    expect(t.currentPage()).toBe('6');
    expect(t.pageButton('Page 7')).toBeUndefined();
  });

  it('takes its page size from the config', async () => {
    TestBed.configureTestingModule({ providers: [provideNguTableConfig({ pageSize: 25 })] });
    const t = await mount();

    expect(t.host.server.last.size).toBe(25);
    expect(t.el.querySelector<HTMLSelectElement>('.ngu-tbl-page-size')!.value).toBe('25');
  });
});
