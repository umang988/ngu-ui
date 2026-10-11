import type { DocPage } from 'docs-kit/docs/model';
import { FAKE } from './getting-started';

export const PAGES: Record<string, DocPage> = {
  'server-data': {
    title: 'Server data',
    description:
      'What `fetchFn` receives and returns, how filters reload the list, and how saved ids get their names.',
    sections: [
      {
        id: 'query',
        title: 'The query',
        text: [
          '`fetchFn` receives a `NguDropdownQuery` and returns an Observable or a Promise of one page. The response needs `content` and `totalElements`, which is what a Spring Data `Page` serializes to.',
        ],
        code: [
          {
            filename: 'customer.service.ts',
            code: `readonly loadCustomers = (q: NguDropdownQuery) =>
  this.http.get<NguDropdownPage<Customer>>('/api/customers', {
    params: {
      page: q.page,
      size: q.size,
      search: q.search,
      ...(q.sort ? { sort: \`\${q.sort},\${q.order ?? 'asc'}\` } : {}),
    },
  });`,
          },
          {
            filename: 'customer-picker.html',
            lang: 'angular-html',
            code: `<ngu-dropdown [fetchFn]="customers.loadCustomers" [(value)]="customerId"
              optionValue="id" optionLabel="name" />`,
          },
        ],
        table: {
          caption: 'NguDropdownQuery fields',
          columns: ['Field', 'Type', 'Description'],
          rows: [
            ['`page`', '`number`', 'Zero-based page index.'],
            ['`size`', '`number`', 'Rows per page: `[pageSize]`, default 50.'],
            ['`search`', '`string`', 'The search term, trimmed; `""` when empty.'],
            [
              '`sort` / `order`',
              "`string | null` / `'asc' | 'desc' | null`",
              '`[sortBy]` and `[sortOrder]`.',
            ],
            ['`filters`', '`Record<string, unknown>`', 'The `[filters]` binding.'],
          ],
        },
      },
      {
        id: 'promise',
        title: 'Promises and fetch',
        text: [
          'A Promise works as well. The second argument carries an `AbortSignal` that is aborted when the answer is no longer needed, so stale `fetch` requests are cancelled.',
        ],
        code: [
          {
            code: `readonly loadCustomers = (q: NguDropdownQuery, { signal }: NguDropdownFetchContext) =>
  fetch(\`/api/customers?page=\${q.page}&size=\${q.size}&search=\${encodeURIComponent(q.search)}\`, { signal })
    .then((response) => response.json() as Promise<NguDropdownPage<Customer>>);`,
          },
        ],
      },
      {
        id: 'filters',
        title: 'Filters and sorting',
        text: [
          'Anything else the request depends on goes in `[filters]`. A change reloads the list from page 0. The object is compared by value, so writing it inline in the template is fine.',
        ],
        demo: {
          src: 'filters.ts',
          load: () => import('../demos/filters').then((m) => m.DropdownFiltersDemo),
          files: FAKE,
        },
        after: [
          'Do not read the filter inside `fetchFn` instead. The dropdown watches only whether `fetchFn` is bound, not which function it is (an arrow in a template is a new function on every check), so it cannot see the filter change and keeps showing the old rows.',
        ],
        code: [
          {
            code: `// Stale after the region changes: the dropdown cannot see this.
load = (q: NguDropdownQuery) => this.api.customers({ ...q, region: this.region() });

// Reloads when the region changes.
// <ngu-dropdown [fetchFn]="load" [filters]="{ region: region() }" />
load = (q: NguDropdownQuery) => this.api.customers({ ...q, region: q.filters['region'] });`,
          },
        ],
      },
      {
        id: 'lookup',
        title: 'Naming saved ids',
        text: [
          'An edit screen loads `customerId: 31337`, which is on no page the list has loaded, so the control would show the bare id. `lookupFn` receives the keys nothing has named and returns their rows; it runs without opening the list, once per key. A row picked from the list, or found on a loaded page, needs no lookup.',
        ],
        demo: {
          src: 'lookup.ts',
          load: () => import('../demos/lookup').then((m) => m.DropdownLookupDemo),
          files: FAKE,
        },
        after: [
          'If the record you loaded already has the row, pass it through `[selectedOption]` instead.',
        ],
      },
      {
        id: 'reload',
        title: 'Reloading and errors',
        text: [
          'After saving something the list shows, call `reload()`: it drops the loaded pages and asks again for what is on screen. A failed request shows a notice with a Try again button and emits `(loadError)`.',
        ],
        code: [
          {
            code: `private readonly customers = viewChild.required(NguDropdown);

async save() {
  await this.api.saveCustomer(this.draft());
  this.customers().reload();
}`,
          },
        ],
      },
    ],
  },

  'static-options': {
    title: 'Static options',
    description:
      'Pass the options yourself with `[options]`. Searching and scrolling then happen in the browser, with the same virtual list as server data.',
    sections: [
      {
        id: 'passing',
        title: 'Passing options',
        text: [
          'Bind `[options]` to an array and leave out `fetchFn`. Strings and numbers are their own value and label. `{ value, label }` items (`NguDropdownItem`) need no configuration. Any other shape names its key with `optionValue` and its label with `optionLabel`, as a [dot path or a function](/selection#labels).',
        ],
        demo: {
          src: 'static-list.ts',
          load: () => import('../demos/static-list').then((m) => m.DropdownStaticListDemo),
        },
        after: [
          'A static list always names its own value: a form that loads `warehouseCode: "WH-PUN"` shows "Pune east" without `lookupFn`.',
        ],
      },
      {
        id: 'client-paging',
        title: 'Searching and paging in the browser',
        text: [
          'Long lists stay fast. The list is virtual, so only the rows in view are in the page however many options there are, and the scrollbar covers them all. The search box appears above eight options (`showSearch` forces it on or off) and filters in the browser, ignoring case and accents, by the label. The footer counts what matches.',
        ],
        demo: {
          src: 'large-list.ts',
          load: () => import('../demos/large-list').then((m) => m.DropdownLargeListDemo),
        },
      },
      {
        id: 'whole-list',
        title: 'A list your API sends whole',
        text: [
          'For a master list the API returns in one response rather than in pages, load it once and pass it to `[options]`. Everything after that happens in the browser, with no request per search.',
        ],
        demo: {
          src: 'whole-list.ts',
          load: () => import('../demos/whole-list').then((m) => m.DropdownWholeListDemo),
          files: FAKE,
        },
        after: [
          'Do not return a whole list from `fetchFn` instead. In server mode the dropdown leaves searching to the server, so a list returned whole would not narrow as people type unless your API filters it by `query.search`.',
        ],
      },
      {
        id: 'which',
        title: 'Static options or fetchFn',
        table: {
          caption: 'When to use which',
          columns: ['Use', 'When'],
          rows: [
            [
              '`[options]`',
              'The list is in hand or small enough to load at once: statuses, units, plants, a few thousand rows.',
            ],
            [
              '`[fetchFn]`',
              'The list is large or grows without limit, such as customers or SKUs, and your API pages and searches it.',
            ],
          ],
        },
      },
    ],
  },

  selection: {
    title: 'Selection',
    description: 'One value or several, static option lists, and options that cannot be picked.',
    sections: [
      {
        id: 'multiple',
        title: 'Several values',
        text: [
          'With `multiple` the value is a list of keys and the panel stays open while people pick. Chosen rows show as chips, the first `maxChips` of them and then "+N more".',
        ],
        demo: {
          src: 'multiple.ts',
          load: () => import('../demos/multiple').then((m) => m.DropdownMultipleDemo),
          files: FAKE,
        },
      },
      {
        id: 'options',
        title: 'Option lists',
        text: [
          '`optionValue` and `optionLabel` are dot paths into each row (default `value` and `label`). A row without the path is its own value and label, so a `string[]` needs neither. `optionDisabled` keeps a row visible but not pickable. `[clearable]="false"` removes the clear button, and `size="sm"` matches small controls.',
        ],
        demo: {
          src: 'options.ts',
          load: () => import('../demos/options').then((m) => m.DropdownOptionsDemo),
        },
      },
      {
        id: 'labels',
        title: 'Labels from nested or several fields',
        text: [
          '`optionValue` and `optionLabel` are dot paths, so `optionLabel="employee.name"` reads a nested field. To show several fields, such as a code and a description, pass a function: `[optionLabel]="skuLabel"` with `skuLabel = (sku: Sku) => sku.skuCode + " - " + sku.description`.',
          'The label is more than what a row shows: it is what the closed field and chips display, what a client list is searched by, what type-ahead matches and what screen readers announce. Type "nut" or "1007" below: both find a row, because both are in the label. A `nguDropdownOption` template can still style the two parts differently.',
        ],
        demo: {
          src: 'labels.ts',
          load: () => import('../demos/labels').then((m) => m.DropdownLabelsDemo),
        },
        after: [
          'In server mode the search goes to `fetchFn` instead, so your API decides which fields a term matches; search both the code and the description there.',
        ],
      },
      {
        id: 'panel',
        title: 'Panel size',
        text: [
          'The panel matches the field\'s width and is at most `panelMaxHeight` (320px) tall. It opens above the field when there is no room below. `panelMinWidth` and `panelMaxWidth` set its width in px; give both the same value to keep pickers in a table the same width. With `optionOverflow="scroll"`, long labels scroll sideways instead of ending in an ellipsis.',
          "The panel is shown in the browser's top layer, so a card with `overflow: hidden` or a transformed ancestor cannot clip it.",
        ],
      },
      {
        id: 'events',
        title: 'Rows as well as keys',
        text: [
          '`value` holds only keys. `(selectionChange)` emits the chosen row, or rows with `multiple`, for screens that need the rest of the record.',
        ],
        code: [
          {
            lang: 'angular-html',
            code: `<ngu-dropdown [fetchFn]="loadCustomers" [(value)]="customerId"
              (selectionChange)="customer.set($event)" />`,
          },
        ],
      },
    ],
  },

  forms: {
    title: 'Forms',
    description: 'The same component works with Signal Forms, reactive forms and ngModel.',
    sections: [
      {
        id: 'signal-forms',
        title: 'Signal Forms',
        text: [
          'Bind it with `[formField]`. Disabled, read-only and required rules reach the dropdown, and the invalid style shows once the field is touched. Here the saved id 4821 is named by `lookupFn`; clear it to see the required message.',
        ],
        demo: {
          src: 'signal-forms.ts',
          load: () => import('../demos/signal-forms').then((m) => m.DropdownSignalFormsDemo),
          files: FAKE,
        },
      },
      {
        id: 'reactive',
        title: 'Reactive forms',
        text: [
          '`formControlName` and `[formControl]` work as with any input. `control.disable()` disables it, and closing the list or tabbing past it marks it touched.',
        ],
        code: [
          {
            code: `readonly order = new FormGroup({
  customerId: new FormControl<number | null>(null, Validators.required),
});`,
          },
          {
            lang: 'angular-html',
            code: `<form [formGroup]="order">
  <label for="customer">Customer</label>
  <ngu-dropdown inputId="customer" formControlName="customerId"
                [fetchFn]="loadCustomers" [lookupFn]="findCustomers"
                optionValue="id" optionLabel="name" />
</form>`,
          },
        ],
      },
      {
        id: 'ng-model',
        title: 'ngModel and plain signals',
        code: [
          {
            lang: 'angular-html',
            code: `<ngu-dropdown [options]="statuses" [(ngModel)]="status" />

<!-- Or without a forms module: -->
<ngu-dropdown [options]="statuses" [(value)]="status" />`,
          },
        ],
      },
      {
        id: 'errors',
        title: 'When the invalid style shows',
        text: [
          'By default, once the control is invalid and touched. A form with its own timing, such as one that shows errors only after submit, sets `[errorShown]` instead. Point `describedBy` at your error text so screen readers read it with the control.',
        ],
      },
      {
        id: 'drafts',
        title: 'Restored drafts',
        text: [
          'If your app restores unsaved forms, the restored ids need names too. A `rowMemory` remembers the row behind each picked key per form control, and the dropdown asks it before anything else.',
        ],
        code: [
          {
            code: `provideNguDropdownConfig({
  rowMemory: {
    remember: (control, key, row) => drafts.rememberRow(control.path?.join('.'), key, row),
    recall: (control, key) => drafts.recallRow(control.path?.join('.'), key),
  },
});`,
          },
        ],
      },
    ],
  },

  templates: {
    title: 'Templates',
    description: 'Render rows and the chosen value your own way.',
    sections: [
      {
        id: 'option-selection',
        title: 'Row and value templates',
        text: [
          '`nguDropdownOption` renders each row and `nguDropdownSelection` the closed control. Rows are positioned by `optionHeight`, so raise it for rows taller than one line; content taller than the row is clipped rather than overlapping the next.',
          'Templates change only how rows look. Search, type-ahead, chips and screen readers still use `optionLabel`, so when a row shows several fields, make the label a function that joins them too: see [labels from several fields](/selection#labels).',
        ],
        demo: {
          src: 'templates.ts',
          load: () => import('../demos/templates').then((m) => m.DropdownTemplatesDemo),
          files: FAKE,
        },
      },
      {
        id: 'context',
        title: 'Template context',
        table: {
          caption: 'Template variables',
          columns: ['Template', 'Variable', 'Description'],
          rows: [
            ['`nguDropdownOption`', '`let-row`', 'The row.'],
            ['`nguDropdownOption`', '`let-i="index"`', 'Its position in the whole result set.'],
            ['`nguDropdownOption`', '`let-s="selected"`', 'Whether it is chosen.'],
            ['`nguDropdownSelection`', '`let-row`', 'The chosen row. Single selection only.'],
          ],
        },
      },
    ],
  },

  messages: {
    title: 'Text and translations',
    description:
      'Replace any built-in text, for the whole app or one part of it, and switch language live.',
    sections: [
      {
        id: 'provider',
        title: 'Messages',
        text: [
          '`provideNguDropdownConfig({ messages })` replaces some or all built-in strings. Counts are functions, so plurals and number formats follow the language. Nested providers merge, so a route can change one string and keep the rest. A signal switches language without reloading.',
        ],
        demo: {
          src: 'messages.ts',
          load: () => import('../demos/messages').then((m) => m.DropdownMessagesDemo),
          files: FAKE,
        },
        after: [
          '`placeholder`, `searchPlaceholder`, `emptyTitle` and `emptyMessage` are also inputs, for one dropdown.',
        ],
      },
      {
        id: 'keys',
        title: 'Message keys',
        table: {
          caption: 'Messages',
          columns: ['Key', 'Default'],
          rows: [
            ['`placeholder`', 'Select…'],
            ['`searchPlaceholder`', 'Search…'],
            ['`emptyTitle` / `emptyMessage`', 'Nothing to pick / No options match what you typed.'],
            ['`errorTitle` / `errorMessage`', 'Could not load these options / The request failed…'],
            ['`retry`', 'Try again'],
            ['`loading`', 'Loading…'],
            ['`clear`', 'Clear selection'],
            ['`count(n)`', '"1 option", "1,204 options"'],
            ['`selected(n)`', '"3 selected"'],
            ['`more(n)`', '"+2 more"'],
          ],
        },
      },
    ],
  },

  theming: {
    title: 'Theming',
    description: 'Colors, corners and shadows come from CSS variables, shared with ngu-form.',
    sections: [
      {
        id: 'variables',
        title: 'CSS variables',
        text: [
          'Set them on any ancestor: the app root for a whole theme, or a wrapper for one part of a page.',
        ],
        demo: {
          src: 'theming.ts',
          load: () => import('../demos/theming').then((m) => m.DropdownThemingDemo),
          files: FAKE,
        },
        table: {
          caption: 'CSS variables',
          columns: ['Variable', 'Default', 'Used for'],
          rows: [
            ['`--ngu-border-color`', '`#c7c7c7`', 'Field and panel borders.'],
            ['`--ngu-radius`', '`0.375rem`', 'Corner radius.'],
            ['`--ngu-input-bg`', '`transparent`', 'Field background.'],
            ['`--ngu-input-padding`', '`0.5rem 0.75rem`', 'Field padding.'],
            ['`--ngu-surface`', '`#fff`', 'Panel background.'],
            ['`--ngu-primary`', '`#1a73e8`', 'Check marks, chips and the selected row tint.'],
            ['`--ngu-focus-color`', '`#1a73e8`', 'Focus ring.'],
            ['`--ngu-hint-color`', '`#6b6b6b`', 'Placeholder, icons and the footer.'],
            ['`--ngu-error-color`', '`#c62828`', 'Invalid border and the load error icon.'],
            ['`--ngu-option-hover`', 'grey, 14%', 'Hovered and active row.'],
            ['`--ngu-option-selected-bg`', 'primary, 12%', 'Selected row.'],
            ['`--ngu-skeleton-color`', 'grey, 16%', 'Loading rows.'],
            ['`--ngu-dropdown-shadow`', '`0 8px 24px rgba(0,0,0,.14)`', 'Panel shadow.'],
          ],
        },
      },
      {
        id: 'classes',
        title: 'Classes',
        text: [
          'Styles are not encapsulated and every class starts with `ngu-dd-`, so a global stylesheet can change anything the variables do not cover, without `::ng-deep`. The host carries `ngu-dropdown--open`, `--invalid`, `--disabled`, `--readonly` and `--sm`.',
        ],
        code: [
          {
            lang: 'css',
            code: `/* Taller rows' text, and a bolder selected row. */
.ngu-dd-option { font-size: 0.9375rem; }
.ngu-dd-option--selected { font-weight: 600; }`,
          },
        ],
      },
    ],
  },

  accessibility: {
    title: 'Accessibility',
    description: 'Screen readers, keyboards, zoom, forced colors and reduced motion.',
    sections: [
      {
        id: 'semantics',
        title: 'Roles and names',
        list: [
          'Follows the ARIA combobox pattern: the trigger is a `combobox` controlling a `listbox`, and the search box names the active option with `aria-activedescendant`.',
          'Each row tells screen readers its place in the whole result set with `aria-setsize` and `aria-posinset`, although only a few rows exist in the DOM.',
          'Label it with `<label for>` and `inputId`, or with `ariaLabel`. The listbox takes the same name. `describedBy` links hint and error text.',
          'The number of results is announced as people search, and a failed load is announced as an alert.',
        ],
      },
      {
        id: 'keyboard',
        title: 'Keyboard',
        table: {
          caption: 'Keys',
          columns: ['Key', 'Action'],
          rows: [
            ['Down, Up, Enter, Space', 'On the closed field: open the list.'],
            ['Down / Up', 'Move the active row. Scrolling loads its page.'],
            ['Page Down / Page Up', 'Move a screenful.'],
            ['Enter', 'Pick the active row.'],
            ['Escape', 'Close the list only, not a dialog around it, and return to the field.'],
            ['Tab', 'Close the list and move on.'],
            ['Home, End, Space', 'Without a search box: first row, last row, pick.'],
            ['Letters', 'Without a search box: jump to the next row starting with them.'],
          ],
        },
      },
      {
        id: 'display',
        title: 'Display',
        list: [
          'Animations stop under reduced motion.',
          'Active and selected rows stay visible in forced colors mode.',
          'The panel stays inside the viewport and flips above the field when there is no room below.',
        ],
      },
    ],
  },
};
