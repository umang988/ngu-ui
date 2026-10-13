import { Component } from '@angular/core';
import { NguTable, type NguTableColumn } from 'ngu-table';
import { someOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-client',
  imports: [NguTable],
  template: `
    <ngu-table
      [rows]="orders"
      [columns]="columns"
      mode="client"
      showExport
      exportFileName="orders"
      ariaLabel="Orders"
    />
  `,
})
export class TableClientDemo {
  /** 500 rows already in hand: searched, sorted and paged in the browser. */
  readonly orders = someOrders(500);

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'customer.city', header: 'City' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];
}
