import { Component, signal } from '@angular/core';
import { NguTable, type NguTableColumn, type NguTableQuery } from 'ngu-table';
import { loadManyOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-virtual-fetch',
  imports: [NguTable],
  template: `
    <div class="tb-demo">
      <ngu-table
        [fetchFn]="load"
        [columns]="columns"
        pagination="virtual"
        [pageSize]="50"
        maxHeight="26rem"
        ariaLabel="Orders"
        (queryChange)="asked($event)"
      />
      <p class="tb-note">
        Pages asked for: <code>{{ pages().join(', ') }}</code>
      </p>
    </div>
  `,
})
export class TableVirtualFetchDemo {
  /** A class field, so the table sees the same function on every check. */
  readonly load = loadManyOrders;
  readonly pages = signal<number[]>([]);

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'region', header: 'Region' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];

  protected asked(query: NguTableQuery): void {
    // A new search starts the list over.
    this.pages.update((pages) => (query.page === 0 ? [0] : [...pages.slice(-11), query.page]));
  }
}
