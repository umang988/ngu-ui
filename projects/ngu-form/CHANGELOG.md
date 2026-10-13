# Changelog

## 0.6.0 (2026-10-13): Ecosystem and developer experience

The first version on npm. It also contains everything listed under 0.2.0 to 0.5.0 below,
which were never published on their own.

### Added

- **Angular Material renderer** (`ngu-form/material`). `provideNguMaterial()` renders text,
  number, amount, password, textarea, time, month and week fields as `mat-form-field` inputs
  (prefix and suffix text, counter, show-password button), selects as `mat-select`, checkboxes,
  groups, switches and consent as `mat-checkbox` and `mat-slide-toggle`, radios and segments as
  `mat-radio-group` and `mat-button-toggle-group`, sliders as `mat-slider`, tags as chips, and
  dates and ranges with Material's pickers through the app's `DateAdapter`. Options:
  `appearance`, `floatLabel`, `subscriptSizing`, `dateAdapter`.
- **PrimeNG renderer** (`ngu-form/primeng`). `provideNguPrimeNG()` renders fields with
  `pInputText`, `p-inputmask`, `p-password`, `pTextarea`, `p-inputnumber`, `p-select`,
  `p-multiselect`, `p-checkbox`, `p-toggleswitch`, `p-radiobutton`, `p-selectbutton`,
  `p-slider`, `p-datepicker` and `p-rating`, with labels above and errors as `p-message`.
  Tags and one-time codes keep ngu-form's controls: `p-inputtags` and `p-inputotp` fail axe.
- **Whole-field renderers.** `provideNguFieldRenderers({ type: Component })` hands a component
  the whole field through one `context` input (`NguFieldRenderContext`): translated texts and
  options, the error only while it should show, `required`, the transform, the counter, i18n,
  the look and `touch()`. `nguField` and `nguControl` templates still win for their paths.
- **`nguBind`**, a directive that connects a `ControlValueAccessor` (or a plain input) to a
  field without `[formField]`, leaving the control's own `invalid` and `required` inputs to the
  renderer, with `nguBindFormat` and `nguBindParse` to convert values.
- **Server dropdown** (`ngu-form/dropdown`). `provideNguDropdown()` registers `type: 'dropdown'`
  on top of `ngu-dropdown`: server paging, search, virtual scrolling, `lookup` for saved
  values, multiple with chips on list values. Closes the combobox item postponed in 0.4.
- **Unstyled mode.** `theme="none"` on `<ngu-form>` or `<ngu-view>`, or
  `provideNguFormConfig({ theme: 'none' })`, drops ngu-form's visual CSS and keeps the markup,
  its classes and its behavior (screen-reader text, the `cols` grid, long-list scrolling,
  overlays and drag handles keep working).
- **Class map.** `provideNguFormConfig({ classes })` adds classes to the elements ngu-form
  renders, for Tailwind or other utility CSS: 28 slots, from `form`, `field`, `label` and
  `control` to `adorned` and `affix` (controls with a prefix, suffix or icon), `option`,
  `chip`, `warning`, `description`, `tabs` and `tab`, `panel`, `steps` and `step`, `actions`,
  `errorSummary`, `notice` and `value` (view mode). `injectNguLook()` gives custom renderers
  the same theme and classes.
- **Classes per form, group and field.** `[classes]` on `<ngu-form>` and `<ngu-view>` adds to
  the app-wide map, slot by slot. `classes` on a group, list or run-time field list reaches
  everything inside it; on a field, only that field. `class` puts classes on the element itself:
  the `<ngu-field>`, `<ngu-group>`, `<ngu-array>` or `<ngu-dynamic>`, or static content.
  Run-time fields take both as plain JSON. `mergeClasses` in the config joins the levels, for
  example with `twMerge`, so an inner utility replaces an outer one.
- **State attributes.** Fields carry `data-invalid` (while an error shows), `data-warning`,
  `data-required`, `data-disabled`, `data-readonly` and `data-pending`; groups and lists
  `data-invalid`; open panels `data-open`; finished wizard steps `data-done`; and a control in an
  adorned box `data-adorned`. Utility variants such as `data-invalid:` style them.
- **Tailwind preset** (`ngu-form/tailwind`). `nguTailwind` is a complete class map for
  Tailwind 4, light and dark. `ngu-form/tailwind.css`, imported after Tailwind, points Tailwind
  at the preset's classes in `node_modules`, adds the `ngu-accent` theme color, and draws the
  parts without a slot (chevrons, step markers, problem badges, the warning mark).
- **Density and size.** `density` (`compact`, `normal`, `spacious`) and `size` (`sm`, `md`,
  `lg`) on `<ngu-form>` or in the config. They change the defaults of the spacing and text
  tokens; tokens set by the app still win. New token `--ngu-font-size`.
- **Token list.** `NGU_TOKENS` lists every CSS custom property with its default, its use and
  whether density or size scales it; a spec keeps it in step with the styles.
- **Icon adornments.** `prefixIcon` and `suffixIcon` name icons registered with
  `provideNguIcons` (also on run-time fields); `nguPrefix` and `nguSuffix` templates add
  anything before or after one field's control. Icons are hidden from screen readers, and a
  click on one focuses the control.
- **Test harnesses** (`ngu-form/testing`): `NguFormHarness` (`field`, `fields`, `list`, `fill`,
  `submit`, `next`, `back`, `getStep`, `getErrors`, `getFormError`, `isBusy`),
  `NguFieldHarness` (filters by label, path and type; `getValue` and `setValue` for every
  built-in control) and `NguListHarness`, on Angular CDK testing.
- **Playwright helper** (`ngu-form/playwright`): `nguForm(page)` with the same calls, typed
  against Playwright's locator without depending on it.
- **Model paths in the DOM.** Fields and lists carry `data-ngu-path` (`items.0.sku`) and
  fields `data-ngu-type`.
- **Debug panel** (`ngu-form/debug`): `<ngu-form-debug [form]>` shows the value, state, unsaved
  changes, errors by path and changed fields; `debugRows(form)` returns the same rows.
- **Schematics.** `ng add ngu-form` (renderer, uploads, sample form);
  `ng g ngu-form:form --model=Name` (a component from an interface);
  `ng g ngu-form:from-schema` (a typed model and component from a JSON Schema or an OpenAPI
  request body); `ng g ngu-form:from-formly` (ngx-formly field arrays to ngu-form specs).
- **Lazy custom types.** `provideNguFieldTypes({ editor: () => import(...) })` loads a renderer
  on first use; the field shows its label and a placeholder until then, and server rendering
  waits for it.
- **Single fields.** `<ngu-field>` takes a plain spec as `def`, for hand-written Signal Forms
  forms. Resolved `choices` are also passed to control renderers that declare them.
- **Diagnostics.** Spec mistakes throw with a code (`NGU-101` to `NGU-111`) and a link to the
  new Diagnostics page; `NGU-103` suggests the model key a misspelled spec key meant. Development
  builds warn about template paths that match no field, with the nearest path (`NGU-201`),
  types without a renderer, naming the provider to add (`NGU-301`), unknown icons (`NGU-302`),
  registry entries that are not components (`NGU-304`) and two live forms sharing a draft key
  (`NGU-401`).
- **Docs for AI coding agents.** The package ships every docs page as Markdown, with the
  source of every demo and example, in `docs/`, so agents read the docs of the installed
  version instead of guessing from training data. `ng g ngu-form:ai` (also offered by
  `ng add`) writes a block into `AGENTS.md`, and into `CLAUDE.md` or `GEMINI.md` when the
  project has them: the rules agents get wrong most often, how to check generated code, and an
  index of those files. Running it again replaces the block; `--remove` takes it out.
- **Forms from a screenshot.** `docs/guides/from-image.md` takes an agent from an image of a
  form to a typed spec (a table from what it sees to field types and options), its look (theme
  tokens) and a check against the image. `skills/ngu-form-from-image/scripts/snap.mjs` renders
  a page, saves a screenshot, prints console problems and lists the rendered fields row by row.
- **Agent Skills.** `skills/ngu-form` and `skills/ngu-form-from-image` in the Agent Skills
  format, for tools that load skills from packages.
- Exported for renderers: `NguTransform`, `NguStrength`, `FieldTransform`.
- Docs: Angular Material, PrimeNG, Unstyled and Tailwind, Renderers, Icons, Server dropdown,
  Testing, Schematics, Debug panel, Single fields, Diagnostics, From ngx-formly, From reactive
  forms, AI coding agents; Theming gained density and size, and its token table now comes from
  `NGU_TOKENS`. The site serves `llms.txt`, `llms-full.txt` and every page as `.md`.

### Changed

- **Default styles carry one more class of specificity.** Every visual rule is scoped so that
  `theme="none"` can turn it off. App CSS that overrode ngu-form with a single class may need
  `.ngu-form` in front; restyling through tokens is unaffected.
- `NguFieldTypes` values may be loader functions; code that read the registry directly should
  expect them.
- Optional peer dependencies: `@angular/cdk`, `@angular/material`, `primeng` and
  `ngu-dropdown`, each needed only by its entry point.

### Fixed

- In unstyled forms, each tab panel no longer shows its print-only title on screen.
- A field touched by code, for example by Signal Forms' `submit()` around a lone
  `<ngu-field>`, now shows its errors. The autofill guard (a touch needs the user's own blur)
  applies only once autofill has blurred the field.
- Selecting text in a field inside a tab no longer jumps back to the first tab. The browser's
  `select` event bubbled out of the input and reached the tabs, which read it as a tab choice.
- Server-side rendering: fields with a mask, `parse`, `format` or `localized` no longer throw on
  the server, whose DOM has no `getRootNode`. Drafts are never read or written on the server,
  even where Node.js has a `localStorage` of its own.
- Server-side rendering with incremental hydration (`provideClientHydration(withIncrementalHydration())`):
  wizards, tabs, accordions, table lists and the controls that load on first use (phone, tags,
  one-time code, rating, date range and others) now render on the server and hydrate on the
  client. Before, the server sent empty placeholders for them. Without incremental hydration
  nothing changes.
- `type: 'dropdown'` fields follow `provideNguDropdownConfig` for `optionValue`, `optionLabel`
  and `pageSize`; before, ngu-form always passed `'value'`, `'label'` and 50. Needs ngu-dropdown
  0.1.2.
- `NguListHarness` and the Playwright list driver add, remove and read the title of the list
  itself when its rows hold lists of their own. `isRequired()` reads the field's
  `data-required` attribute, so it is also true for single checkboxes and for fields drawn by
  the Material and PrimeNG renderers.
- The types of `ngu-form/upload` no longer let apps import internal helpers (`isFile`,
  `asList`, `Row` and others) that exist only at the type level.

## 0.5.0 (not published): Complex flows and layout

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

## 0.4.0 (not published): Field type catalogue

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

## 0.3.0 (not published): Validation, data and language

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

## 0.2.0 (not published): Everyday forms

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
