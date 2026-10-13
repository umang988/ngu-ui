ngu-dropdown is one standalone Angular component, `<ngu-dropdown>`: a select that loads rows from a server one page at a time (with search and a virtual-scrolling list), or searches a list you already have. It works with Signal Forms (`[formField]`), reactive forms (`formControlName`, `[formControl]`), `ngModel` and plain signals (`[(value)]`).

**Server mode** (bind `fetchFn`):

```ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NguDropdown, type NguDropdownPage, type NguDropdownQuery } from 'ngu-dropdown';

interface Customer { id: number; name: string }

@Component({
  selector: 'app-customer-picker',
  imports: [NguDropdown],
  template: `
    <label for="customer">Customer</label>
    <ngu-dropdown inputId="customer" [fetchFn]="loadCustomers" [(value)]="customerId" optionValue="id" optionLabel="name" />
  `,
})
export class CustomerPicker {
  private readonly http = inject(HttpClient);
  readonly customerId = signal<number | null>(null);
  // A class field, so the same function is passed on every change detection.
  readonly loadCustomers = (q: NguDropdownQuery) =>
    this.http.get<NguDropdownPage<Customer>>('/api/customers', { params: { page: q.page, size: q.size, search: q.search } });
}
```

**Rules**

1. Pick one data source: `[fetchFn]` for server paging, or `[options]` for rows already in memory (searched in the browser). Never both.
2. `fetchFn(query, { signal })` returns an Observable or a Promise of `{ content, totalElements }` (`totalPages`, `number`, `size` are optional, as Spring Data sends them). `query.page` is zero-based; `query.search` is trimmed and `''` when empty. Pass `signal` to `fetch` so stale requests are cancelled.
3. Define `fetchFn`, `lookupFn` and `optionLabel` functions as class fields (arrow functions), not inline in the template and not as methods that lose `this`.
4. Rows default to `{ value, label }`. For other shapes set `optionValue` and `optionLabel` (dot paths like `employee.id`), or once for the app with `provideNguDropdownConfig({ optionValue: 'id', optionLabel: 'name' })`. `optionLabel` can be `(row) => string` to join fields.
5. The value is the key (`optionValue`), not the row; with `multiple` it is an array of keys. `(selectionChange)` gives the rows.
6. When a form starts with a saved key whose row is not on the first page, give `lookupFn(keys, { signal })` (or `selectedOption`) so the label can show.
7. Label it: `<label for>` plus `inputId`, or `ariaLabel` when there is no visible label.
8. `[filters]` re-queries when it changes; `reload()` drops loaded pages. Style through the `--ngu-*` CSS variables shared with ngu-form, not internal class names.
9. Inside an ngu-form spec, use `type: 'dropdown'` from `ngu-form/dropdown` instead of placing the component by hand.

**Before you say it's done**

1. Build with `npx ng build --configuration development`: zero errors.
2. Open the page, open the dropdown, type a search, scroll to load a second page, and read the browser console and the network requests (`page`, `size`, `search` as your API expects).
