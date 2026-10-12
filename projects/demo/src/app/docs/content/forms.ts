import type { DocPage } from 'docs-kit/docs/model';

export const PAGES: Record<string, DocPage> = {
  'defining-forms': {
    title: 'Defining a form',
    description:
      'A form is the initial value plus a spec that mirrors it. The value type picks the input; the spec adds labels, rules and layout.',
    sections: [
      {
        id: 'labels',
        title: 'Labels and inferred inputs',
        text: [
          'A string is the whole spec: it becomes the label, and the input comes from the value. Strings get a text input, numbers a number input, booleans a checkbox.',
        ],
        demo: {
          src: 'defining-forms/labels.ts',
          load: () => import('../demos/defining-forms/labels').then((m) => m.LabelsDemo),
        },
      },
      {
        id: 'options',
        title: 'Options objects',
        text: [
          'An object sets the label with everything else: `type`, rules such as `required`, and texts such as `placeholder` and `hint`. Every option is listed in the [spec reference](/api/spec).',
        ],
        demo: {
          src: 'defining-forms/options.ts',
          load: () => import('../demos/defining-forms/options').then((m) => m.OptionsDemo),
        },
      },
      {
        id: 'groups',
        title: 'Groups',
        text: [
          'A nested object becomes a group with its own grid. Write its fields directly, or wrap them as `{ title, cols, fields }` to add options.',
        ],
        demo: {
          src: 'defining-forms/groups.ts',
          load: () => import('../demos/defining-forms/groups').then((m) => m.GroupsDemo),
        },
      },
      {
        id: 'types',
        title: 'Typing the model',
        text: [
          'The model type comes from the initial value. Pass it explicitly for unions and optional data; the spec is then checked against it.',
        ],
        code: [
          {
            code: `interface Signup {
  name: string;
  plan: 'free' | 'pro';
  birthday: Date | null;
}

readonly signup = defineForm<Signup>(
  { name: '', plan: 'free', birthday: null },
  {
    name: { label: 'Name', required: true },
    plan: { label: 'Plan', type: 'radio', options: PLANS }, // options must be 'free' | 'pro'
    birthday: { label: 'Birthday', type: 'date' }, // null needs an explicit type
  },
);`,
          },
        ],
      },
      {
        id: 'outside',
        title: 'Outside an injection context',
        text: ['Created later, for example in a click handler, a form needs an injector.'],
        code: [
          {
            code: `private readonly injector = inject(Injector);

edit(record: Profile) {
  this.form = defineForm(record, PROFILE_SPEC, { injector: this.injector });
}`,
          },
        ],
      },
    ],
  },

  layout: {
    title: 'Layout',
    description:
      'Groups are CSS grids. `cols` sets the columns, `span` widens a field, and `$` keys add headings, text and dividers.',
    sections: [
      {
        id: 'columns',
        title: 'Columns and spans',
        text: [
          '`cols` takes a number, or columns per breakpoint. The breakpoints are measured on the form, not the window, so a form in a narrow panel collapses on its own. A field with `span` takes several columns.',
        ],
        demo: {
          src: 'layout/columns.ts',
          load: () => import('../demos/layout/columns').then((m) => m.ColumnsDemo),
          value: false,
        },
        after: [
          'Make the window narrow to see the columns drop. The breakpoints are set with [provideNguFormConfig](/configuration#form-config).',
        ],
      },
      {
        id: 'static',
        title: 'Headings, text and dividers',
        text: [
          'Keys that start with `$` add content without a model value: `{ heading }`, `{ text }` or `{ divider: true }`. They take `hidden` and `span` too.',
        ],
        demo: {
          src: 'layout/static.ts',
          load: () => import('../demos/layout/static').then((m) => m.StaticDemo),
        },
      },
      {
        id: 'order',
        title: 'Field order',
        text: [
          'The form follows the model\'s key order. `order` moves an entry within its group, like CSS `order`: entries sort by it, lowest first, and entries without it count as `0`. It works on fields, groups, lists and `$` content, and it changes the focus order too, not only the look.',
        ],
        demo: {
          src: 'layout/order.ts',
          load: () => import('../demos/layout/order').then((m) => m.OrderDemo),
        },
      },
      {
        id: 'sections',
        title: 'Tabs, panels and steps',
        text: [
          'For long forms, groups can become [tabs or collapsible panels](/sections), and the whole form can become a [wizard](/steps).',
        ],
      },
    ],
  },

  sections: {
    title: 'Tabs and accordion',
    description:
      'Groups and lists can sit in tabs or in collapsible panels. Problems inside them are counted on the header, and a refused submit opens the part that holds the first one.',
    sections: [
      {
        id: 'tabs',
        title: 'Tabs',
        text: [
          "`layout: 'tabs'` on a group (or on `defineForm` for the top level) shows each child group or list as a tab. After a refused submit, each tab shows how many problems it holds, and the first tab with a problem opens so its field can be focused.",
        ],
        demo: {
          src: 'sections/tabs.ts',
          load: () => import('../demos/sections/tabs').then((m) => m.SectionsTabsDemo),
        },
        after: ['Press Save settings on the empty form, then switch tabs to see the counts.'],
      },
      {
        id: 'accordion',
        title: 'Collapsible panels',
        text: [
          '`collapsed` makes a group or list a collapsible panel: `true` starts closed, `false` starts open. `layout: \'accordion\'` on the parent does this for every child group and list, with the first one open. Closed panels keep their fields, values and errors; a refused submit opens every panel with a problem.',
        ],
        demo: {
          src: 'sections/accordion.ts',
          load: () => import('../demos/sections/accordion').then((m) => m.SectionsAccordionDemo),
        },
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        list: [
          'Tabs follow the ARIA tabs pattern: arrow keys move between tabs (mirrored right to left), Home and End go to the ends, and only the selected tab is in the tab order.',
          'Problem counts are part of the tab or panel name, such as "Alerts, 2 problems".',
          'Panel headers are buttons inside headings with `aria-expanded`; the content is a named region.',
          'Links in the error summary open the tab or panel that holds the field before focusing it.',
          'When printing, every tab and panel is printed, each under its title.',
        ],
      },
    ],
  },

  steps: {
    title: 'Steps',
    description:
      "`layout: 'steps'` turns the top-level groups into a wizard: one step at a time, Next checks the current step, and Back keeps every value.",
    sections: [
      {
        id: 'wizard',
        title: 'A wizard',
        text: [
          'Each top-level group or list is a step, titled by its `title`. Next shows the step\'s errors and stays while it is invalid, waiting for async checks first. Enter in a field does the same. The last step shows the submit button.',
          'A step with `hidden` is skipped: it leaves the step list and the count, and its values follow `omitHidden` like any hidden field.',
        ],
        demo: {
          src: 'steps/basic.ts',
          load: () => import('../demos/steps/basic').then((m) => m.StepsBasicDemo),
        },
        after: ['Turn off "Just me for now" to add the Plan step.'],
      },
      {
        id: 'review',
        title: 'Review step',
        text: [
          '`review: true` adds a last step that lists every answer under its step, with an Edit button per step. After an edit, Next becomes "Back to review". Set `display` on a field to word its value there, and pass a string to `review` to change the title.',
        ],
        demo: {
          src: 'steps/review.ts',
          load: () => import('../demos/steps/review').then((m) => m.StepsReviewDemo),
        },
      },
      {
        id: 'url',
        title: 'Steps in the URL',
        text: [
          "`stepParam: 'step'` keeps the current step in the query string. Each step adds a history entry, so the browser's Back button goes to the previous step, and a reload opens the same step as long as the steps before it are still valid, for example with a [draft](/persistence#drafts). Otherwise the form opens the first step that still needs answers.",
        ],
        demo: {
          src: 'steps/url.ts',
          load: () => import('../demos/steps/url').then((m) => m.StepsUrlDemo),
        },
        after: [
          'Without the Angular router it works the same: it uses `Location` from `@angular/common`. `def.steps` gives the current step, the count and `next()`, `back()` and `goTo()` for custom controls.',
        ],
      },
      {
        id: 'submit',
        title: 'Submitting',
        text: [
          'Only the last step submits. If a step became invalid in the meantime, such as through a cross-field rule, a refused submit returns to the first step with problems and focuses it. Later steps open only once every step before them is valid, so the step list cannot skip a check.',
        ],
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        list: [
          'The step list is an ordered list named "Steps"; the current step has `aria-current="step"`, finished steps read "completed".',
          'Moving to a step focuses its heading, which reads its position and title, such as "Step 2 of 4 Room".',
          'Next on an invalid step focuses the first problem and announces how many there are.',
          'Printing prints every step, or only the review once the user reached it.',
        ],
      },
    ],
  },

  lists: {
    title: 'Lists',
    description:
      'An array property is described once, through `item`, and renders one row per element, with add and remove buttons. Rows can move, be copied, collapse to a summary, form a table, nest, and scroll by the hundred.',
    sections: [
      {
        id: 'objects',
        title: 'Lists of objects',
        text: [
          '`item` is a field map; `newItem` is the value of a new row (or a factory). `min` and `max` limit the rows and disable the buttons at the limits.',
        ],
        demo: {
          src: 'lists/objects.ts',
          load: () => import('../demos/lists/objects').then((m) => m.ListObjectsDemo),
        },
      },
      {
        id: 'primitives',
        title: 'Lists of strings and numbers',
        text: ['For a list of primitives, `item` is a single field spec.'],
        demo: {
          src: 'lists/primitives.ts',
          load: () => import('../demos/lists/primitives').then((m) => m.ListPrimitivesDemo),
        },
        after: [
          'To edit a list as one field instead, use [checkboxes, a multiple select](/checkbox-group) or [tags](/tags).',
        ],
      },
      {
        id: 'item-logic',
        title: 'Logic per row',
        text: ['Functions inside `item` receive the current row as their second argument.'],
        demo: {
          src: 'lists/item-logic.ts',
          load: () => import('../demos/lists/item-logic').then((m) => m.ListItemLogicDemo),
        },
      },
      {
        id: 'reorder',
        title: 'Reorder and duplicate',
        text: [
          '`reorder: true` adds Move up and Move down buttons and a handle to drag rows with a mouse, pen or finger. `duplicate: true` adds a button that copies a row next to itself; pass a string to name it. A copy is a new row with its own state; a moved row keeps its own.',
        ],
        demo: {
          src: 'lists/reorder.ts',
          load: () => import('../demos/lists/reorder').then((m) => m.ListReorderDemo),
        },
      },
      {
        id: 'summary',
        title: 'Collapsible rows',
        text: [
          '`summary: (item, index) => string` shows each row as one line that opens to edit. Rows start closed; new and copied rows start open, and a refused submit opens every row with a problem and marks it "Needs attention".',
        ],
        demo: {
          src: 'lists/summary.ts',
          load: () => import('../demos/lists/summary').then((m) => m.ListSummaryDemo),
        },
      },
      {
        id: 'table',
        title: 'Table layout',
        text: [
          "`layout: 'table'` edits object rows as a table: one column per field, headed by its label, with `span` as the column's share of the width. Labels stay on each control for screen readers. Below the `sm` breakpoint the rows fall back to cards.",
        ],
        demo: {
          src: 'lists/table.ts',
          load: () => import('../demos/lists/table').then((m) => m.ListTableDemo),
        },
      },
      {
        id: 'nested',
        title: 'Lists inside lists',
        text: [
          'A row can hold a list of its own. Logic in the inner `item` receives the inner row as its second argument; server errors use paths such as `days.0.sessions.1.title`.',
        ],
        demo: {
          src: 'lists/nested.ts',
          load: () => import('../demos/lists/nested').then((m) => m.ListNestedDemo),
        },
      },
      {
        id: 'runtime',
        title: 'Run-time fields in rows',
        text: [
          'A row can hold [run-time fields](/runtime-fields) too. Each row keeps its own record in line with the field list.',
        ],
        demo: {
          src: 'lists/runtime.ts',
          load: () => import('../demos/lists/runtime').then((m) => m.ListRuntimeDemo),
        },
      },
      {
        id: 'virtual',
        title: 'Long lists',
        text: [
          '`virtual: true` renders only the rows in view inside a scrolling box, for hundreds of rows. Set its height with `--ngu-list-height` (default `32rem`). A refused submit brings the first problem row into view, and a line under the list names the other rows with problems.',
        ],
        demo: {
          src: 'lists/virtual.ts',
          load: () => import('../demos/lists/virtual').then((m) => m.ListVirtualDemo),
          value: false,
        },
        after: [
          'Rows out of view are not in the page, so their controls cannot keep state of their own, such as a half-typed tag; the model and touched state are kept. Printing renders every row.',
        ],
      },
      {
        id: 'keyboard',
        title: 'Accessibility',
        list: [
          'Rows form a list; a titled list is a named group. Tables have column headers and a row number header per row.',
          'Add moves focus into the new row. Remove moves it to the row that took its place, or to the add button.',
          'Remove, move and duplicate buttons are named after the row, such as "Move entry 2 up". After a move, focus stays on the moved row and the new position is announced.',
          'Dragging is for pointers; the move buttons do the same by keyboard, so the handle stays out of the tab order.',
          'Virtual lists tell screen readers the full size with `aria-setsize` and `aria-posinset`, or `aria-rowcount` and `aria-rowindex` in tables.',
        ],
      },
    ],
  },

  'runtime-fields': {
    title: 'Run-time fields',
    description:
      'Fields that are only known at run time, such as survey questions from an API, come as a list of plain JSON definitions on a `Record<string, V>` property.',
    sections: [
      {
        id: 'json',
        title: 'Fields from JSON',
        text: [
          'Each definition has a `key` and the options a static field has, as JSON: `type`, `options`, `required`, a string `pattern` and a `default`. `showIf` asks a question only for some answers.',
        ],
        demo: {
          src: 'runtime-fields/json.ts',
          load: () => import('../demos/runtime-fields/json').then((m) => m.RuntimeJsonDemo),
        },
      },
      {
        id: 'changing',
        title: 'A list that changes',
        text: [
          'Give `fields` a signal, such as an `httpResource`. New fields get their default; fields that leave the list lose their value unless `keepRemoved` is set. Validation follows the list.',
        ],
        demo: {
          src: 'runtime-fields/changing.ts',
          load: () => import('../demos/runtime-fields/changing').then((m) => m.RuntimeChangingDemo),
        },
      },
    ],
  },

  'dependent-values': {
    title: 'Dependent values',
    description:
      'Fields that follow other fields: computed values, options that depend on an answer, conditional rules and change hooks.',
    sections: [
      {
        id: 'computed',
        title: 'Computed fields',
        text: ['`compute` derives a read-only value from the model and updates live.'],
        demo: {
          src: 'dependent-values/computed.ts',
          load: () => import('../demos/dependent-values/computed').then((m) => m.ComputedDemo),
        },
      },
      {
        id: 'cascading',
        title: 'Cascading options',
        text: [
          '`options` can be a function of the model. When the list no longer holds the current value, the value is cleared.',
        ],
        demo: {
          src: 'dependent-values/cascading.ts',
          load: () => import('../demos/dependent-values/cascading').then((m) => m.CascadingDemo),
        },
      },
      {
        id: 'conditional',
        title: 'Conditional fields and rules',
        text: [
          '`hidden`, `disabled`, `readonly` and `required` take functions of the model. A function `required` can return the message to show.',
        ],
        demo: {
          src: 'dependent-values/conditional.ts',
          load: () =>
            import('../demos/dependent-values/conditional').then((m) => m.ConditionalDemo),
        },
      },
      {
        id: 'on-change',
        title: 'Change hooks',
        text: [
          "`onChange` runs after the user's own change, for side effects such as copying an address. Writes made by code never trigger it, so hooks cannot loop.",
        ],
        demo: {
          src: 'dependent-values/on-change.ts',
          load: () => import('../demos/dependent-values/on-change').then((m) => m.OnChangeDemo),
        },
      },
    ],
  },

  validation: {
    title: 'Validation',
    description:
      'Built-in rules, your own checks with access to the whole model, server checks, and control over when errors show.',
    sections: [
      {
        id: 'rules',
        title: 'Built-in rules',
        text: [
          '`required` (with an optional message), `minLength`, `maxLength`, `pattern`, `min` and `max`. Email fields check the address. Messages come from the [message catalog](/languages).',
        ],
        demo: {
          src: 'validation/rules.ts',
          load: () => import('../demos/validation/rules').then((m) => m.RulesDemo),
        },
      },
      {
        id: 'custom',
        title: 'Custom rules',
        text: [
          '`validate` receives the value, the model and the current list row, and returns a message, an error object, or nothing. It re-runs when anything it reads changes.',
        ],
        demo: {
          src: 'validation/custom.ts',
          load: () => import('../demos/validation/custom').then((m) => m.CustomValidationDemo),
        },
      },
      {
        id: 'async',
        title: 'Server checks',
        text: [
          '`validateAsync` runs after the sync rules pass, shows "Checking…" while it runs, and is cancelled through `abort` when the value changes. A submit waits for it.',
        ],
        demo: {
          src: 'validation/async.ts',
          load: () => import('../demos/validation/async').then((m) => m.AsyncDemo),
        },
      },
      {
        id: 'timing',
        title: 'When errors show',
        text: [
          '`errorsOn` on `<ngu-form>` picks when messages appear, and a field can set its own. A submit attempt always reveals every error.',
        ],
        demo: {
          src: 'validation/timing.ts',
          load: () => import('../demos/validation/timing').then((m) => m.TimingDemo),
        },
      },
      {
        id: 'summary',
        title: 'Error summary',
        text: [
          'For long forms, `errorSummary` lists every problem at the top after a refused submit, each linking to its field, as in the GOV.UK design system.',
        ],
        demo: {
          src: 'validation/summary.ts',
          load: () => import('../demos/validation/summary').then((m) => m.SummaryDemo),
        },
      },
    ],
  },

  schemas: {
    title: 'Schemas and warnings',
    description:
      'Validate with a Zod, Valibot or ArkType schema, add warnings that never block, and meter password strength.',
    sections: [
      {
        id: 'schema',
        title: 'Standard Schema',
        text: [
          'Pass any [Standard Schema](https://standardschema.dev) as `schema`. Each issue shows on the field at its path; issues without a field show above the submit button.',
        ],
        demo: {
          src: 'schemas/zod.ts',
          load: () => import('../demos/schemas/zod').then((m) => m.ZodDemo),
        },
      },
      {
        id: 'warnings',
        title: 'Warnings',
        text: [
          '`warn` works like `validate`, but its message shows in a warning style and never stops a submit.',
        ],
        demo: {
          src: 'schemas/warnings.ts',
          load: () => import('../demos/schemas/warnings').then((m) => m.WarningsDemo),
        },
      },
      {
        id: 'strength',
        title: 'Password strength',
        text: [
          '`strength` on a password field adds a meter and a checklist. With `min`, weaker passwords are refused; `rules` and `score` (for example zxcvbn) replace the defaults.',
        ],
        demo: {
          src: 'schemas/strength.ts',
          load: () => import('../demos/schemas/strength').then((m) => m.StrengthDemo),
        },
      },
    ],
  },

  masks: {
    title: 'Masks and formats',
    description:
      'Shape what people type and what the model holds: input masks, parse and format functions, and dates.',
    sections: [
      {
        id: 'mask',
        title: 'Masks',
        text: [
          '`mask` formats while typing: `0` is a digit, `a` a letter, `*` either. The model holds only the typed characters, and a half-filled value is an error.',
        ],
        demo: {
          src: 'masks/mask.ts',
          load: () => import('../demos/masks/mask').then((m) => m.MaskDemo),
        },
      },
      {
        id: 'parse-format',
        title: 'Parse and format',
        text: [
          '`parse` turns the typed text into the model value, and `format` turns the value back into text when the field is left. Throw from `parse` to report unreadable text.',
        ],
        demo: {
          src: 'masks/parse-format.ts',
          load: () => import('../demos/masks/parse-format').then((m) => m.ParseFormatDemo),
        },
      },
      {
        id: 'numbers',
        title: 'Locale numbers',
        text: [
          "`localized` shows numbers in the active locale's digits and separators. See [Number](/number#localized) and [Currency](/currency).",
        ],
      },
      {
        id: 'dates',
        title: 'Dates',
        text: [
          'A date field holds a `Date` (midnight UTC, as date inputs produce) or an ISO string, whichever the model started with. `min` and `max` take either.',
        ],
        demo: {
          src: 'masks/dates.ts',
          load: () => import('../demos/masks/dates').then((m) => m.DatesDemo),
        },
      },
    ],
  },

  submitting: {
    title: 'Submitting',
    description:
      'Send the form with an action, show server errors on their fields, reset or patch it, and shape what gets sent.',
    sections: [
      {
        id: 'action',
        title: 'Actions and server errors',
        text: [
          '`[action]` runs on a valid submit. Return nothing on success, a string for the whole form, or messages by field path; each clears when its field changes. Try submitting as shown.',
        ],
        demo: {
          src: 'submitting/action.ts',
          load: () => import('../demos/submitting/action').then((m) => m.ActionDemo),
        },
        after: [
          'Use `satisfies SubmitErrors<T>` on returned errors: TypeScript then catches a mistyped path.',
        ],
      },
      {
        id: 'reset-patch',
        title: 'Reset and patch',
        text: [
          '`reset()` returns to the initial value, or to a value you pass, and clears touched and dirty state. `patch()` deep-merges a partial value without marking anything dirty.',
        ],
        demo: {
          src: 'submitting/reset-patch.ts',
          load: () => import('../demos/submitting/reset-patch').then((m) => m.ResetPatchDemo),
        },
      },
      {
        id: 'payload',
        title: 'Shaping the payload',
        text: [
          '`omitHidden` leaves hidden fields out of what is sent, and `mapValue` turns the model into the request body. `form.payload()` is that result.',
        ],
        demo: {
          src: 'submitting/payload.ts',
          load: () => import('../demos/submitting/payload').then((m) => m.PayloadDemo),
          value: false,
        },
      },
    ],
  },

  'form-state': {
    title: 'Form state',
    description:
      'Signals for the state of the whole form, the changes since the last save, and a guard against leaving with unsaved work.',
    sections: [
      {
        id: 'signals',
        title: 'State signals',
        text: [
          '`dirty`, `touched`, `valid`, `pending` and `submitting` are signals on the form definition.',
        ],
        demo: {
          src: 'form-state/state.ts',
          load: () => import('../demos/form-state/state').then((m) => m.StateDemo),
          value: false,
        },
      },
      {
        id: 'changes',
        title: 'Changed values',
        text: [
          '`changes()` returns the values that differ from the last saved state: the initial value, a reset or patch, or a successful submit. Send it as a PATCH body.',
        ],
        demo: {
          src: 'form-state/changes.ts',
          load: () => import('../demos/form-state/changes').then((m) => m.ChangesDemo),
          value: false,
        },
      },
      {
        id: 'guard',
        title: 'Unsaved changes',
        text: [
          '`nguUnsavedChangesGuard` asks before leaving a route with unsaved changes; `[warnOnUnload]` on `<ngu-form>` also warns when the tab closes.',
        ],
        code: [
          {
            filename: 'app.routes.ts',
            code: `{ path: 'profile', component: ProfilePage, canDeactivate: [nguUnsavedChangesGuard] }`,
          },
          {
            lang: 'angular-html',
            code: `<ngu-form [form]="profile" [warnOnUnload]="true" submitLabel="Save" />`,
          },
        ],
      },
    ],
  },

  'view-mode': {
    title: 'View mode',
    description:
      'The same spec shows a record as label and value pairs, and one switch makes a whole form read-only or disabled.',
    sections: [
      {
        id: 'view',
        title: 'Showing values',
        text: [
          '`<ngu-view [form]="def" />` lists every visible field with its label and its value, formatted the way the field shows it: option labels, dates and numbers for the locale, Yes or No, list entries, a table for table lists. Untitled groups join the list; titled groups and lists become sections. Empty values read "Not provided" and passwords are never shown.',
          '`display: (value, model) => string` words a value yourself. `keys` limits the view to some top-level entries.',
        ],
        demo: {
          src: 'view-mode/view.ts',
          load: () => import('../demos/view-mode/view').then((m) => m.ViewDemo),
        },
      },
      {
        id: 'locked',
        title: 'Read-only and disabled forms',
        text: [
          '`readonly` and `disabled` on `defineForm` take a flag, a signal or a function, and reach every field. A read-only form hides the list buttons; a disabled one shows them disabled. Both block the submit button, and neither is validated.',
        ],
        demo: {
          src: 'view-mode/locked.ts',
          load: () => import('../demos/view-mode/locked').then((m) => m.LockedDemo),
        },
      },
      {
        id: 'print',
        title: 'Printing',
        text: [
          'Forms and views print cleanly: buttons, the step list and notices are left out, every tab, panel and collapsed row prints open, and rows do not split across pages. A wizard prints every step, or only the review once the user reached it.',
        ],
      },
    ],
  },

  persistence: {
    title: 'Loading, drafts and undo',
    description:
      'Wait for data from a server, keep unsent work across reloads, and step back through changes.',
    sections: [
      {
        id: 'loading',
        title: 'Loading',
        text: [
          '`load` takes a `resource` or `httpResource`. Fields show placeholders while it loads, and each value it delivers resets the form to it.',
        ],
        demo: {
          src: 'persistence/loading.ts',
          load: () => import('../demos/persistence/loading').then((m) => m.LoadingDemo),
        },
      },
      {
        id: 'drafts',
        title: 'Drafts',
        text: [
          '`draft` saves unsent changes to localStorage, sessionStorage, IndexedDB (`nguIndexedDbDrafts()`) or your own adapter, and restores them with a notice and a Discard button. Passwords, one-time codes and captcha tokens are never stored.',
        ],
        demo: {
          src: 'persistence/draft.ts',
          load: () => import('../demos/persistence/draft').then((m) => m.DraftDemo),
        },
      },
      {
        id: 'history',
        title: 'Undo and redo',
        text: [
          '`history: true` keeps a history of changes. `form.history` has `undo`, `redo` and their signals, and the keyboard shortcuts work inside the form.',
        ],
        demo: {
          src: 'persistence/history.ts',
          load: () => import('../demos/persistence/history').then((m) => m.HistoryDemo),
        },
      },
    ],
  },
};
