# Changelog

## 0.1.0 (unreleased): First release

### Added

- `<ngu-table>` with three sources of rows: `[fetchFn]` (the table owns the query and asks the
  server again when page, size, search, sort or applied filters change), `[rows]` with
  `mode="client"` (searched, sorted and paged in the browser), and `[rows]` alone (your
  component pages through `[(page)]`, `[(pageSize)]`, `[(sort)]` and `(searchChange)`).
- `fetchFn` may return an Observable or a Promise and receives an `AbortSignal`. A new query
  cancels the request in flight; `reload()` runs the current one again; a failed request shows
  a notice with Try again and emits `(loadError)`. On the server, rendering waits for the
  first page.
- Column types `text`, `number`, `currency`, `percent`, `date`, `datetime`, `badge`,
  `boolean`, `avatar`, `image`, `email`, `phone`, `link` and `progress`, with dot paths,
  `formatter`, `hidden`, `width`, `wrap`, `sortField` and `exportField`. Cells are formatted
  once per row object.
- Templates: `nguTableCell` for a column, `nguTableRowActions` for extra row buttons,
  `nguTableEmpty` for the empty notice.
- Toolbar: a debounced search box with `searchMinLength`, a Clear button that resets search,
  sort and filters in one request, a filter panel of your `[nguTableFilters]` content applied
  with one button, `[nguTableTabs]` and `commitFilters()` for controls that apply at once,
  `[nguTableToolbar]` for your own controls, and Add, Import and CSV Export buttons.
- Row actions: View, Edit and Delete with `canEdit` and `canDelete` rules, a native modal
  confirmation dialog, clickable rows that also open with Enter, and `link` columns.
- A pager with a window of page numbers, a rows-per-page picker, and a page clamped to the
  last one once the total is known.
- Virtual scrolling with `pagination="virtual"`: only the rows in view are drawn, inside
  `maxHeight` (default `32rem`). Rows in hand are searched and sorted as a whole; with
  `fetchFn` the scrollbar is sized to the server's total and only the pages under the scroll
  position are asked for, kept in a bounded buffer, with placeholders until they arrive. The
  row height is measured (or set with `rowHeight`), columns are sized for the longest values
  in a sample of the list, and
  `aria-rowcount` / `aria-rowindex` give screen readers the whole count.
- `provideNguTableConfig`: messages (a signal switches language live), page size and choices,
  row key, search debounce and minimum length, empty text, date formats, currency code,
  `currencyLocale` for per-currency grouping, `badgeTones`, and a `searchMemory` hook that keeps
  each table's search between screens.
- Styles that read the shared `--ngu-*` variables, with light and dark defaults from the page's
  `color-scheme`, right-to-left support, reduced motion and forced colors.
