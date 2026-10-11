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
    ],
  },

  lists: {
    title: 'Lists',
    description:
      'An array property is described once, through `item`, and renders one row per element, with add and remove buttons.',
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
        id: 'keyboard',
        title: 'Accessibility',
        list: [
          'Rows form a list; a titled list is a named group.',
          'Add moves focus into the new row. Remove moves it to the row that took its place, or to the add button.',
          'Remove buttons are named after the row, such as "Remove 2".',
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
