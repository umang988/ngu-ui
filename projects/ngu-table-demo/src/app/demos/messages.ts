import { Component, computed, signal } from '@angular/core';
import {
  NguTable,
  provideNguTableConfig,
  type NguTableColumn,
  type NguTableMessages,
} from 'ngu-table';
import { someOrders, type Order } from './fake-server';

type Lang = 'en' | 'de';

const n = (value: number) => value.toLocaleString('de-DE');

/** The app's language; in an app this lives in your language service. */
const lang = signal<Lang>('en');

const GERMAN: Partial<NguTableMessages> = {
  searchPlaceholder: 'Suchen…',
  clearSearch: 'Suche leeren',
  clear: 'Zurücksetzen',
  export: 'Exportieren',
  actions: 'Aktionen',
  view: 'Ansehen',
  edit: 'Bearbeiten',
  delete: 'Löschen',
  cancel: 'Abbrechen',
  deleteTitle: 'Diesen Eintrag löschen?',
  deleteMessage: 'Der Eintrag wird entfernt. Das kann nicht rückgängig gemacht werden.',
  emptyTitle: 'Nichts gefunden',
  emptyMessage: 'Keine Einträge passen zu Ihrer Suche.',
  yes: 'Ja',
  no: 'Nein',
  range: (first, last, total) => `${n(first)}–${n(last)} von ${n(total)}`,
  noRecords: 'Keine Einträge',
  pageSize: (size) => `${n(size)} pro Seite`,
  rowsPerPage: 'Zeilen pro Seite',
  pagination: 'Seitennavigation',
  firstPage: 'Erste Seite',
  previousPage: 'Vorherige Seite',
  nextPage: 'Nächste Seite',
  lastPage: 'Letzte Seite',
  page: (page) => `Seite ${n(page)}`,
};

@Component({
  selector: 'demo-table-messages',
  imports: [NguTable],
  // A signal of messages switches language live; usually provided in app.config.ts.
  providers: [
    provideNguTableConfig({
      messages: computed(() => (lang() === 'de' ? GERMAN : {})),
    }),
  ],
  template: `
    <div class="tb-demo">
      <div class="tb-switch" role="group" aria-label="Language">
        <button type="button" [attr.aria-pressed]="lang() === 'en'" (click)="lang.set('en')">
          English
        </button>
        <button type="button" [attr.aria-pressed]="lang() === 'de'" (click)="lang.set('de')">
          Deutsch
        </button>
      </div>
      <ngu-table
        [rows]="orders"
        [columns]="columns"
        mode="client"
        showEdit
        showDelete
        showExport
        [ariaLabel]="lang() === 'de' ? 'Bestellungen' : 'Orders'"
      />
    </div>
  `,
})
export class TableMessagesDemo {
  readonly lang = lang;
  readonly orders = someOrders(45);

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'paid', header: 'Paid', type: 'boolean' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];
}
