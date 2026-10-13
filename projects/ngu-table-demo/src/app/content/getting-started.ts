import type { DocPage } from 'docs-kit/docs/model';

/** Demos against the fake server show its source as a second tab. */
export const FAKE = ['fake-server.ts'];

export const PAGES: Record<string, DocPage> = {
  introduction: {
    title: 'Introduction',
    description:
      'ngu-table is a data table for Angular list screens. You write one `fetchFn` and a list of columns; the table handles paging, search, sorting, filters, loading states, typed cells, row actions and CSV export.',
    sections: [
      {
        id: 'server',
        title: 'A list from your server',
        text: [
          'Bind `fetchFn` to a method that loads one page. The table asks for page 0, then asks again whenever the page, page size, search, sort or applied filters change. These 5,000 orders come from a pretend server that answers after 350 ms: page through them, sort a column, search for "harbor".',
        ],
        demo: {
          src: 'basic.ts',
          load: () => import('../demos/basic').then((m) => m.TableBasicDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'sources',
        title: 'Three ways to give it rows',
        text: ['The table works out where its rows come from by what you bind:'],
        table: {
          caption: 'Data sources',
          columns: ['Bind', 'Mode', 'Who searches, sorts and pages'],
          rows: [
            [
              '`[fetchFn]`',
              'Fetch',
              'Your server. The table owns the query and asks again when it changes.',
            ],
            [
              '`[rows]` and `mode="client"`',
              'Client',
              'The table, in the browser. For lists you already hold.',
            ],
            [
              '`[rows]` alone',
              'Server',
              'Your component, through `[(page)]`, `[(sort)]` and `(searchChange)`. For a store or your own loading.',
            ],
          ],
        },
        after: ['More in [Server data](/server-data) and [Rows in hand](/rows-in-hand).'],
      },
      {
        id: 'what',
        title: 'What a list screen gets',
        list: [
          'A toolbar: a debounced search box, a Clear button once anything is applied, a filter panel, and Add, Import and CSV Export buttons when you turn them on.',
          'Columns by type: dates, currency, numbers, percentages, status badges, booleans, avatars, images, email and phone links, progress bars, or your own template.',
          'Row actions: View, Edit and Delete buttons with a confirmation dialog, per-row rules for which rows allow them, and room for your own buttons.',
          'A pager with a page window, rows per page, and a range such as "Showing 11–20 of 5,000".',
          'Loading skeletons for the first page, dimmed rows while the next one loads, an empty notice and an error notice with Try again.',
          'Every string replaceable, and a look that follows CSS variables shared with ngu-form and ngu-dropdown.',
        ],
      },
      {
        id: 'next',
        title: 'Next steps',
        list: [
          '[Install it](/installation) in an Angular 22.2 app.',
          'Connect [your API](/server-data) or pass [rows you already have](/rows-in-hand).',
          'Describe your [columns](/columns), or draw cells with [templates](/templates).',
          'Turn on the [toolbar](/toolbar), [filters](/filters) and [row actions](/row-actions).',
          'Change the [text](/messages) and the [colors](/theming).',
        ],
      },
    ],
  },

  installation: {
    title: 'Installation',
    description: 'Add ngu-table to an Angular CLI project.',
    sections: [
      {
        id: 'download',
        title: 'Download',
        text: ['ngu-table has no runtime dependencies besides Angular.'],
        code: [{ code: 'npm install ngu-table', lang: 'bash' }],
      },
      {
        id: 'requirements',
        title: 'Requirements',
        table: {
          caption: 'Required packages',
          columns: ['Package', 'Version'],
          rows: [
            ['`@angular/core`, `@angular/common`', '22.2 or newer'],
            ['RxJS', 'Optional: `fetchFn` may return a Promise instead'],
          ],
        },
        after: [
          'The component is standalone, works with zoneless change detection, and renders on the server: with server-side rendering the first page is in the HTML.',
        ],
      },
      {
        id: 'import',
        title: 'Import',
        text: [
          'Import `NguTable` where you use it, describe the columns, and give it a method that loads one page. Keep the method a class field, not an arrow written in the template.',
        ],
        code: [
          {
            filename: 'orders.ts',
            code: `import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NguTable, type NguTableColumn, type NguTablePage, type NguTableQuery } from 'ngu-table';

@Component({
  selector: 'app-orders',
  imports: [NguTable],
  template: \`
    <ngu-table [fetchFn]="loadOrders" [columns]="columns" showEdit (editRow)="edit($event)" />
  \`,
})
export class Orders {
  private readonly http = inject(HttpClient);

  readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'placed', header: 'Placed', type: 'date' },
    { field: 'total', header: 'Total', type: 'currency' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];

  readonly loadOrders = (q: NguTableQuery) =>
    this.http.get<NguTablePage<Order>>('/api/orders', {
      params: {
        page: q.page,
        size: q.size,
        search: q.search,
        ...(q.sort ? { sort: \`\${q.sort},\${q.order}\` } : {}),
      },
    });

  edit(order: Order) {
    // open your edit screen
  }
}`,
          },
        ],
      },
      {
        id: 'defaults',
        title: 'App-wide defaults',
        text: [
          'Page size, date formats, the currency, status words and every built-in string can be set once for the whole app. Nested providers merge, so a route can change one setting and keep the rest.',
        ],
        code: [
          {
            filename: 'app.config.ts',
            code: `import { provideNguTableConfig } from 'ngu-table';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNguTableConfig({
      pageSize: 25,
      currencyCode: 'INR',
      dateFormat: 'dd/MM/yyyy',
      badgeTones: { AWAITING_PICKUP: 'info' },
    }),
  ],
};`,
          },
        ],
        after: ['Every option is listed in [Config and types](/api/types).'],
      },
      {
        id: 'family',
        title: 'With ngu-form and ngu-dropdown',
        text: [
          "ngu-table reads the same `--ngu-*` CSS variables as [ngu-form](https://ngu-form.netlify.app) and [ngu-dropdown](https://ngu-dropdown.netlify.app), so one theme styles all three, and its `NguTableQuery` has the same fields as ngu-dropdown's, so one service method can feed a table and a picker. Each package works without the others.",
        ],
      },
    ],
  },

  changelog: {
    title: 'Changelog',
    description: 'What changed in each release.',
    sections: [{ id: 'releases', title: 'Releases', markdown: 'CHANGELOG.md' }],
  },
};
