import { Component } from '@angular/core';
import { NguTable, type NguTableColumn } from 'ngu-table';
import { someOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-column-types',
  imports: [NguTable],
  template: `
    <ngu-table
      [rows]="orders"
      [columns]="columns"
      mode="client"
      [showSearch]="false"
      [pageSizeOptions]="[5, 10]"
      [pageSize]="5"
      ariaLabel="Orders by column type"
    />
  `,
})
export class TableColumnTypesDemo {
  readonly orders = someOrders(40);

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order (link)', type: 'link' },
    { field: 'owner', header: 'Owner (avatar)', type: 'avatar' },
    { field: 'email', header: 'Email', type: 'email' },
    { field: 'phone', header: 'Phone', type: 'phone' },
    { field: 'placed', header: 'Placed (date)', type: 'date' },
    { field: 'total', header: 'Total (currency)', type: 'currency', currencyCode: 'INR' },
    { field: 'fulfilled', header: 'Fulfilled (progress)', type: 'progress' },
    { field: 'paid', header: 'Paid (boolean)', type: 'boolean' },
    { field: 'status', header: 'Status (badge)', type: 'badge' },
  ];
}
