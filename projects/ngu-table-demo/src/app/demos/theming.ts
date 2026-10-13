import { Component, signal } from '@angular/core';
import { NguTable, type NguTableColumn } from 'ngu-table';
import { someOrders, type Order } from './fake-server';

@Component({
  selector: 'demo-table-theming',
  imports: [NguTable],
  template: `
    <div class="tb-demo">
      <div class="tb-buttons">
        <label class="tb-check">
          <input type="checkbox" [checked]="themed()" (change)="themed.set(!themed())" />
          Teal theme, square corners
        </label>
        <label class="tb-check">
          <input type="checkbox" [checked]="compact()" (change)="compact.set(!compact())" />
          compact
        </label>
        <label class="tb-check">
          <input type="checkbox" [checked]="striped()" (change)="striped.set(!striped())" />
          striped
        </label>
      </div>
      <ngu-table
        [class.teal]="themed()"
        [rows]="orders"
        [columns]="columns"
        mode="client"
        [compact]="compact()"
        [striped]="striped()"
        showAdd
        ariaLabel="Orders"
      />
    </div>
  `,
  // The table reads CSS variables, so a theme is a few lines on any ancestor.
  styles: `
    .teal {
      --ngu-primary: light-dark(#0f766e, #5eead4);
      --ngu-on-primary: light-dark(#ffffff, #042f2e);
      --ngu-focus-color: light-dark(#0f766e, #5eead4);
      --ngu-radius: 0;
      --ngu-table-head-bg: light-dark(#ccfbf1, #0b302d);
    }
  `,
})
export class TableThemingDemo {
  readonly orders = someOrders(40);
  readonly themed = signal(true);
  readonly compact = signal(false);
  readonly striped = signal(true);

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'owner', header: 'Owner', type: 'avatar' },
    { field: 'fulfilled', header: 'Fulfilled', type: 'progress' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];
}
