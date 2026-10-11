# ngu-dropdown

An Angular select that pages through your server as people scroll and search. You write
one `fetchFn`; the dropdown handles paging, search, loading states and a virtual list, so
no component has to write that logic again.

- **Server paging with an honest scrollbar.** The scrollbar is sized to the server's total
  from the first response. Dragging it to the middle of 50,000 rows asks for that one page,
  not every page before it.
- **Bounded memory.** At most twelve pages are kept, and only about fifteen rows are in
  the DOM, however long the list.
- **Cancels stale requests.** A new search, filter or sort unsubscribes (or aborts) what is
  in flight and starts from page 0. Late answers are dropped.
- **Names saved ids.** `lookupFn` loads the rows behind ids an edit form loaded, so the
  field shows a name instead of `4821`.
- **Works with every form API**: Signal Forms `[formField]`, reactive forms, `ngModel`
  and plain `[(value)]`.
- **Accessible.** The ARIA combobox pattern, full keyboard support, `aria-setsize` on
  virtual rows, forced colors and reduced motion.

## Install

```sh
npm install ngu-dropdown
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/forms` 22.2 or newer.
No other dependencies.

## Quick start

```ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NguDropdown, type NguDropdownPage, type NguDropdownQuery } from 'ngu-dropdown';

@Component({
  selector: 'app-customer-picker',
  imports: [NguDropdown],
  template: `
    <label for="customer">Customer</label>
    <ngu-dropdown
      inputId="customer"
      [fetchFn]="loadCustomers"
      [(value)]="customerId"
      optionValue="id"
      optionLabel="name"
    />
  `,
})
export class CustomerPicker {
  private readonly http = inject(HttpClient);
  readonly customerId = signal<number | null>(null);

  // A class field: the dropdown watches whether fetchFn is bound, not which function it is.
  readonly loadCustomers = (q: NguDropdownQuery) =>
    this.http.get<NguDropdownPage<Customer>>('/api/customers', {
      params: { page: q.page, size: q.size, search: q.search },
    });
}
```

`fetchFn` receives `{ page, size, search, sort, order, filters }` and returns an Observable
or a Promise of `{ content, totalElements }`, which is what a Spring Data `Page` serializes
to. A second argument carries an `AbortSignal` for `fetch()`.

Without `fetchFn`, `[options]` is a list already in hand, searched in the browser
(ignoring case and accents) and still virtualized:

```html
<ngu-dropdown [options]="countries" [(value)]="country" />
```

`optionValue` and `optionLabel` default to `value` and `label`. A row without the path is
its own value and label, so a `string[]` needs neither.

Both are dot paths, so nested fields work: `optionLabel="employee.name"`. For a label built
from several fields, pass a function. The label is what the field and chips show, what a
client list is searched by and what screen readers announce:

```ts
readonly skuLabel = (sku: Sku) => `${sku.skuCode} - ${sku.description}`;
```

```html
<ngu-dropdown [options]="skus" optionValue="skuCode" [optionLabel]="skuLabel" />
```

## Filters

Anything else the request depends on goes in `[filters]`. A change reloads from page 0, and
the object is compared by value, so an inline literal is fine:

```html
<ngu-dropdown [fetchFn]="loadCustomers" [filters]="{ region: region() }" />
```

Read it from `query.filters` in `fetchFn`. Do not read the signal inside `fetchFn`
directly: the dropdown cannot see that change, and keeps showing the old rows.

## Saved ids

```html
<ngu-dropdown
  [fetchFn]="loadCustomers"
  [lookupFn]="findCustomers"
  formControlName="customerId"
  optionValue="id"
  optionLabel="name"
/>
```

`lookupFn(keys, { signal })` runs for keys nothing has named, without opening the list,
once per key. If the record you loaded already has the row, pass `[selectedOption]` instead.

## Forms

```html
<ngu-dropdown [formField]="order.customerId" ... />
<!-- Signal Forms -->
<ngu-dropdown formControlName="customerId" ... />
<!-- reactive forms -->
<ngu-dropdown [(ngModel)]="customerId" ... />
<!-- template-driven -->
```

Disabled, read-only and required states follow the form. The invalid style shows once the
control is invalid and touched; set `[errorShown]` for your own timing.

## Templates

```html
<ngu-dropdown [fetchFn]="loadCustomers" [(value)]="id" [optionHeight]="52">
  <ng-template nguDropdownOption let-c>
    <span>{{ c.name }}</span><small>{{ c.city }}</small>
  </ng-template>
  <ng-template nguDropdownSelection let-c>{{ c.name }}</ng-template>
</ngu-dropdown>
```

Rows are positioned by `optionHeight`, so raise it for rows taller than one line.

## Configuration and text

```ts
providers: [
  provideNguDropdownConfig({
    optionValue: 'id',
    optionLabel: 'name',
    pageSize: 50,
    messages: { placeholder: 'Choose…', count: (n) => `${n} results` },
  }),
];
```

Nested providers merge, and `messages` can be a signal for a live language switch.

## Theming

The dropdown reads the same CSS variables as [ngu-form](https://www.npmjs.com/package/ngu-form):
`--ngu-border-color`, `--ngu-radius`, `--ngu-input-bg`, `--ngu-surface`, `--ngu-primary`,
`--ngu-focus-color`, `--ngu-hint-color`, `--ngu-error-color`, `--ngu-option-hover`,
`--ngu-option-selected-bg` and `--ngu-dropdown-shadow`. Styles are not encapsulated and
every class starts with `ngu-dd-`, so a global stylesheet can restyle anything.

The panel opens in the browser's top layer (the popover API), so no `overflow: hidden`
card or transformed ancestor can clip it.

## Keyboard

| Key                       | Action                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| Down, Up, Enter, Space    | Open the list from the field                                       |
| Down / Up                 | Move the active row; scrolling loads its page                      |
| Page Down / Page Up       | Move a screenful                                                   |
| Enter                     | Pick the active row                                                |
| Escape                    | Close this list only, not a dialog around it                       |
| Home, End, Space, letters | Without a search box: first, last, pick, and jump by first letters |

## License

MIT
