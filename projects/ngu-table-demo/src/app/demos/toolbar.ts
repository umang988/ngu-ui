import { Component, computed, signal } from '@angular/core';
import { NguTable, type NguTableColumn } from 'ngu-table';
import { someOrders, type Order } from './fake-server';

interface Entry {
  id: number;
  text: string;
}

@Component({
  selector: 'demo-table-toolbar',
  imports: [NguTable],
  template: `
    <div class="tb-demo">
      <ngu-table
        [rows]="rows()"
        [columns]="columns"
        mode="client"
        [filterActive]="mine()"
        showAdd
        addLabel="New order"
        showImport
        showExport
        exportFileName="orders"
        searchPlaceholder="Search orders…"
        ariaLabel="Orders"
        (addClick)="log('addClick')"
        (fileSelected)="log('fileSelected: ' + $event.name)"
        (exported)="log('exported: ' + $event.length + ' rows')"
        (searchChange)="log('searchChange: “' + $event + '”')"
        (cleared)="mine.set(false); log('cleared')"
      >
        <!-- Your own control, placed in the toolbar after the search box. -->
        <label nguTableToolbar class="tb-check">
          <input type="checkbox" [checked]="mine()" (change)="mine.set(!mine())" />
          Only Asha's orders
        </label>
      </ngu-table>
      <ol class="tb-log" aria-label="Events, newest first">
        @for (entry of entries(); track entry.id) {
          <li>
            <code>{{ entry.text }}</code>
          </li>
        } @empty {
          <li class="tb-log__empty">Search, export, import a file or press New order.</li>
        }
      </ol>
    </div>
  `,
})
export class TableToolbarDemo {
  private readonly orders = someOrders(120);
  readonly mine = signal(false);
  readonly rows = computed(() =>
    this.mine() ? this.orders.filter((o) => o.owner === 'Asha Rao') : this.orders,
  );
  readonly entries = signal<Entry[]>([]);
  private nextId = 0;

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'owner', header: 'Owner', type: 'avatar' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];

  protected log(text: string): void {
    this.entries.update((list) => [{ id: this.nextId++, text }, ...list].slice(0, 6));
  }
}
