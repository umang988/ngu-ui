import type { Type } from '@angular/core';
import type { CodeFile } from 'docs-kit/ui/code-tabs';

export interface LazyComponent {
  readonly load: () => Promise<Type<unknown>>;
}

export function isLazy(component: Example['component']): component is LazyComponent {
  return 'load' in component;
}

export interface Example {
  readonly id: string;
  readonly title: string;
  /** One line for lists. */
  readonly summary: string;
  /** The main features, short; backticks mark code. */
  readonly highlights: string;
  /** The situation this example solves. */
  readonly useCase: string;
  /** Features it uses; backticks mark code. */
  readonly shows: readonly string[];
  /** Things to do in the preview. */
  readonly tryThis: readonly string[];
  /** The example, or a loader for examples with heavy dependencies, so Zod loads only when needed. */
  readonly component: Type<unknown> | LazyComponent;
  readonly files: readonly CodeFile[];
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'login',
    title: 'Sign in',
    summary: 'Email and password with the right keyboard and autofill hints.',
    highlights: 'Inferred input types, `autocomplete`, show password',
    useCase:
      'The smallest useful form, and a good starting point for any auth screen. It shows how little a spec needs: a label string is enough for a checkbox, and the input types come from the model.',
    shows: [
      'A string as the whole spec: `remember: \'Keep me signed in\'`',
      '`type: \'email\'` with email validation and the email keyboard on phones',
      'A show-password button and `autocomplete` hints for password managers',
      '`enterkeyhint: \'go\'` on the last field',
    ],
    tryThis: [
      'Press Enter in the empty email field. Focus moves to the first problem, and a screen reader hears how many fields need attention.',
      'Use Show to check the password, then submit. The password is hidden again.',
    ],
    component: { load: () => import('../../examples/login/login').then((m) => m.LoginForm) },
    files: [{ name: 'login.ts', src: 'login/login.ts' }],
  },
  {
    id: 'signup',
    title: 'Create an account',
    summary: 'Server checks, cascading selects, and a request body shaped apart from the form.',
    highlights: '`validateAsync`, password strength, warnings, error summary, cascading selects, `mapValue`',
    useCase:
      'Registration with a username checked on the server, a password confirmation, a country then state select, and a plan that changes which fields are asked. What the server receives is built separately from what the user edits, and leaving with unsaved changes asks first.',
    shows: [
      '`validateAsync` with `debounce` for the username',
      'A password strength meter and checklist with `strength: { min: 2 }`',
      'A `warn` on the email that suggests a fix for typos such as gmial.com, without blocking the submit',
      'A cross-field `validate` that compares the two passwords',
      'An `errorSummary` that lists every problem after a refused submit',
      'Cascading select: `options: (m) => regionsOf(m.profile.country)` with a conditional `required`',
      'A company field that is `hidden` on the free plan and left out of the request by `omitHidden`',
      '`mapValue` to turn the model into the request body',
      'Form state signals, `changes()` and `nguUnsavedChangesGuard`',
    ],
    tryThis: [
      'Press Create account on the empty form. A summary lists every problem; its links move to each field.',
      'Type admin as the username to see the server check.',
      'Type a password and watch the meter and checklist. Then try an email at gmial.com.',
      'Pick India and a state, then switch to United States. The state is cleared and the list changes.',
      'Choose Pro. Company appears and is required.',
      'Change something, then open another example. You are asked before leaving.',
      'Fill sample uses an email ending in @taken.com, which the pretend server rejects on submit.',
    ],
    component: { load: () => import('../../examples/signup/signup').then((m) => m.SignupForm) },
    files: [
      { name: 'signup.ts', src: 'signup/signup.ts' },
      { name: 'fake-users.ts', src: 'api/fake-users.ts' },
      { name: 'regions.ts', src: 'api/regions.ts' },
    ],
  },
  {
    id: 'profile',
    title: 'Edit a profile',
    summary: 'Data from a server, autosaved drafts, undo, and a PATCH of only what changed.',
    highlights: '`load`, `draft`, `history`, masks, locale numbers, `Date` values, warnings',
    useCase:
      'A settings page for a record that lives on a server. Fields show placeholders while it loads, unsent edits survive a reload or a closed tab, Ctrl+Z steps back through changes, and Save sends only the fields that differ.',
    shows: [
      '`load: resource(...)` with skeleton fields while the record loads',
      '`draft` with `nguIndexedDbDrafts()` saves edits to IndexedDB and restores them with a notice',
      '`history: true` with Undo and Redo buttons and keyboard shortcuts',
      'A phone `mask`, a `localized` salary with Indian digit grouping, and a `Date` birthday with `max`',
      '`parse` to trim the display name, and `warn` for a likely typo or an oversharing bio',
      '`changes()` as the PATCH body',
    ],
    tryThis: [
      'Wait for the placeholders to turn into fields. Then change the bio and reload the page. Your edit comes back with a notice and a Discard button.',
      'Change a few fields, then press Ctrl+Z (⌘Z on a Mac). Focus moves to the field that changed back.',
      'Type a salary such as 2500000. It shows as 25,00,000 when you leave the field.',
      'Save, then look at the PATCH body: it held only the fields you changed.',
    ],
    component: { load: () => import('../../examples/profile/profile').then((m) => m.ProfileForm) },
    files: [
      { name: 'profile.ts', src: 'profile/profile.ts' },
      { name: 'fake-profile.ts', src: 'api/fake-profile.ts' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings with autosave',
    summary: 'Tabs of preferences that save themselves a moment after each change.',
    highlights: '`changes()` sent as a PATCH, `patch()` to mark values saved, tabs, conditional switches',
    useCase:
      'A settings page has no Save button: people flip a switch and expect it to stick. Each valid change is sent shortly after the last edit, only the values that changed go to the server, and the page says whether everything is saved. A failed save keeps the changes and offers to try again.',
    shows: [
      "`layout: 'tabs'` with one tab per group, and `load` for the saved settings",
      'An `effect` on `changes()` that saves after a pause, and only while the form is `valid()`',
      '`patch()` after a save, so `changes()` empties without touching what the user typed meanwhile',
      'A field `disabled` by another answer, and one `hidden` until it applies',
      'A `role="status"` line for Saving, Saved and failures',
    ],
    tryThis: [
      'Switch Product news on. After a moment the status says the change is saved.',
      'Change several settings quickly. They go to the server together, once you pause.',
      'Clear Display name. Nothing is saved until it is filled in again.',
      'Type offline as the display name to see a failed save, then use Try again after fixing it.',
      'Choose Only me under Privacy: showing your email is turned off, and the search engine switch leaves.',
    ],
    component: { load: () => import('../../examples/settings/settings').then((m) => m.SettingsForm) },
    files: [
      { name: 'settings.ts', src: 'settings/settings.ts' },
      { name: 'fake-settings.ts', src: 'api/fake-settings.ts' },
    ],
  },
  {
    id: 'languages',
    title: 'In three languages',
    summary: 'English, Hindi and Arabic, right to left, validated by a Zod schema.',
    highlights: '`provideNguMessages`, translation keys, RTL, Standard Schema, ICU plurals',
    useCase:
      'A registration form that switches language without reloading. Labels, hints, schema messages and every text ngu-form renders itself come from one translate function, plural rules follow the language, and Arabic lays the form out right to left. All validation comes from a Zod schema.',
    shows: [
      '`provideNguMessages` with a signal, so a language switch re-renders the form',
      'Labels and Zod messages written as translation keys',
      'Complete Hindi and Arabic catalogs for ngu-form\'s own texts, with Arabic plural forms',
      '`schema: z.object(...)`: every rule comes from Zod, and each issue shows on its field',
      'Arabic-Indic digits in the income field, and a phone mask that accepts digits from any script',
      'An autosaved `draft`, restored after a reload; the password is never stored',
    ],
    tryThis: [
      'Press Register on the empty form, then switch to العربية. The summary, the messages and the layout follow.',
      'In Hindi, type the phone number in Devanagari digits, such as ९८७६५४३२१०.',
      'Fill in a few fields and reload the page. Your answers come back.',
    ],
    component: { load: () => import('../../examples/languages/languages').then((m) => m.LanguagesForm) },
    files: [
      { name: 'languages.ts', src: 'languages/languages.ts' },
      { name: 'translations.ts', src: 'languages/translations.ts' },
    ],
  },
  {
    id: 'checkout',
    title: 'Checkout',
    summary: 'A four-step wizard with a line-item table, a skipped step and a review.',
    highlights: "`layout: 'steps'`, a review step, a table list, steps in the URL",
    useCase:
      'A shop checkout split into steps. The cart is a table of line items whose prices fill in and totals update as you type; choosing store pickup skips the address step; the last step lists every answer with a link back to its step. The step lives in the URL and the answers in a draft, so Back and reload keep your place.',
    shows: [
      "`layout: 'steps'` with Next checking each step, and `review` for the summary",
      "A `hidden` step that is skipped, and `stepParam: 'step'` for the browser's Back button",
      "`layout: 'table'` with `reorder`, `compute` per row and a cross-row `validate`",
      '`onChange` with `patchItem` to fill the unit price',
      '`display` to show a card number as its last four digits on the review step',
      '`draft` with `persist: false` on the card fields, and `omitHidden` for the order body',
    ],
    tryThis: [
      'Press Next on each step without filling it in. Focus moves to the first problem.',
      'Pick a product in a new row, then change Qty. Amount and Subtotal follow. Drag a row by its handle to reorder.',
      'Choose Pick up in store: the Address step leaves the step list.',
      'On the review step, use Edit on Delivery, change it, and press Back to review.',
      "Go to step 3 and reload the page, or use the browser's Back button.",
    ],
    component: { load: () => import('../../examples/checkout/checkout').then((m) => m.CheckoutForm) },
    files: [
      { name: 'checkout.ts', src: 'checkout/checkout.ts' },
      { name: 'catalog.ts', src: 'api/catalog.ts' },
    ],
  },
  {
    id: 'team',
    title: 'Team admin',
    summary: 'Records you can view, edit, add and delete, with the server checking emails.',
    highlights: '`<ngu-view>` for reading, `reset()` per record, server errors by field',
    useCase:
      'An admin screen lists records; choosing one shows it read-only, Edit turns the same definition into a form, and Save goes to a server that rejects duplicate emails. One form definition serves every record: choosing a record resets the form to it.',
    shows: [
      '`<ngu-view>` to show a record with the labels, option names and dates of its form',
      '`reset(record)` when another record is chosen, and on Cancel',
      "An `action` that returns `{ email: '…' } satisfies SubmitErrors<Member>` when the server says no",
      '`display` to show an empty note as None',
      'Delete with an inline confirmation instead of a browser dialog',
    ],
    tryThis: [
      'Choose Ravi Kumar, then Edit. Change his email to asha@example.com and save: the server error appears under Email.',
      'Use New member, leave it empty and press Add member. Focus moves to Name.',
      'Edit a member, change something, then Cancel. The record is as it was.',
      'Delete a member and keep or confirm it.',
    ],
    component: { load: () => import('../../examples/team/team').then((m) => m.TeamPage) },
    files: [
      { name: 'team.ts', src: 'team/team.ts' },
      { name: 'fake-team.ts', src: 'api/fake-team.ts' },
    ],
  },
  {
    id: 'survey',
    title: 'Survey from an API',
    summary: 'Questions arrive as JSON, and the model follows the list.',
    highlights: 'Run-time fields from JSON, `showIf`, fields added while filling in',
    useCase:
      'Questions come from a server as plain JSON, so they can change without a release. New questions get default values, removed ones lose theirs, and each question brings its own validation and conditions.',
    shows: [
      'A `Record<string, …>` property with `fields` from a `resource`',
      'Plain JSON fields: `type`, `options`, `required`, string `pattern`, `default`',
      '`showIf` to ask a follow-up question only for some answers',
      'Questions added and removed at run time',
    ],
    tryThis: [
      'Answer No to "Do you use signals?" to see the follow-up question.',
      'Use Add question and Remove added to change the list while you fill it in.',
    ],
    component: { load: () => import('../../examples/survey/survey').then((m) => m.SurveyForm) },
    files: [
      { name: 'survey.ts', src: 'survey/survey.ts' },
      { name: 'fake-survey.ts', src: 'api/fake-survey.ts' },
    ],
  },
  {
    id: 'field-types',
    title: 'Every field type',
    summary: 'Each built-in input, from switches and sliders to phone numbers, file uploads and signatures.',
    highlights: 'Checkbox groups, switches, sliders, ratings, date ranges, phone numbers, one-time codes, tags, uploads, signatures',
    useCase:
      'A tour of the field type catalogue. Every input comes from a type on the spec, and the value type decides which ones fit: a list of strings can be checkboxes, a multiple select or tags, and a number can be a slider, an amount or stars. Uploads, image cropping and signatures come from the separate ngu-form/upload entry point.',
    shows: [
      '`type: \'checkbox\'` and `type: \'select\'` on a list, with `min` and `max` choices',
      '`switch`, `segmented`, and radios whose number values stay numbers',
      '`range` with its value shown, `currency` formatted for the locale, and a required `rating`',
      '`time`, `datetime-local`, `month` and `week` with bounds in their own format, and a `daterange`',
      '`phone` stored as E.164, `otp` with one-time-code autofill, `url`, `search`, `color` and `tags`',
      '`file` with a pretend upload, `image` with a square crop, and `signature`, from `ngu-form/upload`',
      '`consent` that stores the time of acceptance, and a `captcha` through an adapter',
      'A custom type with its own option, declared in `NguFieldOptionsMap`',
    ],
    tryThis: [
      'Press Send on the empty form. The summary lists what is missing.',
      'Paste +44 7911 123456 into Mobile number. The country switches to the United Kingdom.',
      'Paste 123-456 into Verification code. The dashes are dropped and every box fills.',
      'Type example.com into Website and leave the field. It becomes https://example.com.',
      'Add a file named fail.txt to Documents. It fails; use Retry, or remove it to submit.',
      'Choose a photo. Crop it with the mouse or the sliders, then look at the submitted value.',
      'Use Type instead on Signature to sign with the keyboard.',
    ],
    component: { load: () => import('../../examples/field-types/field-types').then((m) => m.FieldTypesForm) },
    files: [
      { name: 'field-types.ts', src: 'field-types/field-types.ts' },
      { name: 'fake-upload.ts', src: 'api/fake-upload.ts' },
      { name: 'mood-picker.ts', src: 'fields/mood-picker.ts' },
    ],
  },
];

export function exampleById(id: string | undefined): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
