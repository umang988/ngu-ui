import type { DocPage } from 'docs-kit/docs/model';

export const PAGES: Record<string, DocPage> = {
  dropdown: {
    title: '<ngu-dropdown>',
    description: 'Inputs, outputs and methods of the component.',
    sections: [
      {
        id: 'data',
        title: 'Data inputs',
        table: {
          caption: 'Data inputs',
          columns: ['Input', 'Type', 'Description'],
          rows: [
            [
              '`fetchFn`',
              '`(query, { signal }) => Observable | Promise<NguDropdownPage<T>>`',
              'Loads one page. Server mode when bound.',
            ],
            [
              '`lookupFn`',
              '`(keys, { signal }) => Observable | Promise<T[]>`',
              'Rows for keys nothing has named.',
            ],
            ['`options`', '`T[]`', 'Client mode rows, searched in the browser.'],
            [
              '`optionValue`',
              '`string`',
              'Dot path to the key, such as `employee.id`. Default `value`.',
            ],
            [
              '`optionLabel`',
              '`string | (row) => string`',
              'Dot path to the label, such as `employee.name`, or a function joining several fields. Used for display, search and screen readers. Default `label`.',
            ],
            ['`optionDisabled`', '`(row) => boolean`', 'Rows that cannot be picked.'],
            ['`pageSize`', '`number`', 'Rows per request. Default 50.'],
            ['`sortBy` / `sortOrder`', "`string` / `'asc' | 'desc'`", 'Passed to `fetchFn`.'],
            ['`filters`', '`Record<string, unknown>`', 'Passed to `fetchFn`; a change reloads.'],
          ],
        },
      },
      {
        id: 'selection',
        title: 'Selection and state',
        table: {
          caption: 'Selection inputs',
          columns: ['Input', 'Type', 'Description'],
          rows: [
            ['`value`', '`any`', 'Two-way. The key, or keys with `multiple`.'],
            ['`multiple`', '`boolean`', 'Pick several.'],
            ['`selectedOption`', '`T | T[]`', 'Rows that name a value set from outside.'],
            ['`clearable`', '`boolean`', 'Show the clear button. Default `true`.'],
            ['`disabled` / `readonly` / `required`', '`boolean`', 'Set by Signal Forms rules too.'],
            ['`errorShown`', '`boolean`', 'Overrides when the invalid style shows.'],
          ],
        },
      },
      {
        id: 'display',
        title: 'Display inputs',
        table: {
          caption: 'Display inputs',
          columns: ['Input', 'Type', 'Description'],
          rows: [
            ['`placeholder`', '`string`', 'Shown with nothing chosen.'],
            ['`inputId`', '`string`', 'The trigger id, for `<label for>`.'],
            ['`ariaLabel`', '`string`', 'The name when there is no visible label.'],
            ['`describedBy`', '`string`', 'Ids of hint and error text.'],
            [
              '`showSearch`',
              '`boolean | null`',
              'Default: in server mode and above eight options.',
            ],
            [
              '`searchPlaceholder` / `searchDebounce`',
              '`string` / `number`',
              'Default `Search…` and 300 ms.',
            ],
            ['`size`', "`'md' | 'sm'`", 'Control height.'],
            ['`optionHeight`', '`number`', 'Row height in px. Default 36.'],
            ['`panelMaxHeight`', '`number`', 'In px. Default 320.'],
            ['`panelMinWidth` / `panelMaxWidth`', '`number`', 'In px; `0` follows the field.'],
            [
              '`optionOverflow`',
              "`'truncate' | 'scroll'`",
              'Long labels: ellipsis or sideways scroll.',
            ],
            ['`maxChips`', '`number`', 'Chips before "+N more". Default 2.'],
            ['`emptyTitle` / `emptyMessage`', '`string`', 'Shown when nothing matches.'],
            ['`showCount`', '`boolean`', 'The footer with the result count. Default `true`.'],
          ],
        },
      },
      {
        id: 'outputs',
        title: 'Outputs and methods',
        table: {
          caption: 'Outputs and methods',
          columns: ['Name', 'Type', 'Description'],
          rows: [
            ['`(selectionChange)`', '`T | T[] | null`', 'The chosen rows.'],
            ['`(searchChange)`', '`string`', 'The term after the debounce.'],
            ['`(queryChange)`', '`NguDropdownQuery`', 'Each request as it is made.'],
            ['`(loadError)`', '`unknown`', 'A failed `fetchFn` or `lookupFn`.'],
            ['`(opened)` / `(closed)`', '`void`', 'The panel opened or closed.'],
            ['`reload()`', '`void`', 'Drops loaded pages and asks again.'],
            ['`focus()`', '`void`', 'Focuses the control.'],
          ],
        },
      },
    ],
  },

  types: {
    title: 'Config and types',
    description:
      '`provideNguDropdownConfig` and the types `fetchFn`, `lookupFn` and the templates use.',
    sections: [
      {
        id: 'config',
        title: 'provideNguDropdownConfig',
        text: ['Defaults for every dropdown under an injector. Nested providers merge.'],
        table: {
          caption: 'Config options',
          columns: ['Option', 'Type', 'Description'],
          rows: [
            [
              '`messages`',
              '`Partial<NguDropdownMessages> | Signal<…>`',
              'Replaces [built-in text](/messages).',
            ],
            ['`optionValue` / `optionLabel`', '`string`', 'Default paths.'],
            [
              '`pageSize`, `optionHeight`, `panelMaxHeight`, `searchDebounce`',
              '`number`',
              'Default sizes and timing.',
            ],
            [
              '`searchThreshold`',
              '`number`',
              'Client lists longer than this get a search box. Default 8.',
            ],
            ['`rowMemory`', '`NguDropdownRowMemory`', 'Names keys restored into a form control.'],
          ],
        },
      },
      {
        id: 'page',
        title: 'NguDropdownPage<T>',
        text: ['What `fetchFn` returns. Extra fields are ignored.'],
        table: {
          caption: 'NguDropdownPage fields',
          columns: ['Field', 'Type', 'Description'],
          rows: [
            ['`content`', '`readonly T[]`', 'The rows of this page.'],
            ['`totalElements`', '`number`', 'Rows in the whole result set; sizes the scrollbar.'],
            ['`totalPages`, `number`, `size`', '`number`', 'Optional, as Spring Data sends them.'],
          ],
        },
      },
      {
        id: 'query',
        title: 'NguDropdownQuery',
        table: {
          caption: 'NguDropdownQuery fields',
          columns: ['Field', 'Type', 'Description'],
          rows: [
            ['`page`', '`number`', 'Zero-based page index.'],
            ['`size`', '`number`', 'Rows per page.'],
            ['`search`', '`string`', 'Trimmed; `""` when empty.'],
            ['`sort` / `order`', "`string | null` / `'asc' | 'desc' | null`", 'From the inputs.'],
            ['`filters`', '`Record<string, unknown>`', 'From `[filters]`.'],
          ],
        },
      },
      {
        id: 'functions',
        title: 'Functions',
        table: {
          caption: 'Function types',
          columns: ['Type', 'Signature'],
          rows: [
            [
              '`NguDropdownFetch<T>`',
              '`(query: NguDropdownQuery, context: { signal: AbortSignal }) => Observable | PromiseLike<NguDropdownPage<T>>`',
            ],
            [
              '`NguDropdownLookup<T>`',
              '`(keys: readonly unknown[], context: { signal: AbortSignal }) => Observable | PromiseLike<readonly T[]>`',
            ],
            [
              '`NguDropdownRowMemory`',
              '`{ remember(control, key, row): void; recall(control, key): unknown }`',
            ],
          ],
        },
      },
      {
        id: 'items',
        title: 'NguDropdownItem<V>',
        text: [
          '`{ value: V; label: string }`, the shape the default `optionValue` and `optionLabel` read, for static lists.',
        ],
      },
    ],
  },
};
