import { Component } from '@angular/core';
import { NguTable, type NguTableColumn } from 'ngu-table';
import { manyOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-virtual-client',
  imports: [NguTable],
  template: `
    <ngu-table
      [rows]="orders"
      [columns]="columns"
      mode="client"
      pagination="virtual"
      maxHeight="26rem"
      striped
      ariaLabel="Orders"
    />
  `,
})
export class TableVirtualClientDemo {
  /** 50,000 rows in hand; only the thirty or so in view are in the DOM. */
  readonly orders = manyOrders();

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'owner', header: 'Owner', type: 'avatar' },
    { field: 'placed', header: 'Placed', type: 'date' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];
}
