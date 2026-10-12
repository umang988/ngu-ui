# Changelog

## 0.5.0 (unreleased): Complex flows and layout

### Added

- **Wizards.** `defineForm(..., { layout: 'steps' })` shows each top-level group or list as a
  step, with a step list, "Step 2 of 4" in the step heading, and Back, Next and submit buttons.
  Next shows the current step's errors and stays while it is invalid, after waiting for async
  checks; Enter in a field does the same. A step with `hidden` is skipped. Later steps open
  only once every step before them is valid, and a refused submit returns to the first step
  with problems. `def.steps` (`FormSteps`) has `keys`, `current`, `index`, `count`, `first`,
  `last`, `next()`, `back()`, `goTo()` and `canGoTo()` for custom controls.
- **Review step.** `review: true` (or a title) ends a wizard with every answer under its
  step and an Edit button per step; after an edit, Next becomes "Back to review".
- **Steps in the URL.** `stepParam: 'step'` keeps the current step in the query string through
  `Location`: each step is a history entry, and a reload opens the same step when the steps
  before it are valid, or else the first step that still needs answers. No router needed.
- **Tabs.** `layout: 'tabs'` on a group, or on the form, shows child groups and lists as tabs
  (the ARIA tabs pattern, arrow keys mirrored right to left), each with a count of its problems
  once errors show. A refused submit selects the first tab with a problem.
- **Collapsible panels.** `collapsed: true | false` on a group, list or run-time field list
  makes it a panel that starts closed or open; `layout: 'accordion'` does this for every child,
  the first one open. A refused submit opens every panel with a problem.
- **Field order.** `order` on fields, groups, lists, run-time lists and `$` content sorts them
  inside their group like CSS `order`, which also sets the focus order.
- **List tools.** `reorder: true` adds Move up and Move down buttons (focus stays on the moved
  row; the new position is announced) and a drag handle for pointers. `duplicate: true | label`
  copies a row next to itself as a new row. `summary: (item, index) => string` collapses rows
  to one line; new rows start open, and rows with problems open after a refused submit.
- **Table layout.** `layout: 'table'` on a list of objects with plain fields: one column per
  field headed by its label, `span` as the column width, a row number header per row, and
  labels kept on each control for screen readers. Below `sm` the rows become cards again.
- **Long lists.** `virtual: true` renders only the rows in view inside a box
  `--ngu-list-height` tall, with `aria-setsize`/`aria-posinset` (or `aria-rowcount` and
  `aria-rowindex` in tables). A refused submit brings the first problem row into view, and a
  line under the list names the other rows with problems. Printing renders every row.
- **Nested lists** (a list inside a list row) and **run-time fields inside list rows**. Item
  logic receives the innermost row.
- **View mode.** `<ngu-view [form]>` shows label and value pairs: option labels, dates,
  numbers and currencies for the locale, Yes or No, list entries, tables for table lists,
  "Not provided" for empty values, never passwords or captcha tokens. `keys` and `section`
  pick what to show. `display: (value, model) => string` words a value.
- **Whole-form switches.** `readonly` and `disabled` on `defineForm` take a flag, a signal or a
  function and reach every field. Read-only lists hide their buttons; disabled ones show them
  disabled. Both block the submit button.
- **Print styles.** Buttons, the step list and notices are left out; tabs, panels and
  collapsed rows print open; a wizard prints every step, or the review once reached.
- Messages for all of the above, with Hindi and Arabic translations in the demo.
- Docs pages for steps, tabs and accordion, view mode, and the new list sections; the
  "Place an order" example became the "Checkout" wizard.

### Changed

- **Lists of lists and run-time fields inside lists no longer throw.** Lists whose items are
  lists themselves (`string[][]`) still need an object in between.
- Group content inside tabs and panels has no title of its own; the tab or panel header shows
  it. `NguProblemSource` gained an optional `section`.

## 0.4.0 (unreleased): Field type catalogue

### Added

- **Choices.** `type: 'checkbox'` and `type: 'select'` on `string[]` and `number[]`
  properties, with `options`: a checkbox group and a multiple select. `min` and `max` count
  chosen options (`minSelected`, `maxSelected`); `required` needs at least one.
  `type: 'switch'` on booleans (`role="switch"`). `type: 'segmented'` on strings and
  numbers: a radio group drawn as joined buttons.
- **Numbers.** `type: 'range'` with its value shown and read with `prefix` and `suffix`.
  `type: 'currency'` with an ISO `currency` code, formatted for the locale while the model
  holds a number. `type: 'rating'`: stars as native radios, `max` stars (default 5), `0` for
  none.
- **Dates and times.** `type: 'time'`, `'datetime-local'`, `'month'` and `'week'` with ISO
  string values and `min`/`max` in the same format, shown for the locale in messages.
  `type: 'daterange'` on `{ from, to }` with "from before to", bounds, and a message when
  only one end is set (`dateRange`, `dateRangeIncomplete`).
- **Contact and identity.** `type: 'phone'`: a country picker and number stored as E.164,
  with `countries` and `country`, pasted international numbers picking their country, and a
  length check for common countries. `type: 'otp'`: a one-time code drawn as boxes over one
  input with `autocomplete="one-time-code"`, `length` and `characters`. `type: 'url'` (full
  http or https address; `https://` added to a bare domain on blur), `'search'`, `'tel'` and
  `'color'`. `type: 'tags'` on `string[]` with `separators`, paste splitting, duplicate
  checks and `maxLength` per tag.
- **Consent and protection.** `type: 'consent'` on `Date | null`: a checkbox that stores the
  time of acceptance, with an optional `policy` link. `type: 'captcha'` with the
  `NguCaptchaAdapter` contract, `provideNguCaptcha`, and `nguTurnstile`, `nguHCaptcha` and
  `nguRecaptcha`. Tokens are required by default, reset after each submit that reached the
  action, and kept out of drafts and `changes()`.
- **`ngu-form/upload`**, a new entry point with `provideNguUpload()`: `type: 'file'` (pick or
  drop, type and size checks, thumbnails, an `upload` function with progress, Retry and
  abort), `type: 'image'` (a crop dialog with sliders, resizing and output format) and
  `type: 'signature'` (drawn or typed, stored as a PNG data URL). A submit waits for running
  uploads; refused files and failed uploads block it.
- **`NguFieldOptionsMap`**: custom types declare their own spec options, typed per type.
- `NguFormContext.track(promise)`: work that a submit waits for. `NguFormContext.completed`
  counts submits that reached the action.
- The field label has the id `<id>-label`, for custom controls that are not form elements.
- Messages for the new types and controls, and Hindi and Arabic translations in the demo.
- The demo's "Every field type" example, and a Tiptap rich text recipe in the README.

### Fixed

- **Number values in selects and radios.** Choosing an option wrote its value as a string,
  and a radio group bound to a number showed no selection. Options now keep their type.

### Changed

- **Selects and radio groups are rendered by ngu-form's own controls** (`select[nguSelect]`
  and `<ngu-choices>`) instead of binding `[formField]` to each native element. The markup
  is still a native `<select>` and native radios inside a `fieldset` with `role="radiogroup"`.
  Styles that targeted `.ngu-radio-group` should target `.ngu-fieldset` and `.ngu-choice`.
- **Custom types moved to their own branch of the spec types.** A custom type on a string
  field no longer accepts the text-only options (`mask`, `parse`, `format`, `counter`,
  `reveal`, `rows`); it keeps the rules for its value type (`minLength`, `min`, ...) and any
  options declared in `NguFieldOptionsMap`.
- **`rating` is a built-in type.** An app that registered its own `rating` renderer keeps
  it: registered renderers win over built-in ones.
- **A list value with a `type` is one field.** `{ type: 'checkbox' | 'select' | 'tags' }` on
  an array is a single input, not a repeated list; its `LeafDef` has `multiple: true`, and
  `min`/`max` count entries.
- The phone, tags, date range, rating, one-time code, captcha, slider and color inputs are
  `@defer` blocks, so apps download their code only when a form shows one. On the server,
  and for a moment in the browser, they render a placeholder.
- The demo's initial bundle warning budget is 520 kB (it was 500 kB).

## 0.3.0 (unreleased): Validation, data and language

### Added

- `schema` option on `defineForm`: any Standard Schema (Zod, Valibot, ArkType), sync or
  async, validated with Angular's `validateStandardSchema`. Issues show on the field at
  their path; issues without a field are form-level errors.
- `warn` on fields: non-blocking messages in a warning style that never stop a submit.
- `strength` on password fields: meter, checklist and text value, with `min`, `rules` and
  a custom `score`.
- `errorsOn` on a field overrides `<ngu-form errorsOn>` for that field.
- Run-time fields accept `validateAsync`, `debounce`, `pendingText`, `mask` and `errorsOn`;
  date `min` and `max` as ISO strings.
- `mask`, `parse` and `format` on text fields, and `localized` on number fields, through a
  `transformedValue`-based control. Digits from other scripts are read as ASCII digits.
- `Date` model values: inferred as date inputs, with `min`/`max` as `Date` or ISO string,
  native `min`/`max` attributes, and locale-formatted messages. Also for ISO string models.
- `load` option (a `resource`, `httpResource` or any `{ value, isLoading, error }`): skeleton
  fields while loading, reset to each delivered value, a message when loading fails.
  `def.loading()`, `def.loadError()`.
- `draft` option: autosave to localStorage, sessionStorage, IndexedDB
  (`nguIndexedDbDrafts()`) or a custom adapter, restored with a notice and a Discard
  button. Passwords and `persist: false` fields are never stored. `def.draft`.
- `history` option: undo and redo with `def.history`, and Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
  inside the form, announced, with focus moved to the changed field.
- `provideNguMessages`: every built-in text in one catalog (`NGU_DEFAULT_MESSAGES`), as ICU
  templates with plural and select, or functions. A `translate` hook resolves labels, hints,
  placeholders, titles, option labels and validator messages, and built-in messages as
  `ngu.<key>`. Accepts a signal for live language switching. `injectNguI18n`,
  `createNguI18n`, `formatMessage`.
- `<ngu-form errorSummary>`: a GOV.UK-style list of problems with links, focused after a
  refused submit.
- Forced-colors (Windows high contrast) styles for borders, focus, the meter and buttons.
- Theme tokens `--ngu-warning-color`, `--ngu-warning-on`, `--ngu-success-color`,
  `--ngu-skeleton-color`, `--ngu-notice-bg`.

### Changed

- **Built-in texts come from the message catalog.** English wording is unchanged, except
  that counts now use plural forms ("at least 1 character", not "1 characters").
  `failureText` and `invalidAnnouncement` on `<ngu-form>` still work and win over the
  catalog; their defaults moved to `submitFailed` and `invalidSubmit`.
- **A failed async validator** now reports an error with kind `asyncFailed` and its message
  from the catalog. Before, it was kind `async` with a fixed English message. If you check
  `kind === 'async'` to detect failures, check `'asyncFailed'` instead.
- **`LeafDef.min` and `LeafDef.max` are `number | Date | string`**, because date fields take
  date bounds. Custom renderers that read `def().min` as a number should check
  `typeof min === 'number'` first.
- **`ArrayDef.addLabel` and `removeLabel` are `undefined` unless set.** The renderer fills
  in the translated "Add" and "Remove". Only code that reads `def.fields` is affected.
- **Component styles use logical CSS properties** (`inline-size`, `margin-block`, and so
  on). Left-to-right layouts look the same; right-to-left layouts now mirror correctly.
- `ErrorDisplay` is now defined with the other types; the export from `ngu-form` is unchanged.
- **A successful submit ends the "submit attempted" state.** Before, every later edit showed
  its error at once, whatever `errorsOn` said; now `errorsOn` applies again after a save.
- **`deepEqual`, `changes()` and drafts treat only object literals as plain objects.** A
  `File`, `Blob` or `Map` value is compared by identity and is not stored in drafts.

## 0.2.0 (unreleased): Everyday forms

### Added

- `options: (model, scope) => Choice[]` for cascading selects; a value whose option
  disappears is cleared.
- `compute: (model, scope) => value` for read-only fields that update live.
- `required: (model, scope) => boolean | string` for conditional required fields.
- `onChange: (value, ctx)` with `ctx.patch` and `ctx.patchItem`. Runs only after the user's
  own change, so hooks never trigger each other.
- `omitHidden` and `mapValue` options on `defineForm`, and `def.payload()`.
  `SubmitAction<T, TPayload>` and `NguForm`'s `(submitted)` use the payload type.
- `def.changes()`: the values that differ from the last saved state.
- `def.dirty()`, `def.touched()`, `def.valid()`, `def.pending()`, `def.submitting()`.
- `nguUnsavedChangesGuard`, `hasUnsavedChanges(def)` and `<ngu-form [warnOnUnload]>`.
- `provideNguFormConfig({ breakpoints, confirmLeave })`.
- Responsive `cols: { base, sm, md, lg }` on the form, groups, arrays and run-time lists.
- `prefix` and `suffix` text, a character counter for `maxLength`, a show-password button,
  `inputmode` and `enterkeyhint` (inferred where safe), textarea `rows` and `maxRows`.
- Static content under `$` keys: `{ heading }`, `{ text }`, `{ divider: true }`.

### Changed

- **Columns follow the form's width, not the viewport.** A numeric `cols` collapses to one
  column when `<ngu-form>` is narrower than the `sm` breakpoint (480px by default). Before,
  it collapsed when the viewport was 600px or narrower. To get close to the old behavior,
  set `provideNguFormConfig({ breakpoints: { sm: 600, md: 720, lg: 960 } })`.
- **Spans are capped at the current column count** instead of being reset by a media query.
- **A successful submit marks the form as saved.** After the action succeeds (or when there
  is no action), touched and dirty state are cleared and `changes()` starts again from the
  submitted value. The model value is unchanged. If you relied on `dirty()` staying `true`
  after submit, track the submit in your own signal.
- **Inputs, selects and textareas are wrapped** in `<div class="ngu-control">`, which holds
  the prefix, suffix and show-password button. CSS that targets `ngu-field > input` needs
  `ngu-field input` (or `.ngu-control > input`) instead.
- **`NguGroup` no longer has a `span` input.** The parent grid now sets `grid-column` on each
  child. This only matters if you render `ngu-group` yourself.
- **Password fields show a "Show" button by default.** Set `reveal: false` to remove it.
- **Text and textarea fields with `maxLength` show a counter by default.** Set
  `counter: false` to remove it.
