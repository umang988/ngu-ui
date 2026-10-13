import { Component } from '@angular/core';
import { NguTable, provideNguTableConfig, type NguTableColumn } from 'ngu-table';

interface Shipment {
  id: number;
  ref: string;
  status: string;
}

@Component({
  selector: 'demo-table-badges',
  imports: [NguTable],
  // App-wide words go in the config, usually in app.config.ts.
  providers: [provideNguTableConfig({ badgeTones: { AWAITING_PICKUP: 'info' } })],
  template: `
    <ngu-table
      [rows]="shipments"
      [columns]="columns"
      mode="client"
      pagination="none"
      [showSearch]="false"
      ariaLabel="Shipments"
    />
  `,
})
export class TableBadgesDemo {
  readonly shipments: Shipment[] = [
    { id: 1, ref: 'SH-1', status: 'DELIVERED' },
    { id: 2, ref: 'SH-2', status: 'IN_PROGRESS' },
    { id: 3, ref: 'SH-3', status: 'AWAITING_PICKUP' },
    { id: 4, ref: 'SH-4', status: 'RETURNED' },
    { id: 5, ref: 'SH-5', status: 'LOST' },
    { id: 6, ref: 'SH-6', status: 'archived' },
  ];

  readonly columns: NguTableColumn<Shipment>[] = [
    { field: 'ref', header: 'Shipment' },
    { field: 'status', header: 'Built-in words', type: 'badge' },
    {
      field: 'status',
      header: 'This column’s map',
      type: 'badge',
      sortable: false,
      badgeMap: { RETURNED: 'accent', LOST: 'danger' },
    },
  ];
}
