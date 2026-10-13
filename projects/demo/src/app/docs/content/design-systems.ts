import type { DocPage } from 'docs-kit/docs/model';

export const PAGES: Record<string, DocPage> = {
  material: {
    title: 'Angular Material',
    description:
      'Render every field as an Angular Material form field: one provider, the same specs, the same validation and error timing.',
    sections: [
      {
        id: 'setup',
        title: 'Setup',
        text: [
          'Install Angular Material (with its theme, as `ng add @angular/material` sets it up), then add `provideNguMaterial()` next to your other providers. `ng add ngu-form` can do both.',
        ],
        code: [
          { code: 'npm install @angular/material @angular/cdk', lang: 'bash' },
          {
            filename: 'app.config.ts',
            code: `import { provideNguMaterial } from 'ngu-form/material';

export const appConfig: ApplicationConfig = {
  providers: [provideNguMaterial({ appearance: 'outline' })],
};`,
          },
        ],
      },
      {
        id: 'demo',
        title: 'Every type',
        text: [
          'The renderer takes over the whole field: `mat-label`, the control, `mat-hint` and `mat-error`. ngu-form still decides when errors show, links the error summary, and moves focus to the first problem after a refused submit.',
        ],
        demo: {
          src: 'material/material.ts',
          // Loads the docs site's own theme files.
          stackblitz: false,
          load: () => import('../demos/material/material').then((m) => m.MaterialDemo),
        },
      },
      {
        id: 'types',
        title: 'Which control each type uses',
        table: {
          caption: 'Material controls by type',
          columns: ['Type', 'Material'],
          rows: [
            [
              '`text`, `email`, `password`, `url`, `search`, `tel`, `number`, `currency`, `time`, `month`, `week`',
              '`mat-form-field` with `matInput`, prefix and suffix text, a counter, a show-password button',
            ],
            ['`textarea`', '`matInput` with `cdkTextareaAutosize`'],
            ['`select`', '`mat-select`, `multiple` on lists'],
            ['`checkbox`, `consent`', '`mat-checkbox`; a group of them on lists'],
            ['`switch`', '`mat-slide-toggle`'],
            ['`radio`', '`mat-radio-group`'],
            ['`segmented`', '`mat-button-toggle-group`'],
            ['`range`', '`mat-slider`'],
            ['`tags`', '`mat-chip-grid`'],
            ['`date`, `daterange`', "Material's datepicker and range picker"],
            [
              '`otp`, `phone`, `rating`, `color`, `captcha`, uploads',
              "ngu-form's own control, colored by the tokens below",
            ],
          ],
        },
      },
      {
        id: 'dates',
        title: 'Dates',
        text: [
          "`provideNguMaterial` adds Material's native `DateAdapter`. The model keeps ngu-form's shape: a `Date` at midnight UTC, or an ISO date string when the model holds strings. With Luxon or date-fns, pass `dateAdapter: false` and provide your adapter; the renderer reads days through it.",
        ],
      },
      {
        id: 'tokens',
        title: 'Matching the rest of the form',
        text: [
          "Buttons, lists, steps and the controls Material has no version of read ngu-form's tokens. Point them at Material's system variables:",
        ],
        code: [
          {
            lang: 'css',
            filename: 'styles.scss',
            code: `ngu-form {
  --ngu-primary: var(--mat-sys-primary);
  --ngu-on-primary: var(--mat-sys-on-primary);
  --ngu-focus-color: var(--mat-sys-primary);
  --ngu-border-color: var(--mat-sys-outline);
  --ngu-error-color: var(--mat-sys-error);
  --ngu-hint-color: var(--mat-sys-on-surface-variant);
  --ngu-surface: var(--mat-sys-surface-container);
  --ngu-radius: var(--mat-sys-corner-extra-small);
  --ngu-button-padding: 0.625rem 1.5rem;
}`,
          },
        ],
      },
    ],
    api: [
      {
        id: 'provide',
        title: 'provideNguMaterial(options)',
        rows: [
          {
            name: 'appearance',
            type: "'fill' | 'outline'",
            description:
              "Form field appearance. Defaults to `MAT_FORM_FIELD_DEFAULT_OPTIONS`, else Material's own.",
          },
          { name: 'floatLabel', type: "'auto' | 'always'", description: 'When labels float.' },
          {
            name: 'subscriptSizing',
            type: "'fixed' | 'dynamic'",
            description: '`dynamic` lets hints and errors take only the room they need.',
          },
          {
            name: 'dateAdapter',
            type: 'boolean',
            default: 'true',
            description:
              "Add Material's native `DateAdapter`. Set `false` when the app provides its own.",
          },
        ],
      },
    ],
  },

  primeng: {
    title: 'PrimeNG',
    description:
      'Render fields with PrimeNG 22 components, with ngu-form deciding when they show as invalid.',
    sections: [
      {
        id: 'setup',
        title: 'Setup',
        text: ['Set up PrimeNG and its theme as usual, then add `provideNguPrimeNG()`.'],
        code: [
          { code: 'npm install primeng @primeuix/themes', lang: 'bash' },
          {
            filename: 'app.config.ts',
            code: `import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { provideNguPrimeNG } from 'ngu-form/primeng';

export const appConfig: ApplicationConfig = {
  providers: [providePrimeNG({ theme: { preset: Aura } }), provideNguPrimeNG()],
};`,
          },
        ],
      },
      {
        id: 'demo',
        title: 'Every type',
        text: [
          "Labels sit above the controls, errors show as a `p-message` under them, and PrimeNG's `invalid` state turns on exactly when ngu-form shows the error, not as soon as the field is empty.",
        ],
        demo: {
          src: 'primeng/primeng.ts',
          // Loads the docs site's own theme files.
          stackblitz: false,
          load: () => import('../demos/primeng/primeng').then((m) => m.PrimeNgDemo),
        },
      },
      {
        id: 'types',
        title: 'Which component each type uses',
        table: {
          caption: 'PrimeNG components by type',
          columns: ['Type', 'PrimeNG'],
          rows: [
            [
              '`text`, `email`, `url`, `search`, `tel`, `time`, `month`, `week`',
              '`pInputText`, with `p-inputgroup` add-ons for prefix and suffix',
            ],
            ['A text field with `mask`', '`p-inputmask` (ngu-form’s `0` becomes PrimeNG’s `9`)'],
            ['`password`', '`p-password` with its show-password toggle'],
            ['`textarea`', '`pTextarea`, auto-resizing with `maxRows`'],
            ['`number`, `currency`', '`p-inputnumber`, formatted for the form’s locale'],
            ['`select`', '`p-select`, and `p-multiselect` on lists'],
            ['`checkbox`, `consent`', '`p-checkbox`'],
            ['`switch`', '`p-toggleswitch`'],
            ['`radio`', '`p-radiobutton`'],
            ['`segmented`', '`p-selectbutton`'],
            ['`range`', '`p-slider`'],
            ['`date`, `daterange`', '`p-datepicker`, in range mode for ranges'],
            ['`rating`', '`p-rating`'],
            ['`tags`, `otp`, `phone`, `color`, `captcha`, uploads', "ngu-form's own control"],
          ],
        },
        after: [
          "`p-inputtags` and `p-inputotp` are left out on purpose: the first renders an unnamed, empty listbox and the second one unlabeled input per character, which screen readers cannot make sense of. ngu-form's tags field and its single-input one-time code (which also autofills codes from SMS) take their place.",
        ],
      },
      {
        id: 'tokens',
        title: 'Matching the rest of the form',
        text: [
          "Point ngu-form's tokens at PrimeNG's variables, so its buttons, lists and own controls match:",
        ],
        code: [
          {
            lang: 'css',
            filename: 'styles.css',
            code: `ngu-form {
  /* Aura's primary under white text is 2.5:1; a darker shade keeps buttons readable. */
  --ngu-primary: var(--p-primary-700);
  --ngu-on-primary: #ffffff;
  --ngu-focus-color: var(--p-primary-color);
  --ngu-border-color: var(--p-inputtext-border-color);
  --ngu-input-bg: var(--p-inputtext-background);
  --ngu-error-color: var(--p-message-error-simple-color);
  --ngu-hint-color: var(--p-text-muted-color);
  --ngu-radius: var(--p-inputtext-border-radius);
}`,
          },
        ],
      },
      {
        id: 'binding',
        title: 'How the components are bound',
        text: [
          "PrimeNG components have their own `invalid` and `required` inputs. Angular's `[formField]` sets them straight from the field state, so an empty required field would turn red before anyone touched it. The PrimeNG renderer binds through `nguBind` instead, which connects a `ControlValueAccessor` to a field and leaves those inputs to the renderer.",
        ],
        code: [
          {
            lang: 'angular-html',
            code: `<p-select [nguBind]="context().field" [invalid]="context().showErrors" [options]="..." />`,
          },
        ],
        after: [
          '`nguBind` is exported from `ngu-form`, for other design systems built on `ControlValueAccessor`.',
        ],
      },
    ],
  },

  tailwind: {
    title: 'Unstyled and Tailwind',
    description:
      "Drop ngu-form's CSS and style the markup with utility classes: a ready Tailwind preset, your own class map, and classes per form, group and field.",
    sections: [
      {
        id: 'unstyled',
        title: 'Unstyled',
        text: [
          "`theme=\"none\"` on `<ngu-form>`, or `provideNguFormConfig({ theme: 'none' })` for every form, renders the same markup without ngu-form's CSS. Every element keeps its `ngu-*` class to style. What still applies: text for screen readers stays hidden, `cols` and `span` still lay out the grid, and long lists keep their scrolling box.",
        ],
        demo: {
          src: 'theming/unstyled.ts',
          load: () => import('../demos/theming/unstyled').then((m) => m.UnstyledDemo),
        },
      },
      {
        id: 'preset',
        title: 'The Tailwind preset',
        text: [
          "`nguTailwind` from `ngu-form/tailwind` is a complete class map for Tailwind 4: every slot is styled, in light and dark. Use it with `theme: 'none'`.",
        ],
        demo: {
          src: 'tailwind/preset.ts',
          // Loads the docs site's own theme files.
          stackblitz: false,
          load: () => import('../demos/tailwind/preset').then((m) => m.TailwindPresetDemo),
        },
      },
      {
        id: 'tailwind-setup',
        title: 'Setup',
        text: [
          "Import the preset's CSS after Tailwind. It points Tailwind at the preset's classes, since Tailwind does not scan `node_modules`. It also adds the `ngu-accent` color, and draws the few parts that have no slot: chevrons, step markers, problem badges and the warning mark.",
        ],
        code: [
          { code: 'npm install tailwindcss @tailwindcss/postcss', lang: 'bash' },
          {
            lang: 'json',
            filename: '.postcssrc.json',
            code: '{ "plugins": { "@tailwindcss/postcss": {} } }',
          },
          {
            lang: 'css',
            filename: 'styles.css',
            code: '@import "tailwindcss";\n@import "ngu-form/tailwind.css";\n\n/* Optional: your brand color for focus rings, checks and the submit button. */\n@theme {\n  --color-ngu-accent: var(--color-emerald-600);\n}',
          },
          {
            lang: 'angular-ts',
            filename: 'app.config.ts',
            code: "import { provideNguFormConfig } from 'ngu-form';\nimport { nguTailwind } from 'ngu-form/tailwind';\n\nexport const appConfig = {\n  providers: [provideNguFormConfig({ theme: 'none', classes: nguTailwind })],\n};",
          },
        ],
        after: [
          'The preset expects Tailwind\'s base reset (Preflight), which `@import "tailwindcss"` includes. Dark colors follow your `dark:` variant.',
        ],
      },
      {
        id: 'layouts',
        title: 'Wizards, lists and tabs',
        text: [
          'The same preset styles the step list, list rows, tabs and collapsible panels, and the review step at the end of a wizard.',
        ],
        demo: {
          src: 'tailwind/wizard.ts',
          // Loads the docs site's own theme files.
          stackblitz: false,
          load: () => import('../demos/tailwind/wizard').then((m) => m.TailwindWizardDemo),
        },
      },
      {
        id: 'levels',
        title: 'Classes per form, group and field',
        text: [
          'Classes add up from the outside in. `[classes]` on `<ngu-form>` adds to the app-wide map, slot by slot. On a group or list, `classes` reaches everything inside it; on a field, only that field.',
          '`class` puts classes on the element itself: the `<ngu-field>`, `<ngu-group>` or `<ngu-array>`, or the heading, paragraph or divider of static content.',
        ],
        demo: {
          src: 'tailwind/levels.ts',
          // Loads the docs site's own theme files.
          stackblitz: false,
          load: () => import('../demos/tailwind/levels').then((m) => m.TailwindLevelsDemo),
        },
        after: [
          'Run-time fields from an API take the same `class` and `classes`, as plain JSON. `<ngu-view>` has a `[classes]` input too.',
        ],
      },
      {
        id: 'merge',
        title: 'Conflicting utilities',
        text: [
          "When two levels set the same property, such as `px-3` from the preset and `px-4` on a field, both classes stay and the order of Tailwind's CSS decides, not the order you wrote them in. Pass `twMerge` from tailwind-merge as `mergeClasses`, and the inner level wins. For a single case, Tailwind's important modifier works too: `px-4!`.",
        ],
        code: [
          {
            lang: 'angular-ts',
            code: "import { twMerge } from 'tailwind-merge';\n\nprovideNguFormConfig({ theme: 'none', classes: nguTailwind, mergeClasses: twMerge });",
          },
        ],
      },
      {
        id: 'states',
        title: 'States',
        text: ['States are attributes, so Tailwind variants style them and the class map needs no slot per state.'],
        table: {
          caption: 'Attributes that mark states',
          columns: ['Attribute', 'On', 'Example'],
          rows: [
            ['`aria-invalid="true"`', 'Controls, while their error shows', '`aria-invalid:border-red-500`'],
            ['`data-invalid`', 'Fields, groups and lists, while an error shows', '`data-invalid:bg-red-50`'],
            [
              '`data-required`, `data-disabled`, `data-readonly`, `data-pending`, `data-warning`',
              'Fields',
              '`data-disabled:opacity-60`',
            ],
            ['`data-adorned`', 'A control inside a box with a prefix, suffix or icon', '`data-adorned:border-0`'],
            ['`aria-selected="true"`', 'The selected tab', '`aria-selected:text-indigo-600`'],
            ['`data-open`', 'Open panels', '`data-open:shadow-sm`'],
            ['`aria-current="step"`, `data-done`', 'Steps in the step list', '`aria-[current=step]:font-semibold`'],
          ],
        },
        after: [
          'Inside a field, put `group` in the `field` slot and use `group-data-invalid:` on the label, for example.',
        ],
      },
      {
        id: 'class-map',
        title: 'Your own class map',
        text: [
          'Write the map yourself for a different look; a slot you leave out stays unstyled. With a paid UI kit you own, such as Tailwind Plus, copy its class strings into your own map, in your app: ngu-form ships none of them.',
        ],
        demo: {
          src: 'tailwind/tailwind.ts',
          // Loads the docs site's own theme files.
          stackblitz: false,
          load: () => import('../demos/tailwind/tailwind').then((m) => m.TailwindDemo),
        },
        after: [
          "Keep the default theme and add a few utilities instead? Tailwind's utilities live in a cascade layer, and ngu-form's component styles are not layered, so ngu-form wins where both set the same property. Restyle with [tokens](/theming#tokens) in that case, or turn the theme off.",
        ],
      },
      {
        id: 'slots',
        title: 'Class map slots',
        table: {
          caption: 'Where each class map entry goes',
          columns: ['Key', 'Added to'],
          rows: [
            ['`form`', 'The `<form>` element'],
            ['`field`', 'Each `<ngu-field>`'],
            ['`label`', 'Labels and legends, and labels in view mode'],
            [
              '`control`',
              'Text inputs, selects and textareas, including those inside phone, tags and date range fields',
            ],
            ['`check`', 'Checkboxes, radios and switches'],
            ['`hint`', 'Hints under a field, the character counter and the text shown while an async check runs'],
            ['`warning`', 'Warnings from `warn`'],
            ['`error`', 'Error messages of fields, groups, lists and the form'],
            ['`adorned`', 'The box around a control with a prefix, suffix, icon or show-password button'],
            ['`affix`', 'Prefix and suffix text and icons'],
            ['`option`', 'Each option of a radio or checkbox group or a segmented control'],
            ['`chip`', 'Each tag of a tags field'],
            ['`group`', 'Each `<ngu-group>`'],
            ['`title`', 'Titles of groups, lists, panels and wizard steps, and static headings'],
            ['`description`', 'Descriptions of groups and lists, and static text'],
            ['`list`', 'Each `<ngu-array>`'],
            ['`row`', 'Each row of a list'],
            ['`tabs`', 'The tab list'],
            ['`tab`', 'Each tab'],
            ['`panel`', 'Each collapsible panel'],
            ['`steps`', "The wizard's step list"],
            ['`step`', 'Each step in that list'],
            ['`button`', 'Secondary buttons: add, remove, move, back, edit, discard, show password'],
            ['`submit`', 'The submit and Next buttons'],
            ['`actions`', 'The row of submit, Back and Next buttons'],
            ['`errorSummary`', 'The error summary of `<ngu-form errorSummary>`'],
            ['`notice`', 'The notice after a draft was restored'],
            ['`value`', 'Values in view mode: `<ngu-view>` and the review step'],
          ],
        },
      },
      {
        id: 'parts',
        title: 'Parts without a slot',
        text: [
          'Every element keeps its `ngu-*` class. Reach one from a slot with an arbitrary variant, such as `[&_.ngu-badge]:bg-amber-600` on `tab`, or style it in your CSS. Rating, one-time code, range, color and captcha fields keep their own markup; style them through their `ngu-*` classes.',
        ],
      },
    ],
  },

  renderers: {
    title: 'Renderers',
    description:
      'Render whole fields of a type with your own component: how the Material and PrimeNG adapters are built, open to any design system.',
    sections: [
      {
        id: 'whole-field',
        title: 'A whole-field renderer',
        text: [
          '`provideNguFieldRenderers` registers a component per `type`. It receives one `context` input with everything resolved: translated label, hint and options, the error only while it should show, `required`, the transform for masks and locale numbers, and the field to bind.',
        ],
        demo: {
          src: 'renderers/renderers.ts',
          files: ['renderers/boxed-field.ts'],
          load: () => import('../demos/renderers/renderers').then((m) => m.RenderersDemo),
        },
      },
      {
        id: 'order',
        title: 'Which one renders a field',
        list: [
          'An `nguField` template for the path replaces everything.',
          'An `nguControl` template for the path replaces only the control.',
          'A whole-field renderer registered for the type.',
          'A control renderer from `provideNguFieldTypes` for the type.',
          'The built-in control.',
        ],
      },
      {
        id: 'context',
        title: 'The context',
        table: {
          caption: 'NguFieldRenderContext',
          columns: ['Member', 'Type', 'Meaning'],
          rows: [
            [
              '`field`',
              '`Field<V>`',
              'Bind it with `[formField]` or `[nguBind]`, or read and write `field().value`.',
            ],
            [
              '`state`',
              '`FieldState<V>`',
              'Disabled, read-only, pending and the rest, as signals.',
            ],
            ['`def`', '`LeafDef`', 'The spec, with the type’s own options.'],
            ['`id`', '`string`', 'Put it on the control: the error summary links to it.'],
            ['`label`, `hint`, `placeholder`, `prefix`, `suffix`', '`string`', 'Translated.'],
            ['`choices`', '`Choice[]`', 'Options, resolved and translated.'],
            ['`error`', '`string | undefined`', 'The message while it should show.'],
            [
              '`warning`, `pending`',
              '`string | undefined`',
              'A `warn` message, or "Checking…" during an async check.',
            ],
            ['`showErrors`', '`boolean`', 'True while the error shows.'],
            ['`required`', '`boolean`', 'For an asterisk and `aria-required`.'],
            ['`transform`', '`FieldTransform`', 'For `[nguTransform]` on a native input.'],
            ['`counter`', '`{ length, max, text }`', 'When the field shows a character counter.'],
            ['`i18n`, `look`', '', 'Messages and the theme and class map.'],
            ['`touch()`', '', 'Marks the field touched, for controls without a native blur.'],
          ],
        },
      },
    ],
  },
};
