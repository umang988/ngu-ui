# Changelog

## 0.1.3 (unreleased): Focus, blur and row events

### Added

- `(focused)` and `(blurred)`: focus came into the control, or left it and its open panel.
  Moves between its own parts (the field, the search box, the clear button) do not count.
  Each emits the `FocusEvent`.
- `(added)` and `(removed)`: the one row the user added to or took out of the selection. In
  single mode, choosing a row removes the one before it.
- `(cleared)`: the clear button was used, after a `(removed)` for each row.
- A docs page, [Events](https://ngu-dropdown.netlify.app/events), with a live log of every
  output and the DOM events the tag already passes on, such as `(keydown)` and `(click)`.

### Fixed

- With `multiple`, `(selectionChange)` left out rows chosen before the user arrived (a value
  from a form or a restored draft) when only `[options]` or a loaded page knew them. It now
  emits the whole selection.
- Pressing the panel's footer or a notice moved focus to the page, so the arrow keys stopped
  working until the search box was clicked again. Focus now stays where it was.
- In Chrome and Firefox, Tab from the search box landed on the list (both browsers make a
  scrolling element focusable), and closing the panel then dropped focus on the page. Tab now
  goes on to the next field.
- In Safari and Firefox on macOS, which do not focus a button on click, a list opened with the
  mouse and without a search box ignored the arrow keys. A click now focuses the field.

## 0.1.2 (2026-10-13): Docs for AI coding agents and two fixes

### Added

- The package ships every docs page as Markdown, with the source of every demo, in `docs/`,
  so AI coding agents read the docs of the installed version.
- `ng add ngu-dropdown` and `ng g ngu-dropdown:ai` write a block into `AGENTS.md` (and
  `CLAUDE.md` or `GEMINI.md` when the project has them) with the rules agents get wrong most
  often and an index of those files. Running it again replaces the block; `--remove` takes it
  out.
- `skills/ngu-dropdown`, the same notes as an Agent Skill.
- The docs site serves `llms.txt`, `llms-full.txt` and every page as `.md`.
- `optionValue`, `optionLabel` and `pageSize` accept `undefined`, which means the default from
  `provideNguDropdownConfig`. Wrappers can now pass an option through without overriding the
  app's config.

### Fixed

- A dropdown that becomes disabled or read-only while its panel is open now closes the panel.
  Before, only a reactive form's `setDisabledState` closed it, and options could still be picked.

## 0.1.1 (2026-10-11): Docs links

No code changes.

### Changed

- The npm page links the docs and live demos at
  [ngu-dropdown.netlify.app](https://ngu-dropdown.netlify.app), as its homepage and from
  the README.
- The README's ngu-form link opens the ngu-form docs site instead of its GitHub folder.

## 0.1.0 (2026-10-11): First release

Extracted from a production app's dropdown and made standalone.

### Added

- **Server mode.** `[fetchFn]` loads one page at a time as the list is scrolled and
  searched. The scrollbar is sized to `totalElements`, pages are kept in a sparse map (at
  most twelve), a slot whose page has not landed shows a placeholder of the same height,
  and a new search, filter or sort cancels requests in flight. `fetchFn` may return an
  Observable or a Promise and receives an `AbortSignal`.
- **Client mode.** `[options]` searched in the browser, ignoring case and accents, and
  virtualized. The search box shows above eight options (`showSearch` overrides).
- **`lookupFn`** names keys no loaded page covers, such as ids an edit form loaded.
  `[selectedOption]` does the same with rows you already have.
- **Selection.** `multiple` with chips and "+N more", `optionDisabled`, `clearable`,
  `readonly`, `(selectionChange)` with the chosen rows.
- **Forms.** Signal Forms `[formField]`, reactive forms and `ngModel` through one
  `ControlValueAccessor`. Disabled, read-only and required follow the form; the invalid
  style shows once invalid and touched, or as `[errorShown]` says.
- **Labels.** `optionValue` and `optionLabel` are dot paths (`employee.name`), and
  `optionLabel` also takes a function that joins several fields (`skuCode - description`).
  The label drives display, client search, type-ahead, chips and screen readers.
- **Templates.** `nguDropdownOption` and `nguDropdownSelection`.
- **Configuration.** `provideNguDropdownConfig` sets default paths, sizes and every
  built-in string (a signal switches language live), and a `rowMemory` that names keys
  restored into a form control.
- **Accessibility.** ARIA combobox and listbox with `aria-activedescendant`,
  `aria-setsize` and `aria-posinset` on virtual rows, a live result count, Escape that
  closes only the list, focus returned to the field, type-ahead without a search box,
  forced colors and reduced motion.
- **Theming** through ngu-form's `--ngu-*` CSS variables; unencapsulated `ngu-dd-` classes.

### Fixed (compared with the original component)

- Arrow keys did nothing once the list was open when it had no search box (eight options
  or fewer), because focus stayed on the trigger.
- Closing the list deep in a long result set and opening it again showed an empty panel
  until it was scrolled.
- Clicking an option in multiple mode moved focus out of the search box.
- A click outside whose propagation another handler stopped left the list open.
- A value written in after its page had loaded showed the bare key instead of its name.
