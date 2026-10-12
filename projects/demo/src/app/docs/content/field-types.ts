import type { ApiGroup, ApiRow, DocPage, DocSection } from 'docs-kit/docs/model';

const COMMON =
  'Every field also takes the [common options](/api/spec#field): `label`, `hint`, `required`, `hidden`, `validate` and more.';

function options(rows: readonly ApiRow[], text = COMMON): ApiGroup {
  return { id: 'options', title: 'Options', text, rows };
}

function a11y(points: readonly string[], keys?: readonly (readonly string[])[]): DocSection {
  return {
    id: 'accessibility',
    title: 'Accessibility',
    list: points,
    table: keys
      ? { caption: 'Keyboard support', columns: ['Key', 'Function'], rows: keys }
      : undefined,
  };
}

export const PAGES: Record<string, DocPage> = {
  text: {
    title: 'Text',
    description:
      'Text inputs for `string` values: plain text, email, password and textarea, with counters, adornments and autosize.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          'A string value is a text input. `type` picks `email`, `password` or `textarea`; email fields check the address.',
        ],
        demo: {
          src: 'text/basic.ts',
          load: () => import('../demos/text/basic').then((m) => m.TextBasicDemo),
        },
      },
      {
        id: 'counter',
        title: 'Character counter',
        text: [
          'Text and textarea fields with `maxLength` count characters. `counter: false` hides it.',
        ],
        demo: {
          src: 'text/counter.ts',
          load: () => import('../demos/text/counter').then((m) => m.TextCounterDemo),
        },
      },
      {
        id: 'adornments',
        title: 'Prefix and suffix',
        text: [
          '`prefix` and `suffix` add text inside the border, such as a currency sign, a unit or a domain.',
        ],
        demo: {
          src: 'text/adornments.ts',
          load: () => import('../demos/text/adornments').then((m) => m.TextAdornmentsDemo),
        },
      },
      {
        id: 'autosize',
        title: 'Textarea autosize',
        text: [
          '`rows` sets the height. With `maxRows`, the textarea grows with its content up to that many rows.',
        ],
        demo: {
          src: 'text/autosize.ts',
          load: () => import('../demos/text/autosize').then((m) => m.TextAutosizeDemo),
        },
      },
      a11y([
        'Each input has a `<label>`; the hint, error, counter, prefix and suffix are linked with `aria-describedby`.',
        'Password fields have a Show button whose name matches its text, and the change is announced.',
        '`inputmode` is inferred for email fields and for numbers that cannot go negative; `enterkeyhint` is set per field.',
      ]),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'text' | 'email' | 'password' | 'textarea'",
          default: "'text'",
          description: 'The input.',
        },
        { name: 'placeholder', type: 'string', description: 'Shown while the input is empty.' },
        {
          name: 'minLength / maxLength',
          type: 'number',
          description: 'Length rules. `maxLength` also shows a counter.',
        },
        { name: 'pattern', type: 'RegExp', description: 'The value must match.' },
        { name: 'counter', type: 'boolean', description: 'Show or hide the character counter.' },
        {
          name: 'reveal',
          type: 'boolean',
          default: 'true',
          description: 'The Show button on password fields.',
        },
        {
          name: 'prefix / suffix',
          type: 'string',
          description: 'Text inside the border, before or after the value.',
        },
        {
          name: 'rows / maxRows',
          type: 'number',
          description: 'Textarea height, and the most rows it grows to.',
        },
        { name: 'inputmode', type: 'InputMode', description: 'The mobile keyboard.' },
        {
          name: 'enterkeyhint',
          type: 'EnterKeyHint',
          description: 'The label of the Enter key on phones.',
        },
        { name: 'autocomplete', type: 'string', description: 'The HTML `autocomplete` token.' },
      ]),
    ],
  },

  number: {
    title: 'Number',
    description: 'A `number` value is a number input, with bounds and steps, or locale-aware text.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          '`min`, `max` and `step` are rules and native attributes. Values that cannot go negative get a numeric keypad on phones.',
        ],
        demo: {
          src: 'number/basic.ts',
          load: () => import('../demos/number/basic').then((m) => m.NumberBasicDemo),
        },
      },
      {
        id: 'localized',
        title: 'Localized',
        text: [
          "`localized` shows the number with the locale's digits and separators, and reads them back. Pass `Intl.NumberFormat` options for percentages or fixed decimals.",
        ],
        demo: {
          src: 'number/localized.ts',
          load: () => import('../demos/number/localized').then((m) => m.NumberLocalizedDemo),
        },
      },
      a11y(
        [
          'The input is labelled, and bounds are native attributes, so assistive technology reads them.',
        ],
        [['Arrow up / down', 'Changes the value by `step` (number inputs).']],
      ),
    ],
    api: [
      options([
        { name: 'min / max', type: 'number', description: 'Bounds.' },
        {
          name: 'step',
          type: 'number',
          description: 'The step of the arrows and the keypad choice.',
        },
        {
          name: 'localized',
          type: 'boolean | Intl.NumberFormatOptions',
          description: 'Show and read the number for the locale.',
        },
        {
          name: 'prefix / suffix',
          type: 'string',
          description: 'A unit or sign inside the border.',
        },
        {
          name: 'parse / format',
          type: '(text) => number / (value) => string',
          description: 'Your own conversion.',
        },
      ]),
    ],
  },

  currency: {
    title: 'Currency',
    description: 'An amount in a currency, shown for the locale while the model holds a number.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          '`type: \'currency\'` with an ISO 4217 `currency` code. The amount is formatted when the field is left: "₹12,50,000.00".',
        ],
        demo: {
          src: 'currency/basic.ts',
          load: () => import('../demos/currency/basic').then((m) => m.CurrencyBasicDemo),
        },
      },
      {
        id: 'amount',
        title: 'Without a currency',
        text: ['Without `currency`, it is an amount with two decimals.'],
        demo: {
          src: 'currency/amount.ts',
          load: () => import('../demos/currency/amount').then((m) => m.CurrencyAmountDemo),
        },
      },
      a11y([
        'A text input with a decimal keypad on phones when `min` is 0 or more. The formatted amount is the visible and the read value.',
      ]),
    ],
    api: [
      options([
        { name: 'type', type: "'currency'", description: 'On `number` properties.' },
        { name: 'currency', type: 'string', description: 'ISO 4217 code, such as `INR` or `EUR`.' },
        { name: 'min / max', type: 'number', description: 'Bounds.' },
      ]),
    ],
  },

  slider: {
    title: 'Slider',
    description: 'A number chosen on a native range input, with its value shown beside it.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          "`type: 'range'`, after the HTML attribute. `prefix` and `suffix` appear with the shown value.",
        ],
        demo: {
          src: 'slider/basic.ts',
          load: () => import('../demos/slider/basic').then((m) => m.SliderBasicDemo),
        },
      },
      {
        id: 'steps',
        title: 'Bounds and steps',
        text: ['`min`, `max` and `step` set the scale. Without them, the browser uses 0 to 100.'],
        demo: {
          src: 'slider/steps.ts',
          load: () => import('../demos/slider/steps').then((m) => m.SliderStepsDemo),
        },
      },
      a11y(
        ['Screen readers hear the value with its unit through `aria-valuetext`, such as "40 %".'],
        [
          ['Arrow right / up', 'Increases by `step`.'],
          ['Arrow left / down', 'Decreases by `step`.'],
          ['Home / End', 'Moves to `min` or `max`.'],
        ],
      ),
    ],
    api: [
      options([
        { name: 'type', type: "'range'", description: 'On `number` properties.' },
        { name: 'min / max', type: 'number', default: '0 / 100', description: 'The scale.' },
        { name: 'step', type: 'number', default: '1', description: 'The step.' },
        { name: 'prefix / suffix', type: 'string', description: 'Shown and read with the value.' },
      ]),
    ],
  },

  rating: {
    title: 'Rating',
    description: 'Stars for a `number`: `0` is not rated, and each star is a native radio.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          "`type: 'rating'`. Clicking the chosen star again clears it, unless the field is required.",
        ],
        demo: {
          src: 'rating/basic.ts',
          load: () => import('../demos/rating/basic').then((m) => m.RatingBasicDemo),
        },
      },
      {
        id: 'stars',
        title: 'Number of stars and required',
        text: ['`max` sets the number of stars. `required` needs at least one.'],
        demo: {
          src: 'rating/stars.ts',
          load: () => import('../demos/rating/stars').then((m) => m.RatingStarsDemo),
        },
      },
      a11y(
        [
          'A `radiogroup` named by the label; each star is read as "3 stars". Filled and empty stars differ in shape, not only color.',
        ],
        [
          ['Tab', 'Moves into the stars, to the chosen one.'],
          ['Arrow keys', 'Choose the next or previous star.'],
        ],
      ),
    ],
    api: [
      options([
        { name: 'type', type: "'rating'", description: 'On `number` properties.' },
        { name: 'max', type: 'number', default: '5', description: 'The number of stars.' },
        { name: 'min', type: 'number', description: 'The lowest accepted rating.' },
      ]),
    ],
  },

  checkbox: {
    title: 'Checkbox and switch',
    description: 'A `boolean` is a checkbox, or a switch for settings that apply at once.',
    sections: [
      {
        id: 'checkbox',
        title: 'Checkbox',
        text: ['A boolean value needs nothing but a label. `required` needs it ticked.'],
        demo: {
          src: 'checkbox/basic.ts',
          load: () => import('../demos/checkbox/basic').then((m) => m.CheckboxBasicDemo),
        },
      },
      {
        id: 'switch',
        title: 'Switch',
        text: ['`type: \'switch\'` draws the checkbox as a switch with `role="switch"`.'],
        demo: {
          src: 'checkbox/switch.ts',
          load: () => import('../demos/checkbox/switch').then((m) => m.CheckboxSwitchDemo),
        },
      },
      a11y(
        [
          'Native checkboxes with their labels; switches have `role="switch"`, so they read as on or off.',
        ],
        [['Space', 'Toggles.']],
      ),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'checkbox' | 'switch'",
          default: "'checkbox'",
          description: 'On `boolean` properties.',
        },
      ]),
    ],
  },

  'checkbox-group': {
    title: 'Checkbox group',
    description: 'A `string[]` or `number[]` chosen from options, as one field of checkboxes.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          "`type: 'checkbox'` with `options` on a list. The value keeps the order of the options.",
        ],
        demo: {
          src: 'checkbox-group/basic.ts',
          load: () => import('../demos/checkbox-group/basic').then((m) => m.CheckboxGroupBasicDemo),
        },
      },
      {
        id: 'limits',
        title: 'Limits',
        text: [
          '`min` and `max` count chosen options ("Choose at most 3 options"); `required` needs one.',
        ],
        demo: {
          src: 'checkbox-group/limits.ts',
          load: () =>
            import('../demos/checkbox-group/limits').then((m) => m.CheckboxGroupLimitsDemo),
        },
      },
      {
        id: 'numbers',
        title: 'Number values',
        text: ['Options keep their type, so a `number[]` stays numbers.'],
        demo: {
          src: 'checkbox-group/numbers.ts',
          load: () =>
            import('../demos/checkbox-group/numbers').then((m) => m.CheckboxGroupNumbersDemo),
        },
      },
      a11y(
        [
          'A `fieldset` named by its legend. Each checkbox is marked invalid while an error shows, since groups take no `aria-invalid`.',
        ],
        [
          ['Tab', 'Moves between checkboxes.'],
          ['Space', 'Ticks or clears one.'],
        ],
      ),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'checkbox'",
          description: 'On `string[]` and `number[]` properties.',
        },
        {
          name: 'options',
          type: 'Choice[] | Signal<Choice[]> | (model) => Choice[]',
          description: '`{ value, label, disabled? }` items.',
        },
        { name: 'min / max', type: 'number', description: 'How many may be chosen.' },
      ]),
    ],
  },

  radio: {
    title: 'Radio and segmented',
    description: 'One value from a few options: radios, or a segmented control of joined buttons.',
    sections: [
      {
        id: 'radio',
        title: 'Radio',
        text: ["`type: 'radio'` with `options`. An option can be `disabled`."],
        demo: {
          src: 'radio/basic.ts',
          load: () => import('../demos/radio/basic').then((m) => m.RadioBasicDemo),
        },
      },
      {
        id: 'segmented',
        title: 'Segmented',
        text: ["`type: 'segmented'` draws the radios as joined buttons, for two to five options."],
        demo: {
          src: 'radio/segmented.ts',
          load: () => import('../demos/radio/segmented').then((m) => m.RadioSegmentedDemo),
        },
      },
      {
        id: 'numbers',
        title: 'Number values',
        text: ['A number property with number options stays a number.'],
        demo: {
          src: 'radio/numbers.ts',
          load: () => import('../demos/radio/numbers').then((m) => m.RadioNumbersDemo),
        },
      },
      a11y(
        [
          'A `radiogroup` named by its legend, with `aria-required` and `aria-invalid` on the group.',
        ],
        [
          ['Tab', 'Moves to the chosen option.'],
          ['Arrow keys', 'Choose the next or previous option.'],
        ],
      ),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'radio' | 'segmented'",
          description: 'On `string` and `number` properties.',
        },
        {
          name: 'options',
          type: 'Choice[] | Signal<Choice[]> | (model) => Choice[]',
          description: '`{ value, label, disabled? }` items.',
        },
      ]),
    ],
  },

  select: {
    title: 'Select',
    description: 'A native select for one value, or a multiple select for a list.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          "`type: 'select'` with `options`, and an optional `placeholder`. Number options write numbers.",
        ],
        demo: {
          src: 'select/basic.ts',
          load: () => import('../demos/select/basic').then((m) => m.SelectBasicDemo),
        },
      },
      {
        id: 'multiple',
        title: 'Multiple',
        text: [
          'On a `string[]` or `number[]`, `select` becomes a multiple select. `min` and `max` count chosen options. With a mouse, a hint explains Ctrl or ⌘.',
        ],
        demo: {
          src: 'select/multiple.ts',
          load: () => import('../demos/select/multiple').then((m) => m.SelectMultipleDemo),
        },
      },
      {
        id: 'cascading',
        title: 'Cascading',
        text: [
          'Options can be a function of the model; see [cascading options](/dependent-values#cascading).',
        ],
      },
      a11y(
        ['Native selects, labelled, with the system picker on phones.'],
        [
          ['Arrow keys', 'Move between options.'],
          ['Ctrl / ⌘ + click', 'Adds an option (multiple).'],
        ],
      ),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'select'",
          description: 'On `string`, `number`, `string[]` and `number[]` properties.',
        },
        {
          name: 'options',
          type: 'Choice[] | Signal<Choice[]> | (model) => Choice[]',
          description: '`{ value, label, disabled? }` items.',
        },
        {
          name: 'placeholder',
          type: 'string',
          description: 'A first, disabled option (single select).',
        },
        { name: 'min / max', type: 'number', description: 'How many may be chosen (multiple).' },
      ]),
    ],
  },

  date: {
    title: 'Date',
    description: 'A native date input for an ISO string or a `Date`.',
    sections: [
      {
        id: 'basic',
        title: 'ISO strings',
        text: ["`type: 'date'` on a string holds `YYYY-MM-DD`, or `''` while empty."],
        demo: {
          src: 'date/basic.ts',
          load: () => import('../demos/date/basic').then((m) => m.DateBasicDemo),
        },
      },
      {
        id: 'objects',
        title: 'Date objects',
        text: [
          "A `Date` value is inferred as a date field and holds midnight UTC. `Date | null` needs `type: 'date'`. Bounds take a `Date` or an ISO string, and messages show them for the locale.",
        ],
        demo: {
          src: 'date/objects.ts',
          load: () => import('../demos/date/objects').then((m) => m.DateObjectsDemo),
        },
      },
      a11y(["The browser's own date input and picker, labelled. Bounds are native attributes."]),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'date'",
          description: 'On `string`, `Date` and `Date | null` properties.',
        },
        { name: 'min / max', type: 'Date | string', description: 'The earliest and latest day.' },
      ]),
    ],
  },

  time: {
    title: 'Time, month and week',
    description:
      "Native `time`, `datetime-local`, `month` and `week` inputs, holding the input's own ISO format.",
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          "The value is a string: `'10:30'`, `'2026-05-01T17:00'`, `'2026-05'` or `'2026-W18'`.",
        ],
        demo: {
          src: 'time/basic.ts',
          load: () => import('../demos/time/basic').then((m) => m.TimeBasicDemo),
        },
      },
      {
        id: 'bounds',
        title: 'Bounds and steps',
        text: [
          '`min` and `max` use the same format; messages show them for the locale ("on or after 9:00 AM"). `step` is in seconds for times.',
        ],
        demo: {
          src: 'time/bounds.ts',
          load: () => import('../demos/time/bounds').then((m) => m.TimeBoundsDemo),
        },
      },
      a11y([
        'Native inputs and pickers. Browsers without month or week inputs show a text field; the format is still checked.',
      ]),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'time' | 'datetime-local' | 'month' | 'week'",
          description: 'On `string` properties.',
        },
        { name: 'min / max', type: 'string', description: "In the input's format." },
        {
          name: 'step',
          type: 'number',
          description: 'Seconds for times; months or weeks otherwise.',
        },
      ]),
    ],
  },

  'date-range': {
    title: 'Date range',
    description: 'A `{ from, to }` value edited as two date inputs that limit each other.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          "`type: 'daterange'` on an object with `from` and `to`. An end before the start, or a missing end, is an error; `required` needs both.",
        ],
        demo: {
          src: 'date-range/basic.ts',
          load: () => import('../demos/date-range/basic').then((m) => m.DateRangeBasicDemo),
        },
      },
      {
        id: 'strings',
        title: 'Strings and bounds',
        text: [
          'The ends are `Date | null` or ISO strings, following the model. `min` and `max` apply to both.',
        ],
        demo: {
          src: 'date-range/strings.ts',
          load: () => import('../demos/date-range/strings').then((m) => m.DateRangeStringsDemo),
        },
      },
      a11y([
        'A `fieldset` named by the label; both inputs have their own labels ("From", "To", or `fromLabel` and `toLabel`).',
      ]),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'daterange'",
          description: 'On `{ from, to }` properties of dates or ISO strings.',
        },
        { name: 'min / max', type: 'Date | string', description: 'Bounds for both ends.' },
        {
          name: 'fromLabel / toLabel',
          type: 'string',
          default: "'From' / 'To'",
          description: 'Labels of the two inputs.',
        },
      ]),
    ],
  },

  phone: {
    title: 'Phone',
    description: 'A country picker and a number, stored as E.164 such as `+919876543210`.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          "Typing or pasting a number that starts with `+` or `00` picks its country, and a leading trunk `0` is dropped. Country names come from `Intl.DisplayNames` in the form's language.",
        ],
        demo: {
          src: 'phone/basic.ts',
          load: () => import('../demos/phone/basic').then((m) => m.PhoneBasicDemo),
        },
      },
      {
        id: 'countries',
        title: 'Countries',
        text: [
          "`countries` limits and orders the list; `country` is the one picked while the value is empty, else the locale's region. The length is checked for common countries; use libphonenumber-js in `validate` for complete rules.",
        ],
        demo: {
          src: 'phone/countries.ts',
          load: () => import('../demos/phone/countries').then((m) => m.PhoneCountriesDemo),
        },
      },
      a11y([
        'The label names the number input; the picker is named "Country code". The number stays left to right in right-to-left forms.',
      ]),
    ],
    api: [
      options([
        { name: 'type', type: "'phone'", description: 'On `string` properties.' },
        { name: 'countries', type: 'string[]', description: 'ISO 3166 codes offered, in order.' },
        { name: 'country', type: 'string', description: 'Picked while the value is empty.' },
      ]),
    ],
  },

  otp: {
    title: 'One-time code',
    description: 'A code drawn as boxes over one input with `autocomplete="one-time-code"`.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          'SMS codes autofill on phones, and a pasted "123-456" fills every box. A half-filled code is an error.',
        ],
        demo: {
          src: 'otp/basic.ts',
          load: () => import('../demos/otp/basic').then((m) => m.OtpBasicDemo),
        },
      },
      {
        id: 'alphanumeric',
        title: 'Letters and length',
        text: [
          "`length` sets the boxes; `characters: 'alphanumeric'` allows letters, shown in capitals.",
        ],
        demo: {
          src: 'otp/alphanumeric.ts',
          load: () => import('../demos/otp/alphanumeric').then((m) => m.OtpAlphanumericDemo),
        },
      },
      a11y([
        'Screen readers meet one ordinary text field; the boxes are decoration. Codes are never saved in drafts.',
      ]),
    ],
    api: [
      options([
        { name: 'type', type: "'otp'", description: 'On `string` properties.' },
        { name: 'length', type: 'number', default: '6', description: 'Number of characters.' },
        {
          name: 'characters',
          type: "'digits' | 'alphanumeric'",
          default: "'digits'",
          description: 'What may be typed.',
        },
      ]),
    ],
  },

  tags: {
    title: 'Tags',
    description: 'Free-text tags for a `string[]`.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          'Enter or a comma adds a tag, pasted lists are split, Backspace removes the last one, and duplicates are refused.',
        ],
        demo: {
          src: 'tags/basic.ts',
          load: () => import('../demos/tags/basic').then((m) => m.TagsBasicDemo),
        },
      },
      {
        id: 'limits',
        title: 'Limits and separators',
        text: [
          '`min` and `max` count tags, `maxLength` caps each one, and `separators` sets the keys that finish a tag.',
        ],
        demo: {
          src: 'tags/limits.ts',
          load: () => import('../demos/tags/limits').then((m) => m.TagsLimitsDemo),
        },
      },
      a11y(
        [
          'Tags are a list; each has a remove button named "Remove angular". Additions, removals and refused duplicates are announced.',
        ],
        [
          ['Enter / separator', 'Adds the typed tag.'],
          ['Backspace', 'In an empty input, removes the last tag.'],
        ],
      ),
    ],
    api: [
      options([
        { name: 'type', type: "'tags'", description: 'On `string[]` properties.' },
        { name: 'min / max', type: 'number', description: 'How many tags.' },
        { name: 'maxLength', type: 'number', description: 'The longest tag.' },
        {
          name: 'separators',
          type: 'string[]',
          default: "[',']",
          description: 'Keys that finish a tag; pasted text splits on them too.',
        },
      ]),
    ],
  },

  url: {
    title: 'URL, search and color',
    description: 'Native `url`, `search`, `tel` and `color` inputs with matching checks.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          '`url` needs a full http or https address and adds `https://` to a bare domain on leaving. `color` holds `#rrggbb` and shows it. `tel` takes a `mask` like any text field.',
        ],
        demo: {
          src: 'url/basic.ts',
          load: () => import('../demos/url/basic').then((m) => m.UrlBasicDemo),
        },
      },
      a11y(['Native inputs bring the matching phone keyboards; search fields get a Search key.']),
    ],
    api: [
      options([
        {
          name: 'type',
          type: "'url' | 'search' | 'tel' | 'color'",
          description: 'On `string` properties.',
        },
      ]),
    ],
  },

  consent: {
    title: 'Consent',
    description: 'A checkbox that stores when it was accepted, with a link to the policy.',
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          "`type: 'consent'` on `Date | null`: ticking stores the time, unticking stores `null`. `policy` adds a link that opens in a new tab.",
        ],
        demo: {
          src: 'consent/basic.ts',
          load: () => import('../demos/consent/basic').then((m) => m.ConsentBasicDemo),
        },
      },
      a11y(
        ['A native checkbox. The policy link says it opens in a new tab.'],
        [['Space', 'Accepts or withdraws.']],
      ),
    ],
    api: [
      options([
        { name: 'type', type: "'consent'", description: 'On `Date | null` properties.' },
        {
          name: 'policy',
          type: '{ href: string; label: string }',
          description: 'A link shown after the label.',
        },
      ]),
    ],
  },

  captcha: {
    title: 'Captcha',
    description: "A provider's widget in the form; its token is the field's value.",
    sections: [
      {
        id: 'basic',
        title: 'Basic',
        text: [
          'A captcha is required by default, never saved in drafts or `changes()`, and reset after each submit that reached the action, because tokens are single use. This demo uses a pretend provider.',
        ],
        demo: {
          src: 'captcha/basic.ts',
          load: () => import('../demos/captcha/basic').then((m) => m.CaptchaBasicDemo),
        },
      },
      {
        id: 'providers',
        title: 'Turnstile, hCaptcha and reCAPTCHA',
        text: ['Each loads its script on first use.'],
        code: [
          {
            code: `import { nguHCaptcha, nguRecaptcha, nguTurnstile, provideNguCaptcha } from 'ngu-form';

providers: [provideNguCaptcha(nguTurnstile({ siteKey: '0x4AAAA...', theme: 'auto' }))]
// or nguHCaptcha({ siteKey }), nguRecaptcha({ siteKey })`,
          },
        ],
      },
      {
        id: 'adapter',
        title: 'Other providers',
        text: ['Any provider fits `NguCaptchaAdapter` in a few lines.'],
        code: [
          {
            code: `const myCaptcha: NguCaptchaAdapter = {
  render(host, events, { language }) {
    const id = provider.render(host, { onSuccess: events.token, onExpire: events.expired, onError: events.error });
    return { reset: () => provider.reset(id), remove: () => provider.remove(id) };
  },
};`,
          },
        ],
      },
      a11y([
        'The widget sits in a named group. A widget that fails to load shows an error and blocks the submit.',
      ]),
    ],
    api: [
      options([
        { name: 'type', type: "'captcha'", description: 'On `string` properties.' },
        {
          name: 'captcha',
          type: 'NguCaptchaAdapter',
          description: 'The provider for this field; else the one from `provideNguCaptcha`.',
        },
      ]),
    ],
  },

  dropdown: {
    title: 'Server dropdown',
    description:
      'A select that pages through the server as you scroll, with search, from the `ngu-dropdown` package. For long lists that cannot be loaded at once.',
    sections: [
      {
        id: 'setup',
        title: 'Setup',
        text: ['Install `ngu-dropdown` and register the type. `ngu-form/dropdown` also teaches TypeScript the type and its options.'],
        code: [
          { code: 'npm install ngu-dropdown', lang: 'bash' },
          {
            filename: 'app.config.ts',
            code: `import { provideNguDropdown } from 'ngu-form/dropdown';

providers: [provideNguDropdown()]`,
          },
        ],
      },
      {
        id: 'demo',
        title: 'Server paging',
        text: [
          '`fetch` gets one page per call (`{ page, size, search, filters }`) and returns an Observable or a Promise of `{ content, totalElements }`, the shape of a Spring Data page. The scrollbar covers the whole result set; rows load as you reach them. A list value makes it a multiple select with chips.',
        ],
        demo: {
          src: 'dropdown/dropdown.ts',
          files: ['dropdown/cities.ts'],
          load: () => import('../demos/dropdown/dropdown').then((m) => m.DropdownDemo),
        },
      },
      {
        id: 'saved',
        title: 'Saved values',
        text: [
          'A saved record holds a key whose row may not be on a loaded page. `lookup` loads the rows of such keys, so the label shows at once.',
        ],
        code: [
          {
            code: `city: {
  label: 'Home city',
  type: 'dropdown',
  fetch: (query, { signal }) => this.http.get<Page<City>>('/api/cities', { params: toParams(query) }),
  lookup: (ids) => this.http.get<City[]>('/api/cities', { params: { ids: ids.join(',') } }),
  optionValue: 'id',
  optionLabel: 'name',
}`,
          },
        ],
      },
      a11y([
        'The ARIA combobox pattern with a listbox; arrow keys, Home, End, Page Up and Page Down move through the whole result set.',
        'The label, hint and errors are ngu-form\'s own, linked to the control. The dropdown shows its error state exactly when ngu-form shows the error.',
      ]),
    ],
    api: [
      options([
        { name: 'type', type: "'dropdown'", description: 'On any value; a list value makes it multiple.' },
        { name: 'fetch', type: '(query, { signal }) => Observable | Promise', description: 'One page of rows from the server.' },
        { name: 'options', type: 'rows | Signal | (model) => rows', description: 'A static list instead of `fetch`.' },
        { name: 'lookup', type: '(keys, { signal }) => Observable | Promise', description: 'Rows of values that are not on a loaded page.' },
        { name: 'optionValue', type: 'string', default: "'value'", description: 'Path of the value in a row.' },
        { name: 'optionLabel', type: 'string | (row) => string', default: "'label'", description: 'Path of the label, or a function.' },
        { name: 'filters', type: 'Record | Signal<Record>', description: 'Sent with every query; a signal re-queries on change.' },
        { name: 'search', type: 'boolean', description: 'Show the search box. Default: with `fetch`, or more than 10 options.' },
        { name: 'pageSize', type: 'number', default: '50', description: 'Rows per request.' },
        { name: 'clearable', type: 'boolean', default: 'true', description: 'A clear button.' },
        { name: 'maxChips', type: 'number', default: '2', description: 'Chips before "+3 more" in multiple mode.' },
      ]),
    ],
  },
};
