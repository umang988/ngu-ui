import { Component, signal, viewChild } from '@angular/core';
import { NguTable, type NguTableColumn, type NguTableQuery } from 'ngu-table';
import { failOrders, loadOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-states',
  imports: [NguTable],
  template: `
    <div class="tb-demo">
      <div class="tb-buttons">
        <label class="tb-check">
          <input type="checkbox" [checked]="down()" (change)="down.set(!down())" />
          The server is down
        </label>
        <button type="button" (click)="table().reload()">reload()</button>
      </div>
      <ngu-table
        [fetchFn]="load"
        [columns]="columns"
        ariaLabel="Orders"
        (loadError)="errors.set(errors() + 1)"
      />
      <p class="tb-note">(loadError) fired {{ errors() }} times.</p>
    </div>
  `,
})
export class TableStatesDemo {
  readonly table = viewChild.required(NguTable);
  readonly down = signal(false);
  readonly errors = signal(0);

  /** Reads the switch when it runs, so the next request (a reload, a page) follows it. */
  readonly load = (query: NguTableQuery) => (this.down() ? failOrders() : loadOrders(query));

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];
}
