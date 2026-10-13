import { Component, computed, resource, signal } from '@angular/core';
import { NguTable, type NguTableColumn, type NguTableSort } from 'ngu-table';
import { firstValueFrom } from 'rxjs';
import { loadOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-server-mode',
  imports: [NguTable],
  template: `
    <div class="tb-demo">
      <ngu-table
        [rows]="rows()"
        [totalRows]="total()"
        [loading]="orders.isLoading()"
        [columns]="columns"
        [(page)]="page"
        [(pageSize)]="size"
        [(sort)]="sort"
        (searchChange)="search.set($event)"
        ariaLabel="Orders"
      />
      <p class="tb-note">
        Your component's state:
        <code
          >page {{ page() }}, size {{ size() }}, sort {{ sort()?.field ?? 'none' }}
          {{ sort()?.direction ?? '' }}, search "{{ search() }}"</code
        >
      </p>
    </div>
  `,
})
export class TableServerModeDemo {
  readonly page = signal(0);
  readonly size = signal(10);
  readonly sort = signal<NguTableSort | null>(null);
  readonly search = signal('');

  /** Your own loading, here an Angular resource; a store or a service works the same. */
  readonly orders = resource({
    params: () => ({
      page: this.page(),
      size: this.size(),
      search: this.search(),
      sort: this.sort()?.field ?? null,
      order: this.sort()?.direction ?? null,
      filters: {},
    }),
    loader: ({ params }) => firstValueFrom(loadOrders(params)),
  });

  readonly rows = computed(() => (this.orders.hasValue() ? this.orders.value().content : []));
  readonly total = computed(() => (this.orders.hasValue() ? this.orders.value().totalElements : 0));

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];
}
