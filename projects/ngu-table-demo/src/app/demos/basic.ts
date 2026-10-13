import { Component, signal } from '@angular/core';
import { NguTable, type NguTableColumn, type NguTableQuery } from 'ngu-table';
import { loadOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-basic',
  imports: [NguTable],
  template: `
    <div class="tb-demo">
      <ngu-table
        [fetchFn]="load"
        [columns]="columns"
        ariaLabel="Orders"
        (queryChange)="last.set($event)"
      />
      <p class="tb-note">
        Last request: <code>{{ describe(last()) }}</code>
      </p>
    </div>
  `,
})
export class TableBasicDemo {
  /** A class field, so the table sees the same function on every check. */
  readonly load = loadOrders;

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'placed', header: 'Placed', type: 'date' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];

  readonly last = signal<NguTableQuery | null>(null);

  protected describe(q: NguTableQuery | null): string {
    if (!q) return 'none yet';
    const sort = q.sort ? ` sort=${q.sort},${q.order}` : '';
    return `page=${q.page} size=${q.size} search="${q.search}"${sort}`;
  }
}
