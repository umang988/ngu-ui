import { Component } from '@angular/core';
import { NguTable, NguTableEmpty, type NguTableColumn } from 'ngu-table';

interface Invoice {
  id: number;
  number: string;
}

@Component({
  selector: 'demo-table-empty',
  imports: [NguTable, NguTableEmpty],
  template: `
    <ngu-table [rows]="invoices" [columns]="columns" mode="client" showAdd addLabel="New invoice">
      <ng-template nguTableEmpty>
        <p class="tb-empty-title">No invoices yet</p>
        <p class="tb-note">Invoices you raise appear here. Start with New invoice.</p>
      </ng-template>
    </ngu-table>
  `,
})
export class TableEmptyDemo {
  readonly invoices: Invoice[] = [];
  readonly columns: NguTableColumn<Invoice>[] = [{ field: 'number', header: 'Invoice' }];
}
