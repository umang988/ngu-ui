import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { driver, ORDERS, type Order } from '../testing/helpers';
import { NguTable } from './table';
import type { NguTableColumn, NguTableSort } from './types';

const COLUMNS: NguTableColumn<Order>[] = [
  { field: 'code', header: 'Code' },
  { field: 'customer.name', header: 'Customer' },
  { field: 'total', header: 'Total', type: 'currency', currencyCode: 'USD' },
  { field: 'status', header: 'Status', type: 'badge' },
  { field: 'id', header: 'Id', hidden: true },
];

@Component({
  selector: 'test-client-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguTable],
  template: `
    <ngu-table
      [rows]="rows()"
      [columns]="columns"
      [mode]="mode()"
      [pagination]="pagination()"
      [totalRows]="totalRows()"
      [loading]="loading()"
      [(page)]="page"
      [(pageSize)]="pageSize"
      [(sort)]="sort"
      [searchDebounce]="0"
      showExport
      exportFileName="orders"
      (exported)="exported.push($event)"
      (searchChange)="searches.push($event)"
    />
  `,
})
class ClientHost {
  readonly rows = signal<readonly Order[]>(ORDERS);
  readonly columns = COLUMNS;
  readonly mode = signal<'client' | 'server'>('client');
  readonly pagination = signal<'pages' | 'none'>('pages');
  readonly totalRows = signal(0);
  readonly loading = signal(false);
  readonly page = signal(0);
  readonly pageSize = signal(10);
  readonly sort = signal<NguTableSort | null>(null);
  readonly exported: Order[][] = [];
  readonly searches: string[] = [];
}

async function mount(setup?: (host: ClientHost) => void) {
  const fixture = TestBed.createComponent(ClientHost);
  setup?.(fixture.componentInstance);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, ...driver(fixture) };
}

describe('NguTable in client mode', () => {
  it('pages the rows itself and leaves hidden columns out', async () => {
    const t = await mount();

    expect(t.rows()).toHaveLength(10);
    expect(t.headers().map((th) => th.textContent!.trim())).toEqual([
      'Code',
      'Customer',
      'Total',
      'Status',
    ]);
    expect(t.range()).toBe('Showing 1–10 of 57');

    await t.click(t.pageButton('Page 2'));
    expect(t.column(0)[0]).toBe('ORD-011');
  });

  it('searches every visible column, nested paths included, ignoring case', async () => {
    const t = await mount();
    await t.type('sona', 0);

    expect(t.range()).toBe('Showing 1–10 of 28');
    expect(new Set(t.column(1))).toEqual(new Set(['Sona Foods']));
    expect(t.host.searches).toEqual(['sona']);
  });

  it('sorts numbers by size and text with digits as numbers', async () => {
    const t = await mount((host) =>
      host.rows.set([
        { ...ORDERS[0], code: 'A-10', total: 900 },
        { ...ORDERS[1], code: 'A-9', total: 50 },
        { ...ORDERS[2], code: 'A-100', total: 7000 },
      ]),
    );

    await t.click(t.sortButton('Code'));
    expect(t.column(0)).toEqual(['A-9', 'A-10', 'A-100']);
    expect(t.host.sort()).toEqual({ field: 'code', direction: 'asc' });

    await t.click(t.sortButton('Total'));
    await t.click(t.sortButton('Total'));
    expect(t.column(2)).toEqual(['$7,000.00', '$900.00', '$50.00']);
  });

  it('changes the page size from the picker and starts again at page 0', async () => {
    const t = await mount();
    await t.click(t.pageButton('Page 3'));

    const picker = t.el.querySelector<HTMLSelectElement>('.ngu-tbl-page-size')!;
    expect([...picker.options].map((o) => o.textContent!.trim())).toEqual([
      '10 / page',
      '25 / page',
      '50 / page',
      '100 / page',
    ]);

    picker.value = '25';
    picker.dispatchEvent(new Event('change'));
    await t.fixture.whenStable();

    expect(t.host.pageSize()).toBe(25);
    expect(t.host.page()).toBe(0);
    expect(t.rows()).toHaveLength(25);
  });

  it('offers a page size that is not one of the choices', async () => {
    const t = await mount((host) => host.pageSize.set(20));
    const picker = t.el.querySelector<HTMLSelectElement>('.ngu-tbl-page-size')!;

    expect([...picker.options].map((o) => o.value)).toEqual(['10', '20', '25', '50', '100']);
    expect(picker.value).toBe('20');
  });

  it('shows every row and no pager without pagination', async () => {
    const t = await mount((host) => host.pagination.set('none'));

    expect(t.rows()).toHaveLength(57);
    expect(t.el.querySelector('.ngu-tbl-footer')).toBeNull();
  });

  it('clamps the page when the rows shrink', async () => {
    const t = await mount();
    await t.click(t.pageButton('Last page'));
    expect(t.host.page()).toBe(5);

    t.host.rows.set(ORDERS.slice(0, 15));
    await t.fixture.whenStable();

    expect(t.host.page()).toBe(1);
    expect(t.rows()).toHaveLength(5);
  });

  it('shows the empty notice with no rows', async () => {
    const t = await mount((host) => host.rows.set([]));

    expect(t.notice()!.textContent).toContain('Nothing to show');
    expect(t.range()).toBe('No records');
    expect(t.button('Export')!.disabled).toBe(true);
  });

  it('exports every matching row as CSV with headings and formatting', async () => {
    const blobs: Blob[] = [];
    const created = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return 'blob:orders';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this);
    });

    const t = await mount((host) =>
      host.rows.set([
        { ...ORDERS[0], customer: { name: 'Shah, "Best" Rice' } },
        ...ORDERS.slice(1, 12),
      ]),
    );
    await t.click(t.button('Export'));

    expect(created).toHaveBeenCalledOnce();
    expect(clicks[0].download).toBe('orders.csv');
    const text = await blobs[0].text();
    const lines = text.replace(/^\uFEFF/, '').split('\r\n');
    expect(lines[0]).toBe('Code,Customer,Total,Status');
    expect(lines[1]).toBe('ORD-001,"Shah, ""Best"" Rice",$100.00,PENDING');
    // Every row, not just the page on screen.
    expect(lines).toHaveLength(13);
    expect(t.host.exported[0]).toHaveLength(12);

    vi.restoreAllMocks();
  });
});

describe('NguTable in server mode', () => {
  it('shows the rows as given, with the total it is told', async () => {
    const t = await mount((host) => {
      host.mode.set('server');
      host.rows.set(ORDERS.slice(10, 20));
      host.totalRows.set(240);
      host.page.set(1);
    });

    expect(t.rows()).toHaveLength(10);
    expect(t.column(0)[0]).toBe('ORD-011');
    expect(t.range()).toBe('Showing 11–20 of 240');
  });

  it('does not sort or search the rows itself; it reports through the models', async () => {
    const t = await mount((host) => {
      host.mode.set('server');
      host.rows.set(ORDERS.slice(0, 10));
      host.totalRows.set(57);
    });

    await t.click(t.sortButton('Total'));
    await t.click(t.sortButton('Total'));
    expect(t.host.sort()).toEqual({ field: 'total', direction: 'desc' });
    expect(t.column(0)[0]).toBe('ORD-001');

    await t.type('basmati', 0);
    expect(t.host.searches).toEqual(['basmati']);
    expect(t.rows()).toHaveLength(10);
  });

  it('shows skeletons while [loading] with no rows', async () => {
    const t = await mount((host) => {
      host.mode.set('server');
      host.rows.set([]);
      host.loading.set(true);
    });

    expect(t.skeletons()).toBe(5);
    expect(t.notice()).toBeNull();
  });
});
