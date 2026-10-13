# ngu-table

An Angular data table for admin list screens. Describe the columns and write one `fetchFn`
that loads a page; search, filters, sorting, paging, loading states, typed cells, row actions
and CSV export are done, the same way on every list in your app.

**Docs and live demos: [ngu-table.netlify.app](https://ngu-table.netlify.app)**

- **One method, a whole screen.** `fetchFn` receives page, size, search, sort and filters and
  returns an Observable or a Promise of `{ content, totalElements }`, which is what a Spring
  Data `Page` serializes to.
- **No stale answers.** A new search, sort or filter cancels the request in flight. Rows stay
  put, dimmed, while the next page loads; skeleton rows only before the first.
- **Columns that know their type.** Dates, currency (with per-currency grouping such as rupees
  in lakhs), numbers, percentages, status badges with colors that mean something, booleans,
  avatars, images, email and phone links, progress bars, or your own template.
- **The admin chrome built in.** A debounced search box, a filter panel applied with one
  button, tabs that apply at once, Add, Import and CSV Export buttons, and View, Edit and
  Delete in each row with per-row rules and a native confirmation dialog.
- **Rows from anywhere.** Your server through `fetchFn`, rows in hand searched and paged in the
  browser, or rows your component pages itself.
- **Virtual scrolling.** `pagination="virtual"` scrolls through the whole list and draws only the
  rows in view; with `fetchFn` it asks only for the pages under the scroll position.
- **Accessible.** Sort buttons with `aria-sort`, announced page changes, named icon buttons,
  keyboard-reachable rows, a modal dialog that returns focus, forced colors and reduced motion.
- **Server-side rendering.** On the server the first page is fetched before the HTML is sent.

## Install

```sh
npm install ngu-table
```

Peer dependencies: `@angular/core` and `@angular/common` 22.2 or newer. No other dependencies.

## Quick start

```ts
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NguTable, type NguTableColumn, type NguTablePage, type NguTableQuery } from 'ngu-table';

@Component({
  selector: 'app-orders',
  imports: [NguTable],
  template: `
    <ngu-table
      [fetchFn]="loadOrders"
      [columns]="columns"
      showAdd
      showEdit
      showDelete
      showExport
      (addClick)="create()"
      (editRow)="edit($event)"
      (deleteRow)="remove($event)"
    />
  `,
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

  // A class field: the table watches whether fetchFn is bound, not which function it is.
  readonly loadOrders = (q: NguTableQuery) =>
    this.http.get<NguTablePage<Order>>('/api/orders', {
      params: {
        page: q.page,
        size: q.size,
        search: q.search,
        ...(q.sort ? { sort: `${q.sort},${q.order}` } : {}),
      },
    });
}
```

Rows you already have are searched, sorted and paged in the browser:

```html
<ngu-table [rows]="orders" mode="client" [columns]="columns" />
```

App-wide defaults (page size, date formats, currency, status words, every built-in string)
go in one provider:

```ts
provideNguTableConfig({
  pageSize: 25,
  currencyCode: 'INR',
  badgeTones: { AWAITING_PICKUP: 'info' },
});
```

## Theming

The table reads the same `--ngu-*` CSS variables as
[ngu-form](https://ngu-form.netlify.app) and [ngu-dropdown](https://ngu-dropdown.netlify.app),
and picks light or dark defaults from the page's `color-scheme`. Every class starts with
`ngu-tbl-`, so styles can be overridden without `::ng-deep`.

## License

MIT
