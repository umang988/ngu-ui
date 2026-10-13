import { Component, signal } from '@angular/core';
import { NguTable, type NguTableColumn, type NguTableLinkEvent } from 'ngu-table';
import { someOrders, type Order } from './fake-server';

interface Entry {
  id: number;
  text: string;
}

@Component({
  selector: 'demo-table-actions',
  imports: [NguTable],
  template: `
    <div class="tb-demo">
      <ngu-table
        [rows]="orders()"
        [columns]="columns"
        mode="client"
        showView
        showEdit
        showDelete
        rowClickable
        [canEdit]="editable"
        [canDelete]="deletable"
        deleteMessage="The order and its lines will be removed."
        ariaLabel="Orders"
        (rowClick)="log('rowClick', $event)"
        (viewRow)="log('viewRow', $event)"
        (editRow)="log('editRow', $event)"
        (deleteRow)="remove($event)"
        (linkClick)="link($event)"
      />
      <ol class="tb-log" aria-label="Events, newest first">
        @for (entry of entries(); track entry.id) {
          <li>
            <code>{{ entry.text }}</code>
          </li>
        } @empty {
          <li class="tb-log__empty">
            Click a row, a customer link or a button. Only drafts can be deleted.
          </li>
        }
      </ol>
    </div>
  `,
})
export class TableActionsDemo {
  readonly orders = signal(someOrders(30));
  readonly entries = signal<Entry[]>([]);
  private nextId = 0;

  /** Rows say in their own terms why they are exempt. */
  readonly editable = (o: Order) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED';
  readonly deletable = (o: Order) => o.status === 'DRAFT';

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer', type: 'link' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];

  protected remove(order: Order): void {
    this.orders.update((list) => list.filter((o) => o.id !== order.id));
    this.log('deleteRow', order);
  }

  protected link(event: NguTableLinkEvent<Order>): void {
    this.log(`linkClick (${event.column.field})`, event.row);
  }

  protected log(name: string, order: Order): void {
    const text = `${name}: ${order.code}`;
    this.entries.update((list) => [{ id: this.nextId++, text }, ...list].slice(0, 6));
  }
}
