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
      "Drop ngu-form's CSS and style the markup yourself, for example with Tailwind classes added through a class map.",
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
        id: 'class-map',
        title: 'A class map',
        text: [
          "`classes` in `provideNguFormConfig` adds your classes to the elements ngu-form renders, next to their own. With `theme: 'none'`, Tailwind utilities style the form completely.",
        ],
        demo: {
          src: 'tailwind/tailwind.ts',
          load: () => import('../demos/tailwind/tailwind').then((m) => m.TailwindDemo),
        },
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
            ['`label`', 'Labels and legends'],
            [
              '`control`',
              'Text inputs, selects and textareas, including those inside phone, tags and date range fields',
            ],
            ['`check`', 'Checkboxes, radios and switches'],
            ['`hint`', 'Hints under a field'],
            ['`error`', 'Error messages of fields, groups, lists and the form'],
            ['`group`', 'Each `<ngu-group>`'],
            ['`title`', 'Titles of groups, lists and wizard steps'],
            ['`list`', 'Each `<ngu-array>`'],
            ['`row`', 'Each row of a list'],
            ['`button`', 'Secondary buttons: add, remove, move, back, show password'],
            ['`submit`', 'The submit and Next buttons'],
          ],
        },
      },
      {
        id: 'tailwind-setup',
        title: 'Tailwind 4 setup',
        text: [
          'Tailwind scans your source for class names, so classes in the class map and in specs are found like any other.',
        ],
        code: [
          { code: 'npm install tailwindcss @tailwindcss/postcss', lang: 'bash' },
          {
            lang: 'json',
            filename: '.postcssrc.json',
            code: '{ "plugins": { "@tailwindcss/postcss": {} } }',
          },
          { lang: 'css', filename: 'styles.css', code: '@import "tailwindcss";' },
        ],
        after: [
          "Keep the default theme and add a few utilities instead? Tailwind's utilities live in a cascade layer, and ngu-form's component styles are not layered, so ngu-form wins where both set the same property. Restyle with [tokens](/theming#tokens) in that case, or turn the theme off.",
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
