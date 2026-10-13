import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { driver, FakeServer, showPopovers } from '../testing/helpers';
import { NguTable } from './table';
import type { NguTableColumn } from './types';

const COLUMNS: NguTableColumn[] = [
  { field: 'code', header: 'Code' },
  { field: 'status', header: 'Status', type: 'badge' },
];

@Component({
  selector: 'test-filter-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguTable],
  template: `
    <ngu-table
      [fetchFn]="server.load"
      [columns]="columns"
      [filters]="{ status: status() }"
      [searchDebounce]="0"
      showFilter
      showImport
      showAdd
      addLabel="New order"
      (filtersApplied)="applied.push($event)"
      (filtersCleared)="clearedFilters = clearedFilters + 1"
      (cleared)="cleared = cleared + 1"
      (fileSelected)="files.push($event)"
      (addClick)="adds = adds + 1"
    >
      <div nguTableTabs class="tabs">
        <button type="button" (click)="tab('CANCELLED')">Cancelled</button>
      </div>
      <button nguTableToolbar type="button" class="own-control">Mine</button>
      <div nguTableFilters class="inner-scroller">
        <select aria-label="Status" (change)="status.set($any($event.target).value)">
          <option value="">Any</option>
          <option value="ACTIVE">Active</option>
        </select>
      </div>
    </ngu-table>
    <button type="button" class="outside">Outside</button>
  `,
})
class FilterHost {
  readonly server = new FakeServer();
  readonly columns = COLUMNS;
  readonly status = signal('');
  readonly applied: Record<string, unknown>[] = [];
  readonly files: File[] = [];
  clearedFilters = 0;
  cleared = 0;
  adds = 0;
  readonly table = viewChild.required(NguTable);

  /** A tab that acts at once: writes its own state and commits it in the same click. */
  tab(status: string): void {
    this.status.set(status);
    this.table().commitFilters({ status });
  }
}

async function mount() {
  const fixture = TestBed.createComponent(FilterHost);
  await fixture.whenStable();
  const t = { fixture, host: fixture.componentInstance, ...driver(fixture) };
  return {
    ...t,
    async open() {
      await t.click(t.filterTrigger());
      expect(t.filterPanel()).not.toBeNull();
    },
    async pick(value: string) {
      const select = t.filterPanel()!.querySelector('select')!;
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    },
  };
}

describe('NguTable filter panel', () => {
  it('opens next to its trigger with the projected filters, and says so', async () => {
    const t = await mount();
    const trigger = t.filterTrigger();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    await t.open();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(t.filterPanel()!.id).toBe(trigger.getAttribute('aria-controls'));
    expect(t.filterPanel()!.getAttribute('popover')).toBe('manual');
    expect(t.filterPanel()!.querySelector('select')).not.toBeNull();
    // Right after the trigger, so Tab goes from the button into the panel.
    expect(trigger.nextElementSibling).toBe(t.filterPanel());
  });

  it('puts the filters into the query on Apply, not as they change', async () => {
    const t = await mount();
    await t.open();
    await t.pick('ACTIVE');
    expect(t.host.server.queries).toHaveLength(1);

    await t.click(t.button('Apply'));

    expect(t.filterPanel()).toBeNull();
    expect(t.host.server.last.filters).toEqual({ status: 'ACTIVE' });
    expect(t.host.server.last.page).toBe(0);
    expect(t.host.applied).toEqual([{ status: 'ACTIVE' }]);
    // Applied filters mark the button.
    expect(t.filterTrigger().classList).toContain('ngu-tbl-btn--primary');
  });

  it("empties the applied filters on the panel's Clear and tells the screen", async () => {
    const t = await mount();
    await t.open();
    await t.pick('ACTIVE');
    await t.click(t.button('Apply'));

    await t.open();
    await t.click(t.filterPanel()!.querySelector<HTMLButtonElement>('.ngu-tbl-filter-foot button'));

    expect(t.host.server.last.filters).toEqual({});
    expect(t.host.clearedFilters).toBe(1);
    expect(t.filterTrigger().classList).not.toContain('ngu-tbl-btn--primary');
  });

  it('commits a model passed to commitFilters() at once, in one request', async () => {
    const t = await mount();
    await t.click(t.button('Cancelled'));

    expect(t.host.server.queries).toHaveLength(2);
    expect(t.host.server.last.filters).toEqual({ status: 'CANCELLED' });
  });

  it('stays open for clicks inside, and closes for a click outside', async () => {
    const t = await mount();
    await t.open();

    await t.click(t.filterPanel()!.querySelector<HTMLElement>('.ngu-tbl-filter-body'));
    expect(t.filterPanel()).not.toBeNull();

    await t.click(t.el.querySelector<HTMLElement>('.outside'));
    expect(t.filterPanel()).toBeNull();
  });

  it('stays open when the clicked element is removed by its own click', async () => {
    const t = await mount();
    await t.open();
    const body = t.filterPanel()!.querySelector('.ngu-tbl-filter-body')!;
    const option = document.createElement('button');
    option.addEventListener('click', () => option.remove());
    body.append(option);

    await t.click(option);

    expect(t.filterPanel()).not.toBeNull();
  });

  it('toggles from its trigger', async () => {
    const t = await mount();
    await t.open();
    await t.click(t.filterTrigger());

    expect(t.filterPanel()).toBeNull();
  });

  it('closes on Escape and puts focus back on the trigger', async () => {
    const restore = showPopovers();
    const t = await mount();
    await t.open();
    const select = t.filterPanel()!.querySelector('select')!;
    select.focus();

    await t.key(select, 'Escape');

    expect(t.filterPanel()).toBeNull();
    expect(document.activeElement).toBe(t.filterTrigger());
    restore();
  });

  it('leaves Escape to a control inside that handled it', async () => {
    const t = await mount();
    await t.open();
    const select = t.filterPanel()!.querySelector('select')!;
    select.addEventListener('keydown', (event) => event.preventDefault());

    await t.key(select, 'Escape');

    expect(t.filterPanel()).not.toBeNull();
  });

  it('stays open when something inside it scrolls, and closes when the page scrolls', async () => {
    const t = await mount();
    await t.open();

    t.filterPanel()!.querySelector('.inner-scroller')!.dispatchEvent(new Event('scroll'));
    await t.fixture.whenStable();
    expect(t.filterPanel()).not.toBeNull();

    document.dispatchEvent(new Event('scroll'));
    await t.fixture.whenStable();
    expect(t.filterPanel()).toBeNull();
  });
});

describe('NguTable toolbar', () => {
  it('projects tabs above the toolbar and controls into it', async () => {
    const t = await mount();
    const card = t.el.querySelector('.ngu-tbl')!;

    expect(card.firstElementChild!.classList).toContain('tabs');
    expect(t.el.querySelector('.ngu-tbl-toolbar .own-control')).not.toBeNull();
  });

  it('offers Clear once something is applied, and resets search, sort and filters in one request', async () => {
    const t = await mount();
    expect(t.button('Clear')).toBeUndefined();

    await t.type('ord', 0);
    await t.click(t.sortButton('Code'));
    await t.click(t.button('Cancelled'));
    const before = t.host.server.queries.length;

    await t.click(t.button('Clear'));

    expect(t.host.server.queries.length).toBe(before + 1);
    expect(t.host.server.last).toMatchObject({ search: '', sort: null, order: null, filters: {} });
    expect(t.search().value).toBe('');
    expect(t.host.cleared).toBe(1);
    expect(t.button('Clear')).toBeUndefined();
  });

  it('empties the search box with its own button', async () => {
    const t = await mount();
    await t.type('ord', 0);

    await t.click(t.button('Clear search'));
    await t.fixture.whenStable();

    expect(t.search().value).toBe('');
  });

  it('hands a picked file over and lets the same file be picked again', async () => {
    const t = await mount();
    const input = t.el.querySelector<HTMLInputElement>('input[type=file]')!;
    const picker = vi.spyOn(input, 'click');

    await t.click(t.button('Import'));
    expect(picker).toHaveBeenCalledOnce();

    const file = new File(['code'], 'orders.csv');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    expect(t.host.files).toEqual([file]);
    expect(input.value).toBe('');
  });

  it('labels the add button and emits on press', async () => {
    const t = await mount();
    await t.click(t.button('New order'));

    expect(t.host.adds).toBe(1);
  });
});

describe('NguTable filterActive', () => {
  @Component({
    selector: 'test-active-host',
    imports: [NguTable],
    template: `
      <ngu-table [fetchFn]="server.load" [columns]="columns" showFilter [filterActive]="active()" />
    `,
  })
  class ActiveHost {
    readonly server = new FakeServer();
    readonly columns = COLUMNS;
    readonly active = signal(false);
    readonly table = viewChild.required(NguTable);
  }

  it('decides how the Filter button looks when bound, whatever is applied', async () => {
    const fixture = TestBed.createComponent(ActiveHost);
    await fixture.whenStable();
    const t = driver(fixture);
    const host = fixture.componentInstance;

    host.table().commitFilters({ status: 'ACTIVE' });
    await fixture.whenStable();
    expect(host.server.last.filters).toEqual({ status: 'ACTIVE' });
    expect(t.filterTrigger().classList).not.toContain('ngu-tbl-btn--primary');

    host.active.set(true);
    await fixture.whenStable();
    expect(t.filterTrigger().classList).toContain('ngu-tbl-btn--primary');
  });
});
