import { ChangeDetectionStrategy, Component, Injectable, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { driver, ORDERS, type Order } from '../testing/helpers';
import { provideNguTableConfig, type NguTableMessages, type NguTableSearchMemory } from './config';
import { NguTable } from './table';
import { NguTableCell, NguTableEmpty, NguTableRowActions } from './templates';
import type { NguTableColumn, NguTableLinkEvent } from './types';

const COLUMNS: NguTableColumn<Order>[] = [
  { field: 'code', header: 'Code', type: 'link' },
  { field: 'customer.name', header: 'Customer', template: true },
  { field: 'status', header: 'Status', type: 'badge' },
];

@Component({
  selector: 'test-rows-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguTable, NguTableCell, NguTableRowActions],
  template: `
    <ngu-table
      [rows]="rows()"
      [columns]="columns"
      mode="client"
      showView
      showEdit
      showDelete
      rowClickable
      [confirmDelete]="confirm()"
      [canDelete]="notCancelled"
      (viewRow)="log.push('view ' + $event.code)"
      (editRow)="log.push('edit ' + $event.code)"
      (deleteRow)="log.push('delete ' + $event.code)"
      (rowClick)="log.push('row ' + $event.code)"
      (linkClick)="link($event)"
    >
      <ng-template nguTableCell="customer.name" let-name let-row="row">
        <strong class="who">{{ name }}</strong>
        <button type="button" class="inner" (click)="log.push('inner ' + row.code)">Call</button>
      </ng-template>
      <ng-template nguTableRowActions let-row>
        <button type="button" class="extra" (click)="log.push('extra ' + row.code)">Copy</button>
      </ng-template>
    </ngu-table>
  `,
})
class RowsHost {
  readonly rows = signal<readonly Order[]>(ORDERS.slice(0, 3));
  readonly columns = COLUMNS;
  readonly confirm = signal(true);
  readonly log: string[] = [];
  readonly notCancelled = (row: Order) => row.status !== 'CANCELLED';

  link(event: NguTableLinkEvent<Order>): void {
    this.log.push(`link ${event.row.code} ${event.column.field}`);
  }
}

async function mount(setup?: (host: RowsHost) => void) {
  const fixture = TestBed.createComponent(RowsHost);
  setup?.(fixture.componentInstance);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, ...driver(fixture) };
}

/** jsdom has no modal dialogs; these stand in for the browser's. */
function fakeDialogs(): () => void {
  const proto = HTMLDialogElement.prototype as any;
  const had = { showModal: proto.showModal, close: proto.close };
  proto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  return () => Object.assign(proto, had);
}

describe('NguTable rows', () => {
  let restore: () => void;
  beforeEach(() => (restore = fakeDialogs()));
  afterEach(() => restore());

  it('draws an actions column with view, edit, delete and the extra buttons', async () => {
    const t = await mount();
    const first = t.rows()[0];

    expect(t.headers().at(-1)!.textContent!.trim()).toBe('Actions');
    expect(
      [...first.querySelectorAll('.ngu-tbl-row-actions button')].map(
        (b) => b.textContent!.trim() || b.getAttribute('aria-label'),
      ),
    ).toEqual(['View', 'Edit', 'Delete', 'Copy']);
  });

  it('leaves the delete button out of rows canDelete refuses', async () => {
    const t = await mount();
    // ORDERS[1] is CANCELLED.
    expect(t.rows()[1].querySelector('[aria-label="Delete"]')).toBeNull();
    expect(t.rows()[1].querySelector('[aria-label="Edit"]')).not.toBeNull();
  });

  it('emits view and edit without a row click', async () => {
    const t = await mount();
    await t.click(t.rows()[0].querySelector<HTMLElement>('[aria-label="View"]'));
    await t.click(t.rows()[0].querySelector<HTMLElement>('[aria-label="Edit"]'));
    await t.click(t.rows()[0].querySelector<HTMLElement>('.extra'));

    expect(t.host.log).toEqual(['view ORD-001', 'edit ORD-001', 'extra ORD-001']);
  });

  it('asks before deleting, and deletes on confirm', async () => {
    const t = await mount();
    await t.click(t.rows()[0].querySelector<HTMLElement>('[aria-label="Delete"]'));

    expect(t.dialog().open).toBe(true);
    expect(t.dialog().textContent).toContain('Delete this record?');
    expect(t.host.log).toEqual([]);

    await t.click(t.dialog().querySelector<HTMLElement>('.ngu-tbl-btn--danger'));

    expect(t.host.log).toEqual(['delete ORD-001']);
    expect(t.dialog().open).toBe(false);
  });

  it('deletes nothing on cancel or a backdrop click', async () => {
    const t = await mount();
    await t.click(t.rows()[0].querySelector<HTMLElement>('[aria-label="Delete"]'));
    await t.click(t.button('Cancel'));
    expect(t.dialog().open).toBe(false);

    await t.click(t.rows()[2].querySelector<HTMLElement>('[aria-label="Delete"]'));
    await t.click(t.dialog());
    expect(t.dialog().open).toBe(false);

    expect(t.host.log).toEqual([]);
  });

  it('puts focus back on the Delete button however the dialog closes', async () => {
    const t = await mount();
    const remove = t.rows()[0].querySelector<HTMLButtonElement>('[aria-label="Delete"]')!;

    await t.click(remove);
    t.button('Cancel')!.focus();
    await t.click(t.button('Cancel'));
    expect(document.activeElement).toBe(remove);

    // Escape: the browser closes the dialog and fires close.
    await t.click(remove);
    t.dialog().close();
    await t.fixture.whenStable();
    expect(document.activeElement).toBe(remove);
    expect(t.host.log).toEqual([]);
  });

  it('deletes at once without confirmDelete', async () => {
    const t = await mount((host) => host.confirm.set(false));
    await t.click(t.rows()[2].querySelector<HTMLElement>('[aria-label="Delete"]'));

    expect(t.host.log).toEqual(['delete ORD-003']);
    expect(t.dialog().open).toBe(false);
  });

  it('opens even where showModal is missing', async () => {
    restore();
    const t = await mount();
    await t.click(t.rows()[0].querySelector<HTMLElement>('[aria-label="Delete"]'));
    expect(t.dialog().hasAttribute('open')).toBe(true);

    await t.click(t.dialog().querySelector<HTMLElement>('.ngu-tbl-btn--danger'));
    expect(t.dialog().hasAttribute('open')).toBe(false);
    expect(t.host.log).toEqual(['delete ORD-001']);
    restore = fakeDialogs();
  });

  it('emits rowClick for a click on the row, and not for its buttons, links or actions column', async () => {
    const t = await mount();
    await t.click(t.rows()[0].querySelector('td'));
    await t.click(t.rows()[0].querySelector<HTMLElement>('.inner'));
    await t.click(t.rows()[0].querySelector<HTMLElement>('.ngu-tbl-link-btn'));
    await t.click(t.rows()[0].querySelector<HTMLElement>('.ngu-tbl-col-actions'));

    expect(t.host.log).toEqual(['row ORD-001', 'inner ORD-001', 'link ORD-001 code']);
  });

  it('makes clickable rows focusable and opens them with Enter', async () => {
    const t = await mount();
    const row = t.rows()[1];
    expect(row.getAttribute('tabindex')).toBe('0');

    await t.key(row, 'Enter');
    await t.key(row.querySelector('.inner') as HTMLElement, 'Enter');

    expect(t.host.log).toEqual(['row ORD-002']);
  });

  it('draws a templated column with its value and row', async () => {
    const t = await mount();
    const cell = t.rows()[0].querySelectorAll('td')[1];

    expect(cell.querySelector('.who')!.textContent).toBe('Basmati Traders');
  });

  it('draws its icons as SVG', async () => {
    const t = await mount();
    const svg = t.el.querySelector('.ngu-tbl-search-icon svg, .ngu-tbl-icon svg')!;

    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.firstElementChild!.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });
});

describe('NguTable text', () => {
  @Component({
    selector: 'test-text-host',
    imports: [NguTable, NguTableEmpty],
    template: `
      <ngu-table [rows]="rows()" [columns]="columns" mode="client" [showSearch]="true">
        @if (custom()) {
          <ng-template nguTableEmpty><span class="mine">No orders yet</span></ng-template>
        }
      </ngu-table>
    `,
  })
  class TextHost {
    readonly rows = signal<readonly Order[]>([]);
    readonly columns = COLUMNS;
    readonly custom = signal(false);
  }

  it('replaces built-in strings from the config, live from a signal, merged across injectors', async () => {
    @Component({
      selector: 'test-nested-host',
      imports: [TextHost],
      providers: [provideNguTableConfig({ messages: { noRecords: 'Keine Einträge' } })],
      template: `<test-text-host />`,
    })
    class NestedHost {}

    const messages = signal<Partial<NguTableMessages>>({ searchPlaceholder: 'Suchen…' });
    TestBed.configureTestingModule({ providers: [provideNguTableConfig({ messages })] });
    const fixture = TestBed.createComponent(NestedHost);
    await fixture.whenStable();
    const t = driver(fixture);

    expect(t.search().placeholder).toBe('Suchen…');
    expect(t.range()).toBe('Keine Einträge');

    messages.set({ searchPlaceholder: 'Rechercher…' });
    await fixture.whenStable();
    expect(t.search().getAttribute('aria-label')).toBe('Rechercher…');
  });

  it('formats the range with the message function', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideNguTableConfig({
          messages: { range: (first, last, total) => `${first}-${last} / ${total}` },
        }),
      ],
    });
    const fixture = TestBed.createComponent(TextHost);
    fixture.componentInstance.rows.set(ORDERS.slice(0, 12));
    await fixture.whenStable();

    expect(driver(fixture).range()).toBe('1-10 / 12');
  });

  it('shows the nguTableEmpty template instead of the empty notice', async () => {
    const fixture = TestBed.createComponent(TextHost);
    fixture.componentInstance.custom.set(true);
    await fixture.whenStable();
    const notice = driver(fixture).notice()!;

    expect(notice.querySelector('.mine')!.textContent).toBe('No orders yet');
    expect(notice.textContent).not.toContain('Nothing to show');
  });
});

describe('NguTable search memory', () => {
  @Component({
    selector: 'test-memory-host',
    imports: [NguTable],
    template: `<ngu-table
      [rows]="rows"
      [columns]="columns"
      mode="client"
      stateKey="orders"
      [searchDebounce]="0"
    />`,
  })
  class MemoryHost {
    readonly rows = ORDERS;
    readonly columns = COLUMNS;
  }

  @Injectable({ providedIn: 'root' })
  class MapMemory implements NguTableSearchMemory {
    readonly terms = new Map<string, string>([['orders', 'ord-05']]);
    recall(key: string): string {
      return this.terms.get(key) ?? '';
    }
    remember(key: string, text: string): void {
      if (text) this.terms.set(key, text);
      else this.terms.delete(key);
    }
  }

  it('restores the search from an injected memory and keeps it up to date', async () => {
    TestBed.configureTestingModule({
      providers: [provideNguTableConfig({ searchMemory: MapMemory })],
    });
    const fixture = TestBed.createComponent(MemoryHost);
    await fixture.whenStable();
    const t = driver(fixture);

    expect(t.search().value).toBe('ord-05');
    expect(t.rows()).toHaveLength(8);

    await t.type('ord-01', 0);
    expect(TestBed.inject(MapMemory).terms.get('orders')).toBe('ord-01');

    await t.type('', 0);
    expect(TestBed.inject(MapMemory).terms.has('orders')).toBe(false);
  });

  it('takes a plain object too', async () => {
    const saved: string[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideNguTableConfig({
          searchMemory: { recall: () => 'sona', remember: (_key, text) => saved.push(text) },
        }),
      ],
    });
    const fixture = TestBed.createComponent(MemoryHost);
    await fixture.whenStable();

    expect(driver(fixture).search().value).toBe('sona');
    expect(saved).toEqual(['sona']);
  });
});
