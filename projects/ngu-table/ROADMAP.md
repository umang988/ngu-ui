# ngu-table roadmap

ngu-table is a data table for Angular list screens: one `fetchFn` and a column list give a
toolbar, typed cells, row actions, filters and paging. This is the plan from the first
release to a stable 1.0.

**How to read it**

- `[x]` shipped, `[ ]` planned. Items inside a phase can ship in any order.
- Size: **S** is under a day, **M** is one to three days, **L** is a week or more.
- An item is finished only when it meets the [definition of done](../../ROADMAP.md#definition-of-done)
  shared with ngu-form.

---

## Shipped in v0.1

- [x] Three sources of rows: `fetchFn`, rows in client mode, rows paged by the app.
- [x] Fourteen column types, cell templates, row action templates, an empty template.
- [x] Toolbar: debounced search, Clear, filter panel, tabs with `commitFilters()`, Add, Import,
      CSV Export.
- [x] View, Edit and Delete with per-row rules and a native confirmation dialog; clickable rows.
- [x] Pager with page window, rows per page and deep-link clamping; two-way page, size, sort.
- [x] Config for messages, formats, currency grouping, badge words and search memory.
- [x] Server-side rendering with the first page in the HTML; docs site with axe in both themes.
- [x] Virtual scrolling, in hand and from the server (shipped ahead of Phase 3).

## Phase 1 · v0.2 Selection and bulk actions

- [ ] **Checkbox column** (M). `selectable` adds a first column of checkboxes and a header
      checkbox for the page; `[(selection)]` holds row keys (by `rowKey`), so a selection
      survives paging, sorting and reloads. Space toggles the focused row.
- [ ] **Select all matching** (M). After the header checkbox selects a page, offer "Select all
      5,000": the selection becomes the query (search, filters) minus excluded keys, which the
      app sends to its bulk endpoint instead of 5,000 ids.
- [ ] **Bulk action bar** (S). `[nguTableBulk]` content replaces the toolbar while rows are
      selected, with the count and a clear button.
- [ ] **Selected rows in the export** (S). Export writes the selection when there is one.
- [ ] **Accessible selection** (S). Named checkboxes, `aria-selected` on rows, the count in a
      live region.

**Done when** a list can select across pages, select all matching, and run a bulk delete.

## Phase 2 · v0.3 Column control

- [ ] **Column chooser** (M). A toolbar menu to show and hide columns, keeping `hidden` as the
      default.
- [ ] **Reorder** (M). Drag a heading, or move it with the keyboard from the chooser.
- [ ] **Resize** (M). Drag a heading edge, or use arrow keys on a focused handle; double-click
      fits the content.
- [ ] **Sticky columns** (M). `sticky: 'start' | 'end'` on a column, and a sticky actions
      column, for wide tables that scroll sideways.
- [ ] **Saved layout** (M). Order, widths, hidden columns, page size and sort kept per
      `stateKey` through a storage hook in the config (local storage by default), with a
      reset in the chooser.

**Done when** a wide table can be arranged by mouse or keyboard and comes back the same.

## Phase 3 · v0.4 Expanding rows and large lists

- [ ] **Detail rows** (M). `<ng-template nguTableDetail let-row>` under a row, opened by a
      toggle column; one or many open at a time; `aria-expanded` on the toggle.
- [ ] **Lazy details** (S). A detail can load its own data and show a loading state.
- [x] **Virtual scrolling** (L). `pagination="virtual"`: client and server mode draw only
      the rows in view, with a sticky heading, a measured row height and columns sized for
      the widest values.
- [x] **Server-side virtual scrolling** (L). The same `pagination="virtual"` in fetch mode
      asks only for the pages under the scroll position, with ngu-dropdown's sparse page buffer
      and a scrollbar sized to the server's total.

**Done when** a 50,000-row list scrolls smoothly in both client and fetch mode.

## Phase 4 · v0.5 Inline editing

- [ ] **Cell editors** (L). Edit a cell in place by type: text, number, date, select, and an
      ngu-dropdown for lookups.
- [ ] **Row editing** (M). Edit, Save and Cancel per row; `(rowSave)` may return a Promise,
      shown as pending and as an error on the row when it fails.
- [ ] **Validation** (M). Rules per column, errors on the cell, Save blocked while invalid;
      consider ngu-form field specs for the editors.
- [ ] **Grid keyboard** (M). Arrow keys between cells, Enter to edit, Escape to cancel, the ARIA
      grid pattern while editing.
- [ ] **New rows** (S). Add a row inline at the top.

**Done when** an order's lines can be edited, validated and saved without leaving the list.

## Later

- [ ] **Typed fields** (M). `field` checked against the row type's dot paths.
- [ ] **Cards on phones** (M). An opt-in layout that stacks each row as a card under a width.
- [ ] **Totals and column groups** (M). A footer row of sums and grouped headings.
- [ ] **Server export hook** (S). An `exportFn` for whole-set exports in fetch mode.
- [ ] **URL state** (S). A helper that keeps page, sort, search and filters in the query string.
- [ ] **Test harness** (M). `ngu-table/testing` with CDK harnesses and a Playwright helper.
- [ ] **Docs for AI agents** (S). The package docs, AGENTS.md block and llms.txt the other
      packages have.

## Known gaps from v0.1

- [ ] **Export in fetch mode** writes only the page in hand; see the server export hook.
- [ ] **Search memory** keeps the search text only, not sort, page or filters.
- [ ] **The filter panel** closes when the page scrolls instead of following its button;
      CSS anchor positioning could keep it attached.
- [ ] **After a confirmed delete** the row's Delete button is gone, so focus falls back to the
      page. Move it to the next row.
- [ ] **Virtual rows** are one line and one height, and Tab reaches only the drawn rows. Arrow
      key navigation that scrolls rows in would fix the second.
- [ ] **Component styles** are about 13 kB minified (3 kB compressed). Split the rarely used
      parts (dialog, filter panel) if apps feel it.
