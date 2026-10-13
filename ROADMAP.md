# ngu-form roadmap

ngu-form describes Angular forms in TypeScript. A plain-object spec mirrors the model and
renders as accessible, validated markup on top of Angular Signal Forms. This document is the
plan from today's v0.1 to a stable 1.0 and beyond. It lists every feature a modern form
library is expected to have, grouped into releases, with a checkbox per item.

**How to read it**

- `[x]` shipped, `[ ]` planned. Items inside a phase can ship in any order.
- Size: **S** is under a day, **M** is one to three days, **L** is a week or more.
- Every phase ends with a **Done when** line: the release is cut when that is true.
- An item is finished only when it meets the [definition of done](#definition-of-done).

**Contents**

1. [Shipped in v0.1](#shipped-in-v01)
2. [Principles](#principles)
3. [Phase 1 · v0.2 Everyday forms](#phase-1--v02-everyday-forms)
4. [Phase 2 · v0.3 Validation, data and language](#phase-2--v03-validation-data-and-language)
5. [Phase 3 · v0.4 Field type catalogue](#phase-3--v04-field-type-catalogue)
6. [Phase 4 · v0.5 Complex flows and layout](#phase-4--v05-complex-flows-and-layout)
7. [Phase 5 · v0.6 Ecosystem and developer experience](#phase-5--v06-ecosystem-and-developer-experience)
8. [Phase 6 · v1.0 Release readiness](#phase-6--v10-release-readiness)
9. [Phase 7 · After 1.0: forms for the agent and platform era](#phase-7--after-10-forms-for-the-agent-and-platform-era)
10. [Known gaps to close](#known-gaps-to-close)
11. [Not planned](#not-planned)
12. [Definition of done](#definition-of-done)

---

## Shipped in v0.1

**Defining forms**

- [x] `defineForm(initialOrSignal, spec)` with the model type inferred from the initial value
- [x] A string spec is the label; the input `type` is inferred from the value type
- [x] `type` limited to kinds valid for the value type, checked at compile time
- [x] Every model key must be described; mismatches are compile errors, including nested ones
- [x] Nested objects become groups, written directly or as `{ fields, cols, title }`

**Fields and layout**

- [x] Built-in types: text, email, password, textarea, date, number, checkbox, select, radio
- [x] Options as a list or a signal
- [x] CSS grid groups with `cols` and `span`, collapsing to one column on narrow screens
- [x] Theming through CSS custom properties
- [x] Custom field types through `provideNguFieldTypes` and a typed `NguFieldTypeMap`
- [x] Template overrides per path: whole field (`nguField`) or control only (`nguControl`)

**Arrays and run-time fields**

- [x] Arrays of objects and of primitives: `item`, `newItem`, `min`, `max`, add and remove
- [x] Item logic receives the current item
- [x] Run-time fields from a signal or JSON, with `showIf`, string patterns and defaults
- [x] The model follows the run-time list; `keepRemoved` keeps old values

**Validation and submit**

- [x] Rules: required, minLength, maxLength, pattern, min, max, email
- [x] `hidden`, `disabled`, `readonly` as flags or functions of the model
- [x] Custom `validate` on fields, groups and arrays, with cross-field access
- [x] `validateAsync` with pending state, abort on change, and `debounce`
- [x] Error display modes: `dirty` (default), `touched`, `submit`
- [x] Browser autofill does not count as user interaction
- [x] `[action]` with server errors by typed field path, plus form-level errors
- [x] Submit waits for pending async checks and refuses an invalid form
- [x] `reset()`, `reset(value)` and `patch(partial)`

**Accessibility**

- [x] Labels, `aria-describedby`, native `required`, `aria-invalid` while an error shows
- [x] Refused submit focuses the first problem and announces the count once
- [x] Busy submit uses `aria-disabled` so focus is kept
- [x] Named groups, radiogroups, list semantics, focus management for array rows
- [x] axe-core clean on the demo (WCAG 2.1 A and AA plus best practices)

**Quality**

- [x] 69 unit and component specs; demo app with six example forms

---

## Principles

These decide trade-offs when an item could be built more than one way.

1. **Signal Forms underneath.** Validation, state and binding stay Angular's own. ngu-form adds
   description and rendering, never a parallel state model.
2. **Typed from the model.** A mistake that TypeScript can catch must be a compile error.
3. **Plain objects first.** Specs stay serializable where possible, so a server can send them.
4. **Accessible by default.** No feature ships with axe violations or a keyboard dead end.
5. **Small core, opt-in extras.** Heavy features live in secondary entry points such as
   `ngu-form/material` or `ngu-form/upload`, so apps pay only for what they import.

---

## Phase 1 · v0.2 Everyday forms

Goal: remove the small frictions that almost every real form hits.

Status: all items built on 2026-10-10 and listed in `projects/ngu-form/CHANGELOG.md` under
0.2.0 (not published; 0.6.0 was the first release). 110 library specs pass; axe reports no violations on the demo.

**Dependent and derived values**

- [x] **Dependent options** (S). `options: (model) => Choice[]` for cascading selects such as
      country then state. Clear the dependent value when its option disappears.
- [x] **Computed fields** (S). `compute: (model) => value` renders a read-only field that
      updates live, such as an order total.
- [x] **Conditional required** (S). `required: (model) => boolean | string`, using Angular's `when`.
- [x] **Change hooks** (M). `onChange: (value, ctx) => void` for side effects such as "copy
      billing address to shipping". Runs once per user change, never in a loop.

**Submitted value**

- [x] **Omit hidden fields** (S). `omitHidden: true` on the form drops values of hidden fields
      from the submitted value. Default stays off to avoid surprises.
- [x] **Value mapping** (S). `mapValue: (model) => Payload` shapes what `(submitted)` and the
      action receive, typed separately from the model.
- [x] **Changed fields only** (S). `def.changes()` returns the values that differ from the last
      saved state (initial value, `reset`, `patch`, or a successful submit), for PATCH requests.
      Compared by value rather than dirty flags, so copies made by `onChange` are included.

**State exposed to the app**

- [x] **Form state signals** (S). `def.dirty()`, `def.valid()`, `def.pending()`,
      `def.submitting()` without reaching into the tree.
- [x] **Unsaved-changes guard** (M). `nguUnsavedChangesGuard` for the router plus an optional
      `beforeunload` warning while the form is dirty.

**Everyday polish**

- [x] **Responsive columns** (S). `cols: { base: 1, md: 2, lg: 3 }` with configurable breakpoints,
      replacing the fixed 600px collapse. Measured on the form, not the viewport.
- [x] **Prefix and suffix** (S). Text adornments such as "₹" or "kg". Icon slots moved to Phase 5.
- [x] **Character counter** (S). Shown automatically when `maxLength` is set on text fields.
- [x] **Show password toggle** (S). An accessible reveal button on password fields.
- [x] **Mobile keyboard hints** (S). `inputmode` inferred from the type and overridable per
      field; `enterkeyhint` set per field.
- [x] **Textarea autosize** (S). Grow with content between `rows` and `maxRows`.
- [x] **Static content** (S). Headings, paragraphs or dividers between fields, without a model key.

**Done when** the signup and order demos use every item above, and the README documents each.

---

## Phase 2 · v0.3 Validation, data and language

Goal: fit into existing validation stacks, and work in every language.

Status: everything except the screen reader pass built on 2026-10-10 and listed in
`projects/ngu-form/CHANGELOG.md` under 0.3.0 (not published). 171 library specs pass;
axe reports no violations on every demo page in light and dark, with errors showing, in
Arabic (right to left) and with forced colors. The "Done when" is met by the
"In three languages" example.

**Validation**

- [x] **Standard Schema** (M). Accept a Zod, Valibot or ArkType schema on `defineForm`, using
      Angular's `validateStandardSchema`. Errors land on the matching fields.
- [x] **Warnings** (M). Non-blocking messages, such as "this password is common", shown in a
      different style and never preventing submit.
- [x] **Password strength** (S). Built-in meter with rules and an accessible text value.
- [x] **Async validation for run-time fields** (M). Close the current gap.
- [x] **Validation timing per field** (S). Override the form's `errorsOn` on one field.

**Values in and out**

- [x] **Transforms and masks** (M). `parse` and `format` per field for trim, case, phone and
      card masks, built on Angular's `transformedValue`.
- [x] **Locale-aware numbers and dates** (M). Parse and display with the active locale.
      Numbers are typed and shown in the locale's digits and separators; date bounds in
      messages use the locale. The date picker itself is the browser's, which follows the
      browser's language (see known gaps).
- [x] **Date objects in the model** (M). Allow `Date` values, not only ISO strings.
- [x] **Loading state** (S). Skeleton fields while initial data loads through a `resource`.

**Persistence**

- [x] **Autosave drafts** (M). Debounced save to localStorage, IndexedDB or a callback;
      restore on return with a "draft restored" notice and a discard action.
- [x] **Undo and redo** (M). History of model changes with keyboard shortcuts.

**Language**

- [x] **Message provider** (S). `provideNguMessages()` to translate default errors, button
      labels and announcements, with an interpolation API.
- [x] **Translation keys** (S). Labels and hints accept a key resolved by the provider, so
      apps using `@angular/localize`, Transloco or ngx-translate plug in.
- [x] **Right-to-left layouts** (S). Logical CSS properties throughout and an RTL demo.

**Accessibility**

- [x] **Error summary** (M). Optional GOV.UK-style list of problems at the top after a refused
      submit, each linking to its field.
- [x] **Forced colors and high contrast** (S). Verify borders, focus and errors in Windows
      high-contrast mode. Checked with Chrome's forced-colors emulation; confirm on Windows
      during the screen reader pass.
- [ ] **Screen reader pass** (M). Manual test with VoiceOver and NVDA; record results. The
      script and results table are ready in `docs/screen-reader-pass.md`.

**Done when** a form can validate entirely from a Zod schema, run in Hindi and Arabic, and
restore a draft after reload.

---

## Phase 3 · v0.4 Field type catalogue

Goal: cover the inputs people expect without writing custom renderers. Each type below is a
built-in with keyboard support, labels and validation. Heavier ones ship in their own entry
point.

Status: everything except the combobox built on 2026-10-11 and listed in
`projects/ngu-form/CHANGELOG.md` under 0.4.0 (not published). The combobox followed in
Phase 5 as `ngu-form/dropdown`.
214 library specs pass; axe reports no violations on every demo page in light and dark, and
on the "Every field type" example right to left, with errors showing and with the crop dialog
open. Heavier inputs load on first use through `@defer`, and uploads live in the
`ngu-form/upload` entry point.

**Choice inputs**

- [x] **Checkbox group** (S). For `string[]` or `number[]` from a fixed option set. Written
      `type: 'checkbox'` with `options` on a list.
- [x] **Multi-select** (M). Native `select multiple` with an accessible fallback. Written
      `type: 'select'` on a list; the Ctrl or ⌘ hint shows on devices with a mouse.
- [x] **Toggle switch** (S). A boolean rendered as `role="switch"`.
- [x] **Segmented control** (S). A radio group styled as buttons, for two to five options.
- [x] **Autocomplete / combobox** (L). Static or async search with debounce, keyboard
      navigation and the ARIA combobox pattern. Postponed on 2026-10-11, then closed in Phase 5
      as `type: 'dropdown'` from `ngu-form/dropdown`, on top of the `ngu-dropdown` package
      (server paging, search, virtual scrolling) instead of Angular Aria.
- [x] **Tags input** (M). Free text chips for `string[]`, with paste splitting and limits.

**Numbers, dates and ranges**

- [x] **Slider** (S). `input type="range"` with a visible value and min, max, step. Written
      `type: 'range'`, after the HTML attribute.
- [x] **Currency and amount** (M). Locale-aware formatting while the model holds a number.
- [x] **Time, datetime-local, month, week** (S). Native inputs with ISO string values.
- [x] **Date range** (M). `{ from, to }` with the "from before to" rule built in.
- [x] **Rating** (S). Promote the demo star rating to a built-in.

**Contact and identity**

- [x] **Phone with country code** (M). Country picker plus number, stored as E.164.
- [x] **One-time code** (S). Segmented OTP boxes with `autocomplete="one-time-code"` and
      paste support, so SMS codes autofill on mobile.
- [x] **URL, search, color** (S). Native inputs with matching validation.

**Files and rich content** (entry point `ngu-form/upload`)

- [x] **File upload** (L). Drag and drop, multiple files, type and size rules, previews, upload
      progress, and removal. The model holds `File[]` or uploaded file references.
- [x] **Image upload with crop** (L). Optional crop and resize before upload.
- [x] **Signature pad** (M). Canvas signature stored as a data URL or blob.
- [x] **Rich text adapter** (M). A documented custom-type recipe for an editor such as Tiptap,
      not a bundled editor. In the README, checked against Tiptap 3's types; custom types
      also gained `NguFieldOptionsMap` for their own options.

**Consent and protection**

- [x] **Consent checkbox** (S). Required checkbox with a linked policy and stored timestamp.
- [x] **Captcha slot** (M). Adapter contract for Cloudflare Turnstile, hCaptcha or reCAPTCHA,
      with the token submitted as a field.

**Done when** each type has a spec, appears in a "kitchen sink" demo, and passes axe.

---

## Phase 4 · v0.5 Complex flows and layout

Goal: handle multi-step and data-heavy forms.

Status: all items built on 2026-10-11 and listed in `projects/ngu-form/CHANGELOG.md` under
0.5.0 (not published). 269 library specs pass; axe reports no violations on all 56 demo
pages in light and dark, on every step of the checkout wizard, and on tabs, panels and long
lists with errors showing. The "Done when" is met by the Checkout example. Two choices differ
from the first wording: reordering and long lists are built into ngu-form instead of using
Angular CDK, so the core gains no dependency (the Move up and Move down buttons are the
keyboard path for dragging), and the read-only view is its own component, `<ngu-view>`.

**Multi-step**

- [x] **Wizard** (L). Top-level groups become steps. Next validates the current step, Back
      keeps values, progress shows "Step 2 of 4", and steps can be skipped by a condition.
- [x] **Review step** (M). A built-in summary of all answers with "Edit" links to each step.
- [x] **URL-synced steps** (S). Optional router integration so Back and refresh keep the step.

**Sections**

- [x] **Tabs** (M). Groups as tabs, with an error badge on tabs containing problems.
- [x] **Accordion** (M). Collapsible groups that open automatically to reveal an error.
- [x] **Field order** (S). `order` per field, independent of model order.

**Arrays**

- [x] **Reorder** (M). Up and down buttons first, then drag and drop with keyboard support
      through Angular CDK.
- [x] **Duplicate row** (S). Copy an item next to itself.
- [x] **Collapsible rows** (S). Show a one-line summary per row and expand to edit.
- [x] **Nested arrays** (M). Arrays inside array items.
- [x] **Table layout** (L). Edit an array as a grid with column headers, for line items.
- [x] **Large lists** (M). Virtual scrolling for hundreds of rows.
- [x] **Run-time fields inside arrays** (M). Close the current gap.

**Views**

- [x] **Read-only view mode** (M). Render the same spec as label and value pairs for detail and
      confirmation pages.
- [x] **Whole-form disabled and readonly** (S). One switch for the entire form.
- [x] **Print styles** (S). A clean printed form and view mode.

**Done when** the checkout demo is a four-step wizard with a review step and a line-item table.

---

## Phase 5 · v0.6 Ecosystem and developer experience

Goal: make adoption easy for teams with an existing design system and test setup.

Status: all items built on 2026-10-12 and listed in `projects/ngu-form/CHANGELOG.md` under
0.6.0 (published on 2026-10-13), together with the Phase 3 combobox as `ngu-form/dropdown`. Choices
that differ from the first wording: renderers take over the whole field (label, control and
messages) through a new contract, `provideNguFieldRenderers`, rather than only the control;
PrimeNG controls are bound with a new `nguBind` directive because `[formField]` would mark them
invalid too early; the JSON Schema and OpenAPI import is a schematic that writes typed code, not
a run-time converter; Playwright gets its own small helper (`ngu-form/playwright`) because CDK
harnesses do not run there; the formly codemod writes a side file and leaves the original as it
is. The docs' initial bundle warning moved from 570 to 650 kB: about 31 kB is the new core,
the rest is reactive-forms code that esbuild hoists out of the lazy Material and PrimeNG demos.

**Styling and renderers**

- [x] **Unstyled mode** (S). `theme="none"` keeps structure and class hooks without default CSS.
- [x] **Tailwind preset** (S). Documented class map and an example with Tailwind 4.
- [x] **Tailwind classes everywhere** (M). Added on 2026-10-13: a slot for every visible part
      (28), `[classes]` per form and view, `class` and `classes` per group, list and field
      (also on run-time fields), `mergeClasses` for tailwind-merge, state attributes for
      variants (`data-invalid`, `data-disabled`, `data-open`...), and a ready preset in
      `ngu-form/tailwind` with its CSS file. Owners of paid kits such as Tailwind Plus copy
      their class strings into their own map; ngu-form ships none of them.
- [x] **Angular Material renderer** (L). `ngu-form/material` maps every built-in type to
      Material form fields.
- [x] **PrimeNG renderer** (L). `ngu-form/primeng`, same contract.
- [x] **Design tokens** (S). Publish the CSS variables as a documented token list, with density
      and size variants.
- [x] **Icon adornments** (S). Template slots for an icon before or after a control, such as a
      search icon. v0.2 ships text prefixes and suffixes only.

**Developer tools**

- [x] **Test harness** (M). `NguFormHarness` on Angular CDK testing: `fill()`, `submit()`,
      `errors()`, `field(path)`. Works in unit and Playwright component tests.
- [x] **Debug panel** (S). `<ngu-form-debug>` showing model, validity, dirty paths and errors.
- [x] **`ng add ngu-form`** (M). Schematic that installs, adds providers and a sample form.
- [x] **Form generator schematic** (M). `ng g ngu-form:form signup --model=Signup` creates a
      component with a spec skeleton from an interface.
- [x] **JSON Schema and OpenAPI import** (L). Generate a spec from a JSON Schema or an OpenAPI
      request body.
- [x] **Lazy custom types** (S). `provideNguFieldTypes({ editor: () => import(...) })`.
- [x] **Dev-mode diagnostics** (S). Clear errors for typos in paths, missing providers and
      duplicate keys, with links to the docs.
- [x] **Single-field rendering** (S). Document using `ngu-field` alone in a hand-written form.

**Migration**

- [x] **From ngx-formly** (M). Mapping table and a codemod for common field configs.
- [x] **From reactive forms** (S). Side-by-side guide for `FormGroup`-based forms.

**Done when** a team can install with `ng add`, render with Material, and test with the harness
without reading source code.

---

## Phase 6 · v1.0 Release readiness

Goal: a stable, documented, automated package.

Status: started on 2026-10-13. Everything is built, and CI is green on GitHub. On 2026-10-13
ngu-dropdown 0.1.2 went to npm through the Release workflow with provenance, and ngu-form 0.6.0
was published by hand, because npm's trusted publishing needs the package to exist; 1.0.0 then
comes from CI with provenance. The one item left open needs a workflow run: the screenshot
baselines are made by a workflow on Linux. Choices: releases use our own workflow with the
hand-written changelogs (not Changesets or semantic-release); the API reference is generated
into the docs site from the built `.d.ts` files and their TSDoc, with a committed API report
that CI compares; server rendering is checked by a separate app (`projects/ssr-check`), and
the docs site itself stays a client-rendered app.

**Documentation**

- [x] **Docs site** (L). Guides, API reference, and live examples, built from the demo app and
      deployed on every release. Netlify deploys `main`, which every release comes from.
- [x] **API reference** (M). Generated from TSDoc with every public symbol documented.
      `projects/docs-kit/api/api.mjs` writes one page per entry point and `api/*.api.md`;
      `npm run api:check` fails on an undocumented export or an API change not in the report.
- [x] **StackBlitz examples** (S). One per major feature, linked from the docs. Every demo and
      example has "Open in StackBlitz", which posts it as an Angular CLI project that installs
      the published packages (they need ngu-form 0.6.0 on npm, published on 2026-10-13). Six demos that load the site's own
      theme files have no button.
- [x] **Recipes** (M). Login, signup with async username, checkout wizard, survey from JSON,
      settings page with autosave, admin CRUD with view mode.

**Automation**

- [x] **CI** (M). GitHub Actions running lint, unit tests, build, bundle-size budget and axe
      on every pull request. `.github/workflows/ci.yml`, with angular-eslint: 13 jobs, green on
      GitHub from its first run on 2026-10-13 (about 10 minutes).
- [x] **End-to-end tests** (M). Playwright suite over the demo, including keyboard-only flows.
      `e2e/`: every page of both sites in light and dark (axe, console), keyboard flows,
      IndexedDB drafts, ngu-dropdown, the recipes, in Chromium, Firefox and WebKit.
- [ ] **Visual regression** (M). Screenshots of each field type in light, dark and RTL.
      Written (`/gallery`, `e2e/visual.spec.ts`); ticks once the "Update screenshots" workflow
      has committed Linux baselines.
- [x] **Release automation** (S). Changesets or semantic-release, changelog, npm provenance.
      Our own "Release" workflow instead. Its first real run published ngu-dropdown 0.1.2 on
      2026-10-13. Each package's trusted publisher on npmjs.com needs "Allow npm publish"
      ticked; without it npm only allows `npm stage publish`.

**Quality bars**

- [x] **Bundle budget** (S). Core under an agreed size gzipped, tracked per release. What
      ngu-form adds to a login form's initial JavaScript, over the same form written by hand:
      73.0 kB gzip on 2026-10-13, budget 76 kB (`projects/size-check/budget.json`), in each
      release's notes.
- [x] **Performance** (M). A 500-field form renders and validates without dropped frames.
      `/bench` and `e2e/perf.spec.ts`: render about 0.2 s, 3 ms of handler time per keystroke,
      full check about 0.1 s.
- [x] **SSR and hydration** (M). Forms render on the server and hydrate without mismatches.
      Every example, checked in development mode; wizards, tabs and lazy controls render on
      the server with incremental hydration.
- [x] **Browser support** (S). Documented matrix; last two versions of evergreen browsers.

**Project health**

- [x] **Versioning policy** (S). Major versions follow Angular majors; deprecations live one major.
- [x] **Contributing guide, code of conduct, security policy** (S).
- [x] **Issue and pull request templates** (S).

**Done when** 1.0.0 is published to npm with provenance, the docs site is live, and CI is green.

---

## Phase 7 · After 1.0: forms for the agent and platform era

Goal: make ngu-form forms usable by browser AI agents and modern platform features. Several of
these build on experimental APIs and ship behind explicit opt-in.

**Agents and AI**

- [x] **Docs for coding agents** (M). Shipped early, in 0.6: every docs page as Markdown inside
      the package, an `AGENTS.md` block written by `ng g ngu-form:ai` (and `ng add`), a
      screenshot-to-form guide and skill with a render check, and `llms.txt` on the site. Same
      for ngu-dropdown. Measured with the screenshot evals in `evals/agent-forms`.
- [ ] **WebMCP tools** (M). Expose a form as a tool that in-browser AI agents can fill and
      submit, using Angular's experimental `provideExperimentalWebMcpForms` and the
      `experimentalWebMcpTool` form option. Labels and hints become the tool description.
- [ ] **Paste to fill** (M). Opt-in adapter that maps pasted text, such as an address or an
      email signature, to fields through an app-provided extractor. No model calls from the
      library itself.
- [ ] **Spec from a prompt** (M). Developer tool that drafts a spec from a description,
      reviewed by a human before use.
- [ ] **Agent-safe actions** (S). Mark destructive submits so agents must ask for confirmation.

**Platform features**

- [ ] **Passkey sign-in** (M). WebAuthn conditional UI on username fields
      (`autocomplete="username webauthn"`).
- [ ] **Web OTP** (S). Read SMS codes automatically on supporting Android browsers.
- [ ] **Address autofill** (S). Correct `autocomplete` tokens on address groups by default.
- [ ] **Payment Request** (M). Optional express checkout button that fills payment and address.
- [ ] **Offline submit queue** (M). Store submits made offline and replay them when back online.

**Collaboration**

- [ ] **Shared editing** (L). Presence and live field locking for forms edited by several people,
      through an adapter for a sync backend.

---

## Known gaps to close

Found while building v0.1. Each one gets a spec before it is fixed.

- [x] **Number values in selects** (S). Confirmed in the Phase 2 review: a radio group bound
      to a number shows no selection, and choosing an option writes a string into the model.
      Closed in Phase 3: selects and radios write each option's own value.
- [x] **Run-time fields inside arrays** (M). Closed in Phase 4.
- [x] **Async validation and debounce on run-time fields** (M). Closed in Phase 2.
- [x] **Nested arrays** (M). Closed in Phase 4.
- [ ] **Typo-safe server error paths** (S). Return values need `satisfies SubmitErrors<T>`; look
      for an API that catches typos without it.
- [ ] **Errors that appear on blur are not announced** (S). Decide whether an opt-in polite
      announcement helps or adds noise, after the screen reader pass.
- [ ] **Typed dates in the app's locale** (M). Date fields use the browser's picker, whose
      format follows the browser's language rather than `provideNguMessages({ locale })`.
      Consider an optional text entry with a locale mask.
- [ ] **Styling hooks the screenshot evals asked for** (S). Agents told not to style internal
      classes could not match these details of a design: choice options in columns (no slot on
      the options' container), the column headers of `layout: 'table'` lists (no slot), the
      upload drop zone's text and look (no slot), and filled versus outlined rating stars.
      Agents without the notes reached them with `::ng-deep`, up to 87 rules in one form.
- [x] **IndexedDB drafts in tests** (S). Closed in Phase 6: `e2e/drafts.spec.ts` saves a
      draft, reloads and clears it, in Chromium, Firefox and WebKit.
- [ ] **A smaller core** (M). A login form ships the view mode, lists, run-time fields, choice
      groups and the strength meter, because their components sit in the same chunks as the
      core (`NguView` with the step helpers) or are referenced from templates. Defer or split
      them; the size check in `scripts/size.mjs` shows the gain. Incremental hydration support
      adds about 3.7 kB of Angular's own code to every app.
- [ ] **Signature pad labelling** (S). In draw mode the field's label points at the canvas,
      which a `<label for>` cannot name, and the hint and error are linked only to the
      typed-name input.
- [ ] **Unused API** (S). `NguMessages.uploaded` is never shown and `NguToken.group` allows
      `'parts'`, which no token uses. Use them or remove them before 1.0.
- [ ] **Formatting check in CI** (S). 146 files differ from Prettier. Format them once, checking
      that inline templates render the same, then add `prettier --check` to CI.

---

## Not planned

- **A drag-and-drop form designer.** It is a product, not a library feature. The serializable
  spec makes it possible for someone else to build one.
- **Storing submissions.** ngu-form stops at the submit action; persistence is the app's job.
- **Support for reactive forms or template-driven forms.** Signal Forms only.

---

## Definition of done

An item is checked only when all of these hold:

1. Behavior is covered by specs, including at least one failure path.
2. The demo shows it, and the README or docs explain it with a code sample.
3. Public types are exported and documented with TSDoc.
4. axe reports no violations on the demo, and the feature works by keyboard alone.
5. Library and demo builds pass, and the bundle budget holds.
6. Breaking changes are listed in the changelog with a migration note.
