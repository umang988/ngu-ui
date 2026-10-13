import { Component, computed, signal, viewChild } from '@angular/core';
import { NguDropdown } from 'ngu-dropdown';
import { NguTable, type NguTableColumn } from 'ngu-table';
import { loadOrders, REGIONS, type Order, type Region, type Status } from './fake-server';

type Tab = 'all' | 'open' | 'done';

const TABS: { id: Tab; label: string; statuses: Status[] }[] = [
  { id: 'all', label: 'All', statuses: [] },
  { id: 'open', label: 'Open', statuses: ['PENDING', 'ON_HOLD', 'ACTIVE'] },
  { id: 'done', label: 'Delivered', statuses: ['DELIVERED'] },
];

@Component({
  selector: 'demo-table-filters',
  imports: [NguTable, NguDropdown],
  template: `
    <ngu-table
      [fetchFn]="load"
      [columns]="columns"
      [filters]="filters()"
      [filterActive]="panelActive()"
      showFilter
      ariaLabel="Orders"
      (filtersCleared)="region.set(null); paid.set('')"
      (cleared)="resetAll()"
    >
      <!-- A rail above the toolbar: each tab applies at once. -->
      <div nguTableTabs class="tb-tabs" role="group" aria-label="Order state">
        @for (t of tabs; track t.id) {
          <button type="button" [attr.aria-pressed]="tab() === t.id" (click)="pick(t.id)">
            {{ t.label }}
          </button>
        }
      </div>

      <!-- The filter panel: applied with its Apply button. -->
      <div nguTableFilters class="tb-filters">
        <div>
          <label for="filter-region">Region</label>
          <ngu-dropdown
            inputId="filter-region"
            [options]="regions"
            [(value)]="region"
            placeholder="Any region"
          />
        </div>
        <div>
          <label for="filter-paid">Payment</label>
          <select id="filter-paid" [value]="paid()" (change)="paid.set($any($event.target).value)">
            <option value="">Any</option>
            <option value="yes">Paid</option>
            <option value="no">Not paid</option>
          </select>
        </div>
      </div>
    </ngu-table>
  `,
})
export class TableFiltersDemo {
  readonly load = loadOrders;
  readonly tabs = TABS;
  readonly regions = REGIONS;
  private readonly table = viewChild.required(NguTable);

  readonly tab = signal<Tab>('all');
  readonly region = signal<Region | null>(null);
  readonly paid = signal<'' | 'yes' | 'no'>('');

  /** The whole filter model, copied into the query on Apply. */
  readonly filters = computed(() => ({
    status: TABS.find((t) => t.id === this.tab())!.statuses,
    region: this.region(),
    paid: this.paid() === '' ? null : this.paid() === 'yes',
  }));

  /** The Filter button counts the panel's own filters, not the tab. */
  readonly panelActive = computed(() => this.region() !== null || this.paid() !== '');

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'region', header: 'Region' },
    { field: 'paid', header: 'Paid', type: 'boolean' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];

  /** A tab applies at once: the new model is passed in, since [filters] still holds the old one. */
  protected pick(tab: Tab): void {
    this.tab.set(tab);
    this.table().commitFilters(this.filters());
  }

  protected resetAll(): void {
    this.tab.set('all');
    this.region.set(null);
    this.paid.set('');
  }
}
