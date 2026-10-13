import type { DocPage } from 'docs-kit/docs/model';
import { FAKE } from './getting-started';

export const PAGES: Record<string, DocPage> = {
  'server-data': {
    title: 'Server data',
    description:
      'What `fetchFn` receives and returns, how reloads and errors work, and how stale requests are cancelled.',
    sections: [
      {
        id: 'query',
        title: 'The query',
        text: [
          '`fetchFn` receives an `NguTableQuery` and returns an Observable or a Promise of one page. The response needs `content` and `totalElements`, which is what a Spring Data `Page` serializes to; `totalPages` is used when present.',
        ],
        code: [
          {
            filename: 'order.service.ts',
            code: `readonly loadOrders = (q: NguTableQuery) =>
  this.http.get<NguTablePage<Order>>('/api/orders', {
    params: {
      page: q.page,
      size: q.size,
      search: q.search,
      ...(q.sort ? { sort: \`\${q.sort},\${q.order}\` } : {}),
      ...(q.filters['status'] ? { status: q.filters['status'] as string } : {}),
    },
  });`,
          },
        ],
        table: {
          caption: 'NguTableQuery fields',
          columns: ['Field', 'Type', 'Description'],
          rows: [
            ['`page`', '`number`', 'Zero-based page index.'],
            ['`size`', '`number`', 'Rows per page.'],
            [
              '`search`',
              '`string`',
              'The search term once typing settles, trimmed; `""` when empty.',
            ],
            [
              '`sort` / `order`',
              "`string | null` / `'asc' | 'desc' | null`",
              "The column's `sortField` (else its `field`) and the direction.",
            ],
            [
              '`filters`',
              '`Record<string, unknown>`',
              'The filter model as of the last Apply or `commitFilters()`. See [Filters](/filters).',
            ],
          ],
        },
        after: [
          'ngu-dropdown sends the same fields, so one service method can feed a table and a picker over the same records.',
        ],
      },
      {
        id: 'promise',
        title: 'Promises and fetch',
        text: [
          'A Promise works as well. The second argument carries an `AbortSignal` that is aborted when the answer is no longer needed.',
        ],
        code: [
          {
            code: `readonly loadOrders = (q: NguTableQuery, { signal }: NguTableFetchContext) =>
  fetch(\`/api/orders?page=\${q.page}&size=\${q.size}&search=\${encodeURIComponent(q.search)}\`, { signal })
    .then((response) => response.json() as Promise<NguTablePage<Order>>);`,
          },
        ],
      },
      {
        id: 'stale',
        title: 'One request per query',
        list: [
          'A change of page, size, search, sort or applied filters cancels the request in flight (an Observable is unsubscribed, the `AbortSignal` is aborted) before the next one starts, so a late answer to an old search never replaces a newer one.',
          'Search waits until typing pauses (400 ms by default), and a Clear that resets search, sort and filters together sends one request, not three.',
          'The table watches only whether `fetchFn` is bound, not which function it is: an arrow written in a template is a new function on every check and would otherwise fetch forever. Pass anything else the request depends on through `[filters]`.',
        ],
      },
      {
        id: 'reload',
        title: 'Reloading and errors',
        text: [
          'After a save or a delete, call `reload()` to run the same query again. A failed request shows a notice with a Try again button and emits `(loadError)`. While a page loads the rows already shown stay, dimmed, so nothing jumps; skeleton rows appear only before the first page.',
        ],
        demo: {
          src: 'states.ts',
          load: () => import('../demos/states').then((m) => m.TableStatesDemo),
          files: FAKE,
          value: false,
        },
        code: [
          {
            code: `private readonly table = viewChild.required(NguTable);

async remove(order: Order) {
  await firstValueFrom(this.api.deleteOrder(order.id));
  this.table().reload();
}`,
          },
        ],
      },
      {
        id: 'ssr',
        title: 'Server-side rendering',
        text: [
          'On the server, rendering waits for the first page, so the HTML arrives with rows in it. With `HttpClient` and its transfer cache the browser reuses that answer instead of asking again.',
        ],
      },
    ],
  },

  'rows-in-hand': {
    title: 'Rows in hand',
    description:
      'Pass the rows yourself with `[rows]`: let the table search, sort and page them, or keep that in your component.',
    sections: [
      {
        id: 'client',
        title: 'Client mode',
        text: [
          'With `[rows]` and `mode="client"` the table searches every visible column (ignoring case, nested paths included), sorts numbers and dates by size and text with digits compared as numbers, and cuts the pages. Export writes every matching row, not just the page on screen.',
        ],
        demo: {
          src: 'client.ts',
          load: () => import('../demos/client').then((m) => m.TableClientDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'server',
        title: 'Server mode',
        text: [
          'With `[rows]` alone, the rows are shown as given: your component owns searching, sorting and paging, and reads what people asked for through the two-way `[(page)]`, `[(pageSize)]` and `[(sort)]` and the `(searchChange)` output. Pass the size of the whole result set in `[totalRows]` and your loading state in `[loading]`. Use it when the data comes from a store, or from loading you already have.',
        ],
        demo: {
          src: 'server-mode.ts',
          load: () => import('../demos/server-mode').then((m) => m.TableServerModeDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'keys',
        title: 'Row identity',
        text: [
          "Rows are told apart by `rowKey`, a dot path that defaults to `id`, so a sort or a new page re-uses the right rows' DOM. Cells are formatted once per row object; replacing a row with an edited copy formats it again.",
        ],
        code: [
          {
            code: `<ngu-table [rows]="lines" rowKey="lineNo" mode="client" [columns]="columns" />`,
            lang: 'angular-html',
          },
        ],
      },
    ],
  },

  columns: {
    title: 'Columns',
    description:
      'Describe each column with a field, a heading and a type. The type decides how values are drawn and formatted.',
    sections: [
      {
        id: 'types',
        title: 'Column types',
        text: [
          '`field` is a dot path into the row; a row without the path shows the empty text (`—`) instead of throwing. `type` defaults to `text`.',
        ],
        demo: {
          src: 'column-types.ts',
          load: () => import('../demos/column-types').then((m) => m.TableColumnTypesDemo),
          files: FAKE,
          value: false,
        },
        table: {
          caption: 'Column types',
          columns: ['Type', 'Draws', 'Options'],
          rows: [
            ['`text`', 'The value; a list is joined with commas.', '`wrap`'],
            ['`number`', 'A grouped number, right-aligned.', '`digitsInfo` (default `1.0-2`)'],
            [
              '`currency`',
              'An amount with its symbol.',
              '`currencyCode`, `digitsInfo` (default `1.2-2`)',
            ],
            ['`percent`', '`0.155` as `15.5%`.', '`digitsInfo`'],
            [
              '`date` / `datetime`',
              'A formatted date.',
              '`format` (default `d MMM y` / `d MMM y, h:mm a`)',
            ],
            ['`badge`', 'A colored status chip.', '`badgeMap`'],
            ['`boolean`', 'A check or a cross, read as Yes or No.', ''],
            ['`avatar`', 'Initials or a picture, then the name.', '`avatarSrc`'],
            ['`image`', 'A square thumbnail.', '`imageSize` (default `36px`)'],
            ['`email` / `phone`', 'A `mailto:` or `tel:` link.', ''],
            ['`link`', 'A button that emits `(linkClick)`.', ''],
            ['`progress`', 'A bar and a percentage.', '`progressMax` (default 100)'],
          ],
        },
      },
      {
        id: 'options',
        title: 'Common options',
        table: {
          caption: 'Column options for every type',
          columns: ['Option', 'Description'],
          rows: [
            ['`sortable`', 'Default `true`. `false` gives the heading no sort button.'],
            ['`sortField`', 'The sort key sent to the server when it differs from `field`.'],
            ['`numeric`', 'Right-aligned. Implied by `number`, `currency` and `percent`.'],
            ['`wrap`', 'Lets long text wrap; cells stay on one line otherwise.'],
            ['`width`', 'A CSS width for the column.'],
            ['`hidden`', 'Out of the table and the export.'],
            [
              '`formatter`',
              '`(value, row) => string`: the cell text, overriding the type. Also what the CSV gets.',
            ],
            ['`template`', 'Draw the cell with an [`nguTableCell` template](/templates).'],
            ['`exportField`', 'Dot path to export instead of `field`.'],
          ],
        },
      },
      {
        id: 'formatting',
        title: 'Dates, numbers and currency',
        text: [
          "Formatting uses Angular's `formatDate`, `formatNumber` and `formatCurrency` with the app's `LOCALE_ID`. A value that cannot be formatted (a malformed date) shows as it is rather than breaking the table. A currency column without `currencyCode` uses the config's `currencyCode`, else Angular's `DEFAULT_CURRENCY_CODE`.",
          'Some currencies read better in their own grouping: rupees in lakhs and crores (`₹1,57,09,450.00`) next to dollars in thousands. `currencyLocale` picks the locale per currency; register the locale data first.',
        ],
        code: [
          {
            filename: 'app.config.ts',
            code: `import { registerLocaleData } from '@angular/common';
import localeEnIn from '@angular/common/locales/en-IN';
import { provideNguTableConfig } from 'ngu-table/config';

registerLocaleData(localeEnIn);

export const appConfig: ApplicationConfig = {
  providers: [
    provideNguTableConfig({
      currencyCode: 'INR',
      currencyLocale: (code) => (code === 'INR' ? 'en-IN' : 'en-US'),
    }),
  ],
};`,
          },
        ],
      },
      {
        id: 'badges',
        title: 'Status badges',
        text: [
          "A badge's color says what the status means, never a color made up from the text. A value is looked up in the column's `badgeMap`, then in the config's `badgeTones`, then in a built-in vocabulary (`ACTIVE` and `PAID` are success, `PENDING` and `ON_HOLD` warning, `CANCELLED` and `FAILED` danger, `NEW` and `OPEN` info...), and is `neutral` when nothing matches. Lookups ignore case, spaces, dots, dashes and underscores.",
        ],
        demo: {
          src: 'badges.ts',
          load: () => import('../demos/badges').then((m) => m.TableBadgesDemo),
          value: false,
        },
        after: [
          'The tones are `success`, `danger`, `warning`, `info`, `accent` and `neutral`; [Theming](/theming) sets their colors.',
        ],
      },
    ],
  },

  templates: {
    title: 'Templates',
    description: 'Draw a column, extra row buttons or the empty notice with your own template.',
    sections: [
      {
        id: 'cells',
        title: 'Cell templates',
        text: [
          'Mark the column `template: true` and add an `<ng-template nguTableCell="field">` with the same field. The template gets the value as `let-value` and the row and column as `let-row="row"` and `let-column="column"`, and the compiler checks them. A cell template whose field matches no template shows the plain value.',
          'Give a templated column an `exportField` (or a `formatter`) so the CSV export has text for it.',
        ],
        demo: {
          src: 'templates.ts',
          load: () => import('../demos/templates').then((m) => m.TableTemplatesDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'row-actions',
        title: 'Extra row buttons',
        text: [
          '`<ng-template nguTableRowActions let-row>` adds buttons after View, Edit and Delete, in the actions column. A click on a button inside a row never counts as a row click.',
        ],
      },
      {
        id: 'empty',
        title: 'The empty notice',
        text: [
          '`<ng-template nguTableEmpty>` replaces the notice shown when there are no rows; the error notice stays. For text alone, `emptyTitle` and `emptyMessage` are enough, and an element marked `nguTableEmptyIcon` replaces just the icon, from any icon library: `<my-icon nguTableEmptyIcon name="truck" />`.',
        ],
        demo: {
          src: 'empty.ts',
          load: () => import('../demos/empty').then((m) => m.TableEmptyDemo),
          value: false,
        },
      },
    ],
  },

  toolbar: {
    title: 'Toolbar',
    description:
      'Search, Clear, Add, Import and Export above the table, and room for your own controls.',
    sections: [
      {
        id: 'buttons',
        title: 'Buttons and your own controls',
        text: [
          'The search box is on by default; turn on the rest with `showAdd`, `showImport` and `showExport`. Content marked `nguTableToolbar` goes after the search box, and `nguTableTabs` goes in a rail above the toolbar (see [Filters](/filters)). On a narrow table the buttons keep their icons and drop their text, which stays as their accessible names.',
        ],
        demo: {
          src: 'toolbar.ts',
          load: () => import('../demos/toolbar').then((m) => m.TableToolbarDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'search',
        title: 'Search',
        list: [
          'The table searches once typing pauses: `searchDebounce`, 400 ms by default.',
          '`searchMinLength` keeps short terms from searching: with 2, one letter shows the whole list rather than every row containing an "a". An empty box always searches, since that is how a search is cancelled.',
          '`[(searchText)]` is the box itself, two-way, so a screen can fill it from its own URL. `(searchChange)` emits the settled term.',
          'The Clear button appears once a search, a sort or a filter is applied, and resets all three with one request.',
        ],
      },
      {
        id: 'memory',
        title: 'Keeping the search between screens',
        text: [
          "People open a record from a searched list and come back to an empty search box. A `searchMemory` in the config keeps each table's search, under its `stateKey` or the page's path. Give it an object, or a class the table injects, which can then use the router, for example to forget searches when people leave a section of the app.",
        ],
        code: [
          {
            filename: 'search-memory.ts',
            code: `@Injectable({ providedIn: 'root' })
export class SessionSearchMemory implements NguTableSearchMemory {
  recall(key: string) {
    return sessionStorage.getItem(\`search:\${key}\`) ?? '';
  }
  remember(key: string, text: string) {
    if (text) sessionStorage.setItem(\`search:\${key}\`, text);
    else sessionStorage.removeItem(\`search:\${key}\`);
  }
}

// app.config.ts, importing from 'ngu-table/config'
provideNguTableConfig({ searchMemory: SessionSearchMemory });`,
          },
        ],
      },
      {
        id: 'export',
        title: 'CSV export',
        list: [
          "Export writes the visible columns with their headings and the same text as the screen: formatted dates and amounts, Yes and No for booleans, a column's `formatter` output.",
          'Client mode exports every matching row; fetch and server mode export the page in hand, since a whole-set export is a job for your server.',
          'The file starts with a byte order mark, so Excel reads it as UTF-8. `exportFileName` names it; `(exported)` emits the rows written.',
        ],
      },
      {
        id: 'import',
        title: 'Import',
        text: [
          'Import opens a file picker limited to `importAccept` (`.csv,.xls,.xlsx` by default) and emits the file through `(fileSelected)`; reading it is up to you. With `importOpensDialog` the button emits `(importClick)` instead, for an import screen of your own that offers a template first or shows the file back before saving.',
        ],
      },
    ],
  },

  filters: {
    title: 'Filters',
    description: 'A filter panel applied with one button, and tabs that apply at once.',
    sections: [
      {
        id: 'panel',
        title: 'The filter panel',
        text: [
          "With `showFilter`, the Filter button opens a panel holding your content marked `nguTableFilters`. Your controls write your own filter model, bound as `[filters]`; Apply copies it into the query (one request, from page 0) and emits `(filtersApplied)`. The panel's Clear empties the applied filters and emits `(filtersCleared)`, where you reset your controls.",
          'The panel shows in the top layer, so no card or scroller around the table can clip it, and controls inside it can open their own popups: the region picker below is an ngu-dropdown. It closes on Escape, on a click outside, and when the page scrolls under it.',
        ],
        demo: {
          src: 'filters.ts',
          load: () => import('../demos/filters').then((m) => m.TableFiltersDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'tabs',
        title: 'Tabs that apply at once',
        text: [
          'Content marked `nguTableTabs` sits in a rail above the toolbar. A control that should apply at once, such as a tab, calls `commitFilters(model)`. It takes the model as an argument because `[filters]` still holds the old value during the click that changed it.',
        ],
        code: [
          {
            code: `protected pick(tab: Tab) {
  this.tab.set(tab);
  this.table().commitFilters(this.filters());
}`,
          },
        ],
      },
      {
        id: 'active',
        title: 'Showing that filters apply',
        text: [
          "The Filter button looks pressed while an applied filter has a value. Bind `filterActive` to decide yourself, for example to count the panel's filters but not the tab, as above, or for filters your component applies without the panel.",
        ],
      },
    ],
  },

  'row-actions': {
    title: 'Row actions',
    description:
      'View, Edit and Delete in every row, rules for which rows allow them, a delete confirmation, and clickable rows.',
    sections: [
      {
        id: 'buttons',
        title: 'Buttons and rules',
        text: [
          '`showView`, `showEdit` and `showDelete` add buttons that emit `(viewRow)`, `(editRow)` and `(deleteRow)` with the row. `canEdit` and `canDelete` take a function of the row, so a screen can say in its own terms which rows are exempt. Delete asks first in a modal dialog; `deleteMessage` sets its text and `[confirmDelete]="false"` skips it.',
          'With `rowClickable`, a click anywhere on a row emits `(rowClick)`, except on buttons, links and fields inside it and in the actions column. Clickable rows can be reached with Tab and opened with Enter. A `link` column emits `(linkClick)` with the row and the column.',
        ],
        demo: {
          src: 'actions.ts',
          load: () => import('../demos/actions').then((m) => m.TableActionsDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'after-delete',
        title: 'After a delete',
        text: [
          'The table does not remove the row itself: delete it on your server, then call `reload()` in fetch mode, or drop it from `[rows]` otherwise.',
        ],
      },
    ],
  },

  paging: {
    title: 'Paging and sorting',
    description:
      'Two-way page, page size and sort, deep links, and a scrolling body with a sticky heading.',
    sections: [
      {
        id: 'two-way',
        title: 'Two-way state',
        text: [
          '`[(page)]` (zero-based), `[(pageSize)]` and `[(sort)]` are models: bind them to keep the state in your URL or a store, or set them from outside. A sort goes back to page 0, and so does a new page size. A page past the end is moved to the last page once the total is known, so a deep link to page 3 survives the first load.',
        ],
        demo: {
          src: 'paging.ts',
          load: () => import('../demos/paging').then((m) => m.TablePagingDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'options',
        title: 'Options',
        table: {
          caption: 'Paging and sorting options',
          columns: ['Input', 'Description'],
          rows: [
            [
              '`pageSizeOptions`',
              'The rows-per-page choices. Default `[10, 25, 50, 100]`; a page size that is not one of them is added.',
            ],
            ['`showPageSize`', 'Shows the rows-per-page picker. Default `true`.'],
            [
              '`pagination`',
              "`'none'` shows every row and no pager; `'virtual'` draws only the rows in view (see [Virtual scrolling](/virtual)).",
            ],
            [
              '`maxHeight`',
              'A CSS length: the rows scroll inside it under a sticky heading, and a new page starts at the top.',
            ],
            ['`compact` / `striped`', 'Denser rows / every other row tinted.'],
          ],
        },
      },
      {
        id: 'sort',
        title: 'Sorting',
        text: [
          'Each sortable heading is a button: the first press sorts ascending, the next descending. The heading carries `aria-sort`. A column sorts by its `sortField` when it has one, for a server that sorts by a key other than the field shown.',
        ],
      },
    ],
  },

  virtual: {
    title: 'Virtual scrolling',
    description:
      'With `pagination="virtual"` the table scrolls through the whole list instead of paging, and draws only the rows in view, whether the rows are in hand or on your server.',
    sections: [
      {
        id: 'in-hand',
        title: 'Rows in hand',
        text: [
          'These 50,000 orders are all in the browser, searched and sorted there, but only the thirty or so rows in view are in the DOM. The rows scroll inside `maxHeight` (32rem by default) under a sticky heading, and the footer shows the size of the list instead of a pager.',
        ],
        demo: {
          src: 'virtual-client.ts',
          load: () => import('../demos/virtual-client').then((m) => m.TableVirtualClientDemo),
          files: FAKE,
          value: false,
        },
      },
      {
        id: 'server',
        title: 'From your server',
        text: [
          'With `fetchFn`, the table asks for page 0, sizes the scrollbar to `totalElements`, and then asks only for the pages under the scroll position. Drag the scrollbar to the middle: the log shows the one or two pages asked for, not every page before them. Rows whose page has not arrived are placeholders of the same height.',
        ],
        demo: {
          src: 'virtual-fetch.ts',
          load: () => import('../demos/virtual-fetch').then((m) => m.TableVirtualFetchDemo),
          files: FAKE,
          value: false,
        },
        list: [
          '`pageSize` is how many rows each request asks for. 50 to 100 suits virtual scrolling; `fetchFn` and `NguTableQuery` stay the same as with a pager.',
          'Each page is asked for once. Pages far from the scroll position are dropped (at least twelve are kept) and asked for again on the way back, so memory stays bounded however far people scroll.',
          'A new search, sort or filter, or `reload()`, cancels what is in flight, empties the list and starts again at the top from page 0. `(queryChange)` emits each page request.',
          'When a later page fails, the rows already shown stay and the footer offers Try again, which asks again for the rows in view.',
        ],
      },
      {
        id: 'height',
        title: 'Row height and columns',
        text: [
          'Every virtual row has the same height, which places any row without drawing the ones before it. The table measures the first rows it draws and uses the tallest; set `[rowHeight]` (px) when later rows are taller, such as a two-line cell template. Cells stay on one line and long text ends in an ellipsis; `wrap` has no effect.',
          'Columns are sized for the longest value in each, taken from a spread of rows across the whole list (the pages loaded, with `fetchFn`) and every row drawn so far, so rows scrolling in do not make the columns jump: they only ever grow. Give a column a `width` to decide it yourself.',
        ],
        code: [
          {
            code: `<ngu-table [fetchFn]="loadOrders" [columns]="columns"
           pagination="virtual" [pageSize]="100" maxHeight="calc(100vh - 12rem)" />`,
            lang: 'angular-html',
          },
        ],
      },
      {
        id: 'notes',
        title: 'Good to know',
        list: [
          'Screen readers hear the whole count: the table has `aria-rowcount` and each drawn row its `aria-rowindex`.',
          'Tab moves through the rows that are drawn; scrolling brings the others in.',
          'Export writes every matching row with rows in hand, and the rows loaded so far with `fetchFn`.',
          'Browsers cap how tall an element can be, so one list can hold a few hundred thousand rows at the default height.',
        ],
      },
    ],
  },

  messages: {
    title: 'Text and translations',
    description: 'Replace every built-in string, or switch language while the table is on screen.',
    sections: [
      {
        id: 'messages',
        title: 'Messages',
        text: [
          'Pass `messages` to `provideNguTableConfig`. Keys you leave out keep their English text, and nested providers merge. A signal switches language live. Strings that count take a function, so plurals and number formats are yours.',
        ],
        demo: {
          src: 'messages.ts',
          load: () => import('../demos/messages').then((m) => m.TableMessagesDemo),
          files: FAKE,
          value: false,
        },
        after: [
          'Inputs such as `searchPlaceholder`, `addLabel`, `emptyTitle`, `emptyMessage` and `deleteMessage` override a message for one table. Every key is listed in [Config and types](/api/types#messages).',
        ],
      },
    ],
  },

  theming: {
    title: 'Theming',
    description:
      'The table reads CSS variables shared with ngu-form and ngu-dropdown, and every class is prefixed for overrides.',
    sections: [
      {
        id: 'variables',
        title: 'CSS variables',
        text: [
          "Set them on any ancestor: `:root` for the app, or a wrapper for one table. Without them the table picks light or dark defaults from the page's `color-scheme`.",
        ],
        demo: {
          src: 'theming.ts',
          load: () => import('../demos/theming').then((m) => m.TableThemingDemo),
          files: FAKE,
          value: false,
        },
        table: {
          caption: 'CSS variables',
          columns: ['Variable', 'Used for'],
          rows: [
            [
              '`--ngu-primary` / `--ngu-on-primary`',
              'Primary buttons, the current page, sort arrows, links, avatars, progress.',
            ],
            ['`--ngu-focus-color`', 'Focus rings.'],
            [
              '`--ngu-border-color`',
              'Card, buttons, inputs, heading rule. Row lines are a lighter mix of it.',
            ],
            ['`--ngu-radius`', 'Card, buttons and inputs.'],
            ['`--ngu-surface`', 'Card, buttons, filter panel and dialog background.'],
            ['`--ngu-hint-color`', 'Headings, the footer, placeholders, icons.'],
            ['`--ngu-table-head-bg`', 'The heading row.'],
            ['`--ngu-table-row-hover` / `--ngu-table-stripe`', 'Row hover and stripes.'],
            [
              '`--ngu-success-color`, `--ngu-error-color`, `--ngu-warning-color`, `--ngu-info-color`',
              'Badge tones (`accent` uses the primary color, `neutral` the hint color); the error color also colors the Delete button.',
            ],
            ['`--ngu-skeleton-color`', 'Loading placeholders and progress tracks.'],
            ['`--ngu-table-overlay-shadow`', 'Filter panel and dialog shadow.'],
          ],
        },
      },
      {
        id: 'classes',
        title: 'Classes',
        text: [
          'Styles are not encapsulated and every class starts with `ngu-tbl-`, as with Angular Material, so an app can override any rule without `::ng-deep`: `.ngu-tbl-toolbar`, `.ngu-tbl-table`, `.ngu-tbl-row`, `.ngu-tbl-badge--warning`, `.ngu-tbl-footer`, `.ngu-tbl-filter`, `.ngu-tbl-dialog` and so on. `surface="false"` drops the card when the table already sits in one.',
        ],
      },
    ],
  },

  accessibility: {
    title: 'Accessibility',
    description:
      'What ngu-table does for keyboard and screen reader users, and what is left to you.',
    sections: [
      {
        id: 'built-in',
        title: 'Built in',
        list: [
          'A real `<table>` with `scope="col"` headings. Each sortable heading is a button, and the heading carries `aria-sort`.',
          'The body is `aria-busy` while a page loads, the range ("Showing 11–20 of 57") is a polite live region, so a page turn or a search is announced, and a failed load is an alert.',
          'Every icon button has a name (View, Edit, Delete, First page, Page 3...), and the current page has `aria-current="page"`.',
          'The filter button says whether its panel is open (`aria-expanded`, `aria-controls`). The panel follows its button in the tab order, Escape closes it and puts focus back on the button.',
          'Delete asks in a native modal `<dialog>`: focus moves to Cancel, stays inside, Escape cancels, and focus returns to the Delete button.',
          'Clickable rows are in the tab order and open with Enter; buttons inside them keep their own action.',
          'A virtual table gives the whole row count with `aria-rowcount` and each drawn row its place with `aria-rowindex`.',
          'Boolean cells are read as Yes or No; avatars and decorative icons are hidden from screen readers.',
          'Logical CSS properties for right-to-left pages, `prefers-reduced-motion` and forced colors are respected. This site is checked with axe in light and dark mode.',
        ],
      },
      {
        id: 'yours',
        title: 'Up to you',
        list: [
          'Give each table a name with `ariaLabel`, or a heading right above it.',
          'Label the controls you put in the filter panel and the toolbar.',
          'Keep custom cell templates readable as text: an icon alone needs a visually hidden label.',
        ],
      },
    ],
  },
};
