import type { DocPage } from 'docs-kit/docs/model';

export const PAGES: Record<string, DocPage> = {
  table: {
    title: '<ngu-table>',
    description: 'Inputs, outputs, methods and content slots of the component.',
    sections: [
      {
        id: 'data',
        title: 'Data inputs',
        api: [
          {
            name: 'columns',
            type: 'NguTableColumn<T>[]',
            note: 'required',
            description: 'The columns, in order. See [Columns](/columns).',
          },
          {
            name: 'fetchFn',
            type: '(query, { signal }) => Observable | Promise<NguTablePage<T>>',
            description: 'Loads one page. Fetch mode when bound. Keep it a class field.',
          },
          {
            name: 'rows',
            type: 'T[]',
            default: '[]',
            description: 'The rows in client and server mode. Ignored while `fetchFn` is bound.',
          },
          {
            name: 'mode',
            type: "'server' | 'client'",
            default: "'server'",
            description:
              'With `rows`: `client` searches, sorts and pages here, `server` leaves it to you.',
          },
          {
            name: 'filters',
            type: 'Record<string, unknown>',
            default: '{}',
            description: 'Your filter model, copied into the query on Apply.',
          },
          {
            name: 'totalRows',
            type: 'number',
            default: '0',
            description: 'The size of the whole result set, in server mode.',
          },
          {
            name: 'loading',
            type: 'boolean',
            default: 'false',
            description: 'The loading state, in server mode.',
          },
          {
            name: 'rowKey',
            type: 'string',
            default: "'id'",
            description: "Dot path to each row's identity. Default from the config.",
          },
          {
            name: 'emptyText',
            type: 'string',
            default: "'—'",
            description: 'Shown for `null`, `undefined` and `""`. Default from the config.',
          },
        ],
      },
      {
        id: 'look',
        title: 'Look',
        api: [
          {
            name: 'surface',
            type: 'boolean',
            default: 'true',
            description: 'Draws the table as a card. Turn off inside a card.',
          },
          { name: 'compact', type: 'boolean', default: 'false', description: 'Denser rows.' },
          {
            name: 'striped',
            type: 'boolean',
            default: 'false',
            description: 'Tints every other row.',
          },
          {
            name: 'maxHeight',
            type: 'string | null',
            default: 'null',
            description:
              'A CSS length; the rows scroll under a sticky heading. Default `32rem` for a virtual table.',
          },
          {
            name: 'skeletonRows',
            type: 'number',
            default: '5',
            description: 'Placeholder rows while the first page loads.',
          },
          {
            name: 'emptyTitle / emptyMessage',
            type: 'string',
            description: 'Text of the empty notice. Default from the messages.',
          },
          { name: 'ariaLabel', type: 'string', description: 'Accessible name of the `<table>`.' },
        ],
      },
      {
        id: 'toolbar',
        title: 'Toolbar',
        api: [
          { name: 'showSearch', type: 'boolean', default: 'true', description: 'The search box.' },
          {
            name: 'searchPlaceholder',
            type: 'string',
            description: 'Placeholder and accessible name of the search box.',
          },
          {
            name: 'searchDebounce',
            type: 'number',
            default: '400',
            description: 'Typing pause before searching, in ms. Default from the config.',
          },
          {
            name: 'searchMinLength',
            type: 'number',
            default: '1',
            description: 'Shorter terms do not search. Default from the config.',
          },
          {
            name: 'searchText',
            type: 'string',
            note: 'model',
            description: 'The search box, two-way.',
          },
          {
            name: 'stateKey',
            type: 'string',
            description:
              "The key the config's `searchMemory` keeps this search under. Default: the page's path.",
          },
          {
            name: 'showClear',
            type: 'boolean',
            default: 'true',
            description: 'The Clear button, once anything is applied.',
          },
          {
            name: 'showFilter',
            type: 'boolean',
            default: 'false',
            description: 'The Filter button and its panel of `[nguTableFilters]` content.',
          },
          {
            name: 'filterActive',
            type: 'boolean',
            description:
              'Whether the Filter button shows filters as applied. Unbound: whenever an applied filter has a value.',
          },
          {
            name: 'showAdd / addLabel / addDisabled',
            type: 'boolean / string / boolean',
            description: 'The Add button, its text and its disabled state.',
          },
          {
            name: 'showImport / importAccept',
            type: 'boolean / string',
            default: "false / '.csv,.xls,.xlsx'",
            description: 'The Import button and the file types its picker offers.',
          },
          {
            name: 'importOpensDialog',
            type: 'boolean',
            default: 'false',
            description: 'Import emits `(importClick)` instead of opening a file picker.',
          },
          {
            name: 'showExport / exportFileName',
            type: 'boolean / string',
            default: "false / 'export'",
            description: 'The CSV Export button and the file name, without `.csv`.',
          },
        ],
      },
      {
        id: 'rows',
        title: 'Row actions',
        api: [
          {
            name: 'showView / showEdit / showDelete',
            type: 'boolean',
            default: 'false',
            description: 'Buttons in each row.',
          },
          {
            name: 'canEdit / canDelete',
            type: '(row: T) => boolean',
            default: '() => true',
            description: 'Which rows get Edit and Delete.',
          },
          {
            name: 'confirmDelete',
            type: 'boolean',
            default: 'true',
            description: 'Asks in a dialog before `(deleteRow)`.',
          },
          { name: 'deleteMessage', type: 'string', description: 'Text of the delete dialog.' },
          {
            name: 'rowClickable',
            type: 'boolean',
            default: 'false',
            description: 'Rows emit `(rowClick)`, and open with Enter.',
          },
        ],
      },
      {
        id: 'paging',
        title: 'Paging and sorting',
        api: [
          {
            name: 'page',
            type: 'number',
            note: 'model',
            default: '0',
            description: 'Zero-based page index.',
          },
          {
            name: 'pageSize',
            type: 'number',
            note: 'model',
            default: '10',
            description: 'Rows per page. Default from the config.',
          },
          {
            name: 'sort',
            type: 'NguTableSort | null',
            note: 'model',
            default: 'null',
            description: 'The sorted column and direction.',
          },
          {
            name: 'pageSizeOptions',
            type: 'number[]',
            default: '[10, 25, 50, 100]',
            description: 'The rows-per-page choices. Default from the config.',
          },
          {
            name: 'showPageSize',
            type: 'boolean',
            default: 'true',
            description: 'The rows-per-page picker.',
          },
          {
            name: 'pagination',
            type: "'pages' | 'none' | 'virtual'",
            default: "'pages'",
            description:
              '`none` shows every row and no pager; `virtual` draws only the rows in view and, with `fetchFn`, asks only for the pages under the scroll position.',
          },
          {
            name: 'rowHeight',
            type: 'number',
            description:
              'Height of each virtual row in px. Default: measured from the first rows drawn.',
          },
        ],
      },
      {
        id: 'outputs',
        title: 'Outputs',
        api: [
          {
            name: 'queryChange',
            type: 'NguTableQuery',
            description:
              'Every change of page, size, search, sort or applied filters, in fetch mode. With virtual scrolling, every page request.',
          },
          {
            name: 'searchChange',
            type: 'string',
            description: 'The search term once typing settles.',
          },
          { name: 'loadError', type: 'unknown', description: '`fetchFn` failed.' },
          {
            name: 'filtersApplied',
            type: 'Record<string, unknown>',
            description: "The filter panel's Apply, with the applied filters.",
          },
          {
            name: 'filtersCleared',
            type: 'void',
            description: "The filter panel's Clear. Reset your controls here.",
          },
          {
            name: 'cleared',
            type: 'void',
            description: 'The toolbar Clear reset search, sort and filters.',
          },
          { name: 'addClick', type: 'void', description: 'The Add button.' },
          { name: 'fileSelected', type: 'File', description: 'A file picked with Import.' },
          {
            name: 'importClick',
            type: 'void',
            description: 'Import pressed, with `importOpensDialog`.',
          },
          { name: 'exported', type: 'T[]', description: 'The rows just written to CSV.' },
          {
            name: 'rowClick',
            type: 'T',
            description: 'A row clicked or opened with Enter, with `rowClickable`.',
          },
          {
            name: 'linkClick',
            type: 'NguTableLinkEvent<T>',
            description: 'A `link` cell pressed: `{ row, column }`.',
          },
          { name: 'viewRow / editRow', type: 'T', description: "A row's View or Edit button." },
          {
            name: 'deleteRow',
            type: 'T',
            description: 'A delete confirmed (or asked for, without `confirmDelete`).',
          },
        ],
      },
      {
        id: 'methods',
        title: 'Methods',
        api: [
          {
            name: 'reload()',
            type: 'void',
            description: 'Runs the current query again, in fetch mode.',
          },
          {
            name: 'commitFilters(filters)',
            type: 'void',
            description:
              'Puts a filter model into the query at once, from page 0, for tabs and other controls that apply without the panel.',
          },
        ],
      },
      {
        id: 'slots',
        title: 'Content',
        table: {
          caption: 'Content slots and templates',
          columns: ['Content', 'Where it goes'],
          rows: [
            ['`[nguTableTabs]`', 'A rail above the toolbar.'],
            ['`[nguTableToolbar]`', 'In the toolbar, after the search box.'],
            ['`[nguTableFilters]`', 'Inside the filter panel.'],
            [
              '`<ng-template nguTableCell="field">`',
              'Draws the cells of a `template: true` column. Context: `$implicit` value, `row`, `column`.',
            ],
            [
              '`<ng-template nguTableRowActions>`',
              'Extra buttons in each row. Context: `$implicit` row.',
            ],
            ['`<ng-template nguTableEmpty>`', 'Replaces the empty notice.'],
          ],
        },
      },
    ],
  },

  types: {
    title: 'Config and types',
    description:
      '`provideNguTableConfig`, every built-in message, and the types the table takes and gives.',
    sections: [
      {
        id: 'config',
        title: 'provideNguTableConfig',
        text: [
          "Defaults for every table under an injector. Options left out keep the parent injector's value or the built-in default; `messages` and `badgeTones` merge key by key.",
        ],
        api: [
          {
            name: 'messages',
            type: 'Partial<NguTableMessages> | Signal<…>',
            description: 'Built-in strings. A signal switches language live.',
          },
          { name: 'pageSize', type: 'number', default: '10', description: 'Rows per page.' },
          {
            name: 'pageSizeOptions',
            type: 'number[]',
            default: '[10, 25, 50, 100]',
            description: 'Rows-per-page choices.',
          },
          {
            name: 'rowKey',
            type: 'string',
            default: "'id'",
            description: 'Dot path to row identity.',
          },
          {
            name: 'searchDebounce',
            type: 'number',
            default: '400',
            description: 'Typing pause before searching, in ms.',
          },
          {
            name: 'searchMinLength',
            type: 'number',
            default: '1',
            description: 'Shorter terms do not search.',
          },
          {
            name: 'emptyText',
            type: 'string',
            default: "'—'",
            description: 'Shown for empty values.',
          },
          {
            name: 'dateFormat / datetimeFormat',
            type: 'string',
            default: "'d MMM y' / 'd MMM y, h:mm a'",
            description: 'Angular date patterns.',
          },
          {
            name: 'currencyCode',
            type: 'string',
            default: 'DEFAULT_CURRENCY_CODE',
            description: 'For currency columns without one.',
          },
          {
            name: 'currencyLocale',
            type: '(code: string) => string',
            default: 'LOCALE_ID',
            description: 'The locale an amount in each currency is formatted in.',
          },
          {
            name: 'badgeTones',
            type: 'Record<string, NguBadgeTone>',
            description: "Status words and their tones, after a column's `badgeMap`.",
          },
          {
            name: 'searchMemory',
            type: 'NguTableSearchMemory | ProviderToken<…>',
            description:
              'Keeps search text across screens: `{ recall(key), remember(key, text) }`.',
          },
        ],
      },
      {
        id: 'messages',
        title: 'NguTableMessages',
        api: [
          {
            name: 'searchPlaceholder',
            type: 'string',
            default: "'Search…'",
            description: 'Search box placeholder and name.',
          },
          {
            name: 'clearSearch',
            type: 'string',
            default: "'Clear search'",
            description: 'The button that empties the search box.',
          },
          {
            name: 'clear',
            type: 'string',
            default: "'Clear'",
            description: 'The toolbar Clear button.',
          },
          {
            name: 'filter / filtersTitle / closeFilters',
            type: 'string',
            default: "'Filter' / 'Filters' / 'Close filters'",
            description: 'The Filter button, the panel heading and its close button.',
          },
          {
            name: 'clearFilters / applyFilters',
            type: 'string',
            default: "'Clear' / 'Apply'",
            description: "The panel's buttons.",
          },
          {
            name: 'import / export / add',
            type: 'string',
            default: "'Import' / 'Export' / 'Add'",
            description: 'Toolbar buttons.',
          },
          {
            name: 'actions / view / edit / delete',
            type: 'string',
            default: "'Actions' / 'View' / 'Edit' / 'Delete'",
            description: 'The actions heading and row buttons.',
          },
          {
            name: 'deleteTitle / deleteMessage / cancel',
            type: 'string',
            description: 'The delete dialog.',
          },
          {
            name: 'emptyTitle / emptyMessage',
            type: 'string',
            default: "'Nothing to show' / …",
            description: 'The empty notice.',
          },
          {
            name: 'errorTitle / errorMessage / retry',
            type: 'string',
            default: "'Could not load this list' / … / 'Try again'",
            description: 'The error notice.',
          },
          {
            name: 'yes / no',
            type: 'string',
            default: "'Yes' / 'No'",
            description: 'Boolean cells, for screen readers and the CSV.',
          },
          {
            name: 'range',
            type: '(first, last, total) => string',
            default: "'Showing 1–10 of 57'",
            description: 'The footer range.',
          },
          {
            name: 'noRecords',
            type: 'string',
            default: "'No records'",
            description: 'The footer with no rows.',
          },
          {
            name: 'count',
            type: '(total) => string',
            default: "'5,000 rows'",
            description: 'The footer of a virtual table.',
          },
          {
            name: 'pageSize',
            type: '(size) => string',
            default: "'25 / page'",
            description: 'A rows-per-page choice.',
          },
          {
            name: 'rowsPerPage / pagination',
            type: 'string',
            default: "'Rows per page' / 'Pagination'",
            description: 'Names of the picker and the pager.',
          },
          {
            name: 'firstPage / previousPage / nextPage / lastPage',
            type: 'string',
            description: 'Names of the arrow buttons.',
          },
          {
            name: 'page',
            type: '(page) => string',
            default: "'Page 3'",
            description: 'Name of a numbered page button.',
          },
        ],
      },
      {
        id: 'column',
        title: 'NguTableColumn',
        text: ['Described in [Columns](/columns). `T` is the row type, used by `formatter`.'],
        code: [
          {
            code: `interface NguTableColumn<T = any> {
  field: string;               // dot path
  header: string;
  type?: NguTableColumnType;   // 'text' by default
  sortable?: boolean;          // true by default
  sortField?: string;
  template?: boolean;
  numeric?: boolean;
  wrap?: boolean;
  width?: string;
  hidden?: boolean;
  format?: string;             // date, datetime
  currencyCode?: string;       // currency
  digitsInfo?: string;         // number, currency, percent
  badgeMap?: Record<string, NguBadgeTone>;
  avatarSrc?: string;          // avatar
  imageSize?: string;          // image
  progressMax?: number;        // progress
  formatter?: (value: any, row: T) => string;
  exportField?: string;
}`,
          },
        ],
      },
      {
        id: 'other',
        title: 'Other types',
        code: [
          {
            code: `type NguTableColumnType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'datetime'
  | 'badge' | 'boolean' | 'avatar' | 'image' | 'email' | 'phone' | 'link' | 'progress';

type NguBadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'accent' | 'neutral';

interface NguTableQuery {
  page: number; size: number; search: string;
  sort: string | null; order: 'asc' | 'desc' | null;
  filters: Record<string, unknown>;
}

interface NguTablePage<T> {
  content: readonly T[];
  totalElements: number;
  totalPages?: number;
}

interface NguTableSort { field: string; direction: 'asc' | 'desc' }

type NguTableFetch<T> = (query: NguTableQuery, context: { signal: AbortSignal })
  => Observable<NguTablePage<T>> | PromiseLike<NguTablePage<T>>;

interface NguTableLinkEvent<T> { row: T; column: NguTableColumn<T> }

interface NguTableSearchMemory {
  recall(key: string): string;
  remember(key: string, text: string): void;
}`,
          },
        ],
      },
    ],
  },
};
