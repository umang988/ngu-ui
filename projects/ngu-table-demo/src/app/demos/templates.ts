import { Component, signal } from '@angular/core';
import { NguTable, NguTableCell, NguTableRowActions, type NguTableColumn } from 'ngu-table';
import { someOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-templates',
  imports: [NguTable, NguTableCell, NguTableRowActions],
  template: `
    <div class="tb-demo">
      <ngu-table [rows]="orders" [columns]="columns" mode="client" ariaLabel="Orders">
        <!-- Two lines in one cell: the name, and the city under it. -->
        <ng-template nguTableCell="customer.name" let-name let-row="row">
          <span class="tb-two-line">
            {{ name }}
            <small>{{ row.customer.city }}</small>
          </span>
        </ng-template>

        <!-- Extra buttons after view, edit and delete. -->
        <ng-template nguTableRowActions let-row>
          <button type="button" class="tb-action" (click)="copied.set(row.code)">Copy code</button>
        </ng-template>
      </ngu-table>
      <p class="tb-note" role="status">
        {{ copied() ? 'Copied ' + copied() : 'Press Copy code on a row.' }}
      </p>
    </div>
  `,
})
export class TableTemplatesDemo {
  readonly orders = someOrders(60);
  readonly copied = signal('');

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    // `template: true` draws this column with the nguTableCell template of the same field.
    { field: 'customer.name', header: 'Customer', template: true, exportField: 'customer.name' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];
}
