import { Component, signal } from '@angular/core';
import { NguTable, type NguTableColumn, type NguTableSort } from 'ngu-table';
import { loadOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-paging',
  imports: [NguTable],
  template: `
    <div class="tb-demo">
      <div class="tb-buttons">
        <button type="button" (click)="page.set(9)">Go to page 10</button>
        <button type="button" (click)="sort.set({ field: 'total', direction: 'desc' })">
          Largest first
        </button>
        <button type="button" (click)="page.set(9999)">Go past the end</button>
      </div>
      <ngu-table
        [fetchFn]="load"
        [columns]="columns"
        [(page)]="page"
        [(pageSize)]="size"
        [(sort)]="sort"
        [pageSizeOptions]="[5, 10, 20]"
        maxHeight="22rem"
        compact
        ariaLabel="Orders"
      />
      <p class="tb-note">
        <code>page = {{ page() }}, pageSize = {{ size() }}, sort = {{ describe(sort()) }}</code>
      </p>
    </div>
  `,
})
export class TablePagingDemo {
  readonly load = loadOrders;
  readonly page = signal(0);
  readonly size = signal(20);
  readonly sort = signal<NguTableSort | null>(null);

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'placed', header: 'Placed', type: 'date' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    // Sorted by a different key on the server than the one shown.
    { field: 'status', header: 'Status', type: 'badge', sortField: 'status' },
  ];

  protected describe(sort: NguTableSort | null): string {
    return sort ? `${sort.field} ${sort.direction}` : 'null';
  }
}
