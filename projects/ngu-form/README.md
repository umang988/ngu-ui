# ngu-form

Define Angular forms in TypeScript. The spec mirrors your model: a nested
object becomes a grid group, everything else is an input. One tag in the template.
Built on Angular Signal Forms (`@angular/forms/signals`), so validation, state and
binding are the official ones.

## Install

```sh
npm install ngu-form
```

Peer dependencies: `@angular/core`, `@angular/common`, `@angular/forms` 22.2 or newer.

## Quick start

```ts
import { Component } from "@angular/core";
import { defineForm, NguForm } from "ngu-form";

@Component({
  selector: "app-login",
  imports: [NguForm],
  template: `<ngu-form [form]="login" submitLabel="Sign in" (submitted)="signIn($event)" />`,
})
export class LoginPage {
  readonly login = defineForm({ email: "", password: "", remember: false }, {
    email: { label: "Email", type: "email", required: true },
    password: { label: "Password", type: "password", required: true, minLength: 8 },
    remember: "Keep me signed in",
  });

  signIn(value: { email: string; password: string; remember: boolean }) {
    console.log(value);
  }
}
```

The first argument is the initial value (or an existing `WritableSignal`). The second
mirrors it: every key gets a label string or an options object.

## A bigger form

```ts
interface Signup {
  name: string;
  account: { email: string; password: string };
  address: { city: string; zip: string };
  plan: "free" | "pro";
  company: string;
  newsletter: boolean;
}

readonly signup = defineForm<Signup>(initial, {
  name: { label: "Full name", required: true, minLength: 2 },
  account: {
    title: "Account",
    cols: 2,
    fields: {
      email: { label: "Email", type: "email", required: true },
      password: { label: "Password", type: "password", minLength: 8 },
    },
  },
  address: { city: "City", zip: { label: "ZIP", pattern: /^\\d{5}$/ } },
  plan: {
    label: "Plan",
    type: "radio",
    options: [{ value: "free", label: "Free" }, { value: "pro", label: "Pro" }],
  },
  company: { label: "Company", required: true, hidden: (m) => m.plan !== "pro" },
  newsletter: "Send me updates",
});
```

## The rules

- **A string is a label.** The input type comes from the value type: string gives a
  text input, number a number input, boolean a checkbox, `Date` a date input.
- **Set `type` to choose another input**: `email`, `password`, `textarea`, `date`,
  `select` or `radio`. Only types valid for the value type are allowed, so
  `type: "email"` on a number is a compile error.
- **A nested object is a group.** Write its fields directly, or wrap them in
  `{ fields, cols, title, description, span, hidden }` for layout. Groups render as a
  CSS grid that adapts to the form's width (see [Layout](#layout-and-static-content)).
- **Every model key must be described**, with a spec that matches its type.
- **Rules map to Signal Forms.** `required`, `minLength`, `maxLength`, `pattern`,
  `min`, `max`, `email`, `hidden`, `disabled`, `readonly` become Signal Forms rules,
  so `def.tree` is a normal `FieldTree` you can inspect or test.
- **Logic functions see the whole model**: `hidden: (m) => m.plan !== "pro"`.
- **Default error messages** per rule, overridable with `required: "Custom text"`, and
  translatable app-wide (see [Messages and translation](#messages-and-translation)).
- **Errors show late, not early.** By default a field shows its message after it was
  changed and left. Use `errorsOn="touched"` on `<ngu-form>` to show on blur, or
  `errorsOn="submit"` to wait for a submit attempt; set `errorsOn` on a field to override
  it there. A submit attempt always reveals every remaining error.
- **Autofill does not count as interaction.** Chrome's password manager fires focus and
  blur on every field it fills. Those are ignored, so autofilled fields stay quiet
  until the user edits them or submits. Set `autocomplete` per field to steer autofill,
  for example `autocomplete: "off"` or `autocomplete: "current-password"`.
- **Options can be signals**, so a select can load its choices at run time.
- **Read the value** with `def.value()`, or update it through `def.model`.
- **Keys that start with `$` are static content**: headings, paragraphs and dividers
  that have no model value.

## Layout and static content

```ts
readonly profile = defineForm<Profile>(initial, {
  $intro: { heading: "About you" },
  name: "Name",
  contact: {
    title: "Contact",
    cols: { base: 1, sm: 2, lg: 3 },
    fields: { email: "Email", phone: "Phone", city: { label: "City", span: 2 } },
  },
  $privacy: { text: "We never share your details." },
  $line: { divider: true },
  newsletter: "Send me updates",
}, { cols: 1 });
```

- **`cols`** is a number or an object per breakpoint: `{ base, sm, md, lg }`. The form's
  own width decides, not the viewport, so a form in a sidebar or dialog collapses too.
  A number keeps its columns from `sm` up and shows one column below it.
- **Breakpoints** default to `sm` 480px, `md` 720px and `lg` 960px of form width. Change them
  with `provideNguFormConfig({ breakpoints: { sm: 400, md: 640, lg: 900 } })`.
- **`span`** is capped at the current column count, so a `span: 3` field fills the row on a
  two-column phone layout instead of breaking the grid.
- **Static content** sits under a `$` key: `{ heading, level? }` (level 2 to 6, default 3),
  `{ text }` or `{ divider: true }`. It takes a whole row unless it sets `span`, and accepts
  `hidden: (model) => boolean`. It never appears in the value.

## Input details

```ts
price: { label: "Price", prefix: "₹", min: 0, step: 0.01 },
weight: { label: "Weight", suffix: "kg", min: 0 },
bio: { label: "Bio", type: "textarea", maxLength: 200, rows: 2, maxRows: 8 },
password: { label: "Password", type: "password", minLength: 8 },
pin: { label: "PIN", inputmode: "numeric", enterkeyhint: "done" },
```

- **`prefix` and `suffix`** add text such as a currency or a unit inside the input's border.
  Screen readers hear it through `aria-describedby`.
- **Character counter.** Text and textarea fields with `maxLength` show "12 / 200". Screen
  readers hear "188 characters remaining" with the field description. `counter: false`
  turns it off; `counter: true` adds it to other text-like types.
- **Show password.** Password fields get a "Show" button (`reveal: false` to remove it).
  The change is announced politely, and the password is hidden again on every submit so
  browsers never save it as plain text.
- **Mobile keyboards.** `inputmode` is inferred: `email` for email fields, `numeric` or
  `decimal` for number fields whose `min` is 0 or more (phone keypads have no minus key).
  Set `inputmode` or `enterkeyhint` per field to override.
- **Textareas.** `rows` sets the height. With `maxRows`, the textarea grows with its content
  up to that many rows and then scrolls.

## Arrays

An array property is described once, through `item`, and renders one row per element.
Adding and removing rows updates the model value.

```ts
readonly order = defineForm<Order>(initial, {
  customer: { label: "Customer", required: true },
  items: {
    title: "Items",
    cols: 3,
    min: 1,
    max: 5,
    addLabel: "Add item",
    newItem: () => ({ sku: "", qty: 1, gift: false, note: "" }),
    item: {
      sku: { label: "SKU", required: true },
      qty: { label: "Qty", min: 1 },
      gift: "Gift wrap",
      note: { label: "Gift note", span: 3, hidden: (_, item) => !item.gift },
    },
  },
  phones: { title: "Phones", newItem: "", item: { label: "Phone", pattern: /^\\+?[\\d\\s-]{7,}$/ } },
});
```

- `item` is a field map for arrays of objects, or a single field spec for arrays of
  primitives.
- `newItem` is a factory or a plain value (cloned on every add). It is also used to infer
  the input types of the item fields, so the list can start empty.
- `min` and `max` limit the row count and disable the buttons at the limits.
- Logic functions inside `item` get the current element as their second argument.
- Set `addLabel: ""` or `removeLabel: ""` to hide a button and control the rows yourself
  through `def.model`.
- Nested arrays inside array items are not supported yet.
- With `type: "checkbox"`, `"select"` or `"tags"` (or a custom type), an array is one field
  instead of a list of rows; see [Field types](#field-types).

## Field types

The value type decides which `type` values fit, and TypeScript rejects the others.

| Value | Renders as | Other types |
| --- | --- | --- |
| `string` | text input | `email`, `password`, `textarea`, `url`, `search`, `tel`, `color`, `date`, `time`, `datetime-local`, `month`, `week`, `select`, `radio`, `segmented`, `phone`, `otp`, `captcha` |
| `number` | number input | `range`, `currency`, `rating`, `select`, `radio`, `segmented` |
| `boolean` | checkbox | `switch` |
| `Date` | date input | `consent` (on `Date \| null`) |
| `string[]`, `number[]` | a list with add and remove | `checkbox` or `select` with `options`, `tags` (strings only) |
| `{ from, to }` | a group | `daterange` |
| `File`, `File[]` | | `file`, `image` (from `ngu-form/upload`) |

A `date` field holds an ISO string or a `Date`. The demo app's "Every field type" example
shows them all on one page.

### Choices

```ts
toppings: { label: "Toppings", type: "checkbox", options: TOPPINGS, min: 1, max: 3 }, // string[]
languages: { label: "Languages", type: "select", options: LANGUAGES },               // string[]: a multiple select
newsletter: { label: "Email me news", type: "switch" },                              // boolean
view: { label: "View", type: "segmented", options: VIEWS },                          // radios shown as buttons
size: { label: "Size", type: "radio", options: [{ value: 1, label: "Small" }, { value: 2, label: "Large" }] },
```

- On a list, `checkbox` renders a checkbox per option and `select` a multiple select. The
  value keeps the options' order. `min` and `max` count the chosen options ("Choose at least
  1 option"), and `required` needs one.
- `switch` is a checkbox with `role="switch"`. `segmented` is a radio group drawn as joined
  buttons, for two to five options.
- Select, radio and segmented values keep their type: numeric options write numbers.

### Numbers

```ts
volume: { label: "Volume", type: "range", min: 0, max: 100, step: 5, suffix: "%" },
budget: { label: "Budget", type: "currency", currency: "INR", min: 0 },
stars: { label: "Your rating", type: "rating", required: true },
```

- `range` shows its value next to the slider, with `prefix` and `suffix`; screen readers hear
  the same text.
- `currency` shows the amount for the active locale ("₹1,234.50") once the field is left,
  while the model holds a number. Without `currency`, it is an amount with two decimals.
- `rating` is a radio group of stars. `max` sets the number of stars (default 5), `0` means
  not rated, and `required` needs at least one star. Clicking the chosen star again clears it
  unless the field is required.

### Dates and times

```ts
meeting: { label: "Meeting", type: "time", min: "09:00", max: "18:00", step: 900 },
slot: { label: "Appointment", type: "datetime-local" },
start: { label: "Start month", type: "month" },
sprint: { label: "Sprint", type: "week" },
stay: { label: "Stay", type: "daterange", min: "2026-01-01", fromLabel: "Check in", toLabel: "Check out" },
```

- `time`, `datetime-local`, `month` and `week` are native inputs that hold the input's own
  ISO format. `min` and `max` use that format too, and messages show them for the locale
  ("Meeting must be on or after 9:00 AM").
- `daterange` edits `{ from, to }` (dates or ISO strings) with two labelled date inputs, each
  limited by the other. It reports an end before the start, a missing end and the bounds;
  `required` needs both dates.

### Contact and identity

```ts
phone: { label: "Mobile", type: "phone", country: "IN", countries: ["IN", "US", "GB"] },
code: { label: "Verification code", type: "otp", length: 6 },
website: { label: "Website", type: "url" },
query: { label: "Search", type: "search" },
brand: { label: "Brand color", type: "color" },
skills: { label: "Skills", type: "tags", max: 5, maxLength: 24 },
```

- `phone` stores E.164, such as `+919876543210`. Typing or pasting a number that starts with
  `+` or `00` picks its country, and a leading trunk `0` is dropped. Country names come from
  `Intl.DisplayNames` in the form's language. The length check covers common countries; use
  libphonenumber-js in `validate` for complete rules.
- `otp` draws a box per character over one input with `autocomplete="one-time-code"`, so
  codes from SMS autofill, and a pasted "123-456" fills every box. `characters:
  "alphanumeric"` allows letters.
- `url` needs a full http or https address and adds `https://` to a bare domain when the
  field is left.
- `tags` edits a `string[]`. Enter or a separator (`separators`, default `[","]`) adds a tag,
  pasted lists are split, Backspace removes the last tag, and duplicates are refused. `max`
  limits the count and `maxLength` each tag.

### Consent and captcha

```ts
terms: { label: "I accept the terms", type: "consent", required: true, policy: { href: "/terms", label: "Read the terms" } },
human: { type: "captcha" },

// app.config.ts
providers: [provideNguCaptcha(nguTurnstile({ siteKey: "0x4AAAA..." }))]
```

- `consent` holds the time of acceptance (`Date | null`), so the record shows when it was
  given. The policy link opens in a new tab and says so to screen readers.
- `captcha` places a provider's widget in the form. Its token is the value: required by
  default, never saved in drafts or `changes()`, and reset after every submit that reached
  the action, because tokens are single use. A widget that fails to load blocks the submit
  with a message.
- `nguTurnstile`, `nguHCaptcha` and `nguRecaptcha` load the provider's script on first use.
  Any other provider fits `NguCaptchaAdapter`:

```ts
const myCaptcha: NguCaptchaAdapter = {
  render(host, events, { language }) {
    const id = provider.render(host, { onSuccess: events.token, onExpire: events.expired, onError: events.error });
    return { reset: () => provider.reset(id), remove: () => provider.remove(id) };
  },
};
```

### Loaded on first use

The phone, tags, date range, rating, one-time code, captcha, slider and color inputs are
`@defer` blocks, so their code downloads only when a form shows one. A placeholder of the
input's height shows for that moment, and on the server.

## Files, images and signatures

`ngu-form/upload` is a separate entry point, so apps without uploads do not ship it.
Importing it also teaches TypeScript the `file`, `image` and `signature` types.

```ts
import { provideNguUpload } from "ngu-form/upload";

// providers: [provideNguUpload()]
documents: {
  label: "Documents",
  type: "file",
  accept: ".pdf,image/*",
  maxSize: 5_000_000,
  max: 4,
  upload: (file, { progress, signal }) => api.upload(file, progress, signal), // returns { name, url?, id? }
},
avatar: { label: "Photo", type: "image", crop: { aspect: 1 }, maxWidth: 512, maxHeight: 512 },
signature: { label: "Signature", type: "signature", required: true },
```

- `file` takes `File[]`, or `File | null` for one file. Files can be chosen or dropped; each
  row shows the name, the size, a thumbnail for images, and Remove. A file of another type or
  over `maxSize` is refused with a message and blocks the submit until it is removed. `min`
  and `max` count files.
- With `upload`, each file uploads as soon as it is chosen and shows its progress. The value
  then holds what `upload` returned. A submit waits for running uploads; a failed upload
  offers Retry and blocks the submit. Removing a file, or resetting the form, aborts its
  upload through `signal`.
- `image` takes images only and opens a crop dialog first (`crop: { aspect }`, or
  `crop: false`). People drag the image or use the zoom and position sliders, so cropping
  works by keyboard; Escape cancels. `maxWidth`, `maxHeight`, `output` (`"image/jpeg"`,
  `"image/png"` or `"image/webp"`) and `quality` shape the result.
- `signature` stores a PNG data URL, or `""`. "Type instead" draws the typed name in a
  handwriting font, so it can be signed without a pointer.
- `File` values are never saved in drafts; uploaded file records are.

## Custom and async validation

```ts
account: {
  fields: {
    username: {
      label: "Username",
      required: true,
      debounce: 300,
      validateAsync: (value, model, scope, abort) => api.checkUsername(value, abort),
    },
    password: { label: "Password", type: "password", minLength: 8 },
    confirm: {
      label: "Confirm password",
      type: "password",
      validate: (value, model) => (value === model.account.password ? undefined : "Passwords do not match"),
    },
  },
},
items: {
  newItem: { sku: "", qty: 1 },
  validate: (items) => (new Set(items.map((i) => i.sku)).size === items.length ? undefined : "SKUs must be unique"),
  item: { sku: "SKU", qty: { validate: (qty, model, item) => (qty > 5 && item.sku === "A" ? "At most 5" : undefined) } },
},
```

- **`validate`** takes one function or a list. Return a message string, an error object
  `{ kind, message }`, or nothing when valid. It receives the value, the whole model and,
  inside an array, the current item. It re-runs whenever anything it reads changes, so
  cross-field rules like confirm password just work.
- **Groups and arrays take `validate` too.** Their message shows under the group or list.
- **`validateAsync`** returns a promise. It only runs once the sync rules pass, shows
  "Checking…" (or `pendingText`) while it runs, and the previous call is aborted through the
  `AbortSignal` when the value changes. It re-runs on changes to its own value only; reads
  of `model` and `scope` are not tracked, to avoid server calls on every keystroke elsewhere.
- **`debounce`** delays typing from reaching the model, which also throttles the async check.
- **Submit waits for pending checks.** The button is disabled until they settle, and the
  form submits only when everything is valid. `def.tree().pending()` tells you if any run.

## Schemas, warnings and password strength

Already describe your data with Zod, Valibot or ArkType? Pass the schema. Any
[Standard Schema](https://standardschema.dev) works, sync or async.

```ts
import { z } from "zod";

const schema = z.object({
  email: z.email("Enter a real email"),
  age: z.number().min(18, "Adults only"),
  address: z.object({ city: z.string().min(1, "Which city?") }),
});

readonly signup = defineForm(
  { email: "", age: 0, address: { city: "" } },
  { email: "Email", age: "Age", address: { city: "City" } },
  { schema },
);
```

- Each issue shows on the field at its path, including array items (`tags.0`). Issues
  without a field, such as an object-level `refine`, show as a form-level error.
- Schema rules run alongside the spec's rules; use either or both. The schema is typed
  loosely on purpose: schema input types often differ from the model (`.default()`,
  `.nullable()`, coercion), and a strict check would reject valid schemas.

**Warnings** are advice that never blocks a submit:

```ts
email: {
  label: "Email",
  type: "email",
  warn: (value) => (value.endsWith("@gmial.com") ? "Did you mean gmail.com?" : undefined),
},
```

`warn` takes the same arguments as `validate`. A warning shows when an error would, in its
own style with an icon and a hidden "Warning:" prefix, and gives way to errors.

**Password strength** adds a meter, a checklist and a text value to `type: "password"`:

```ts
password: { label: "Password", type: "password", minLength: 10, strength: { min: 2 } },
```

- The default score (0 to 4) counts length (`minLength` or 8), mixed case, a digit and a
  symbol. A too-short password scores at most 1; 1.5× and 2× the length add a point each,
  so long passphrases score well without symbols. Scripts without case count as mixed.
- `min` makes weaker passwords an error (`weakPassword`). Without it the meter only advises.
- `rules: [{ label, test }]` replaces the checklist; `score: (value) => 0..4` plugs in a
  library such as zxcvbn.

**Validation timing per field.** `errorsOn: "touched" | "dirty" | "submit"` on a field
overrides the form's `errorsOn` for that field.

## Masks, parse and format, numbers and dates

The text in the input and the value in the model can differ.

```ts
readonly contact = defineForm(
  { phone: "", name: "", income: 0, born: null as Date | null },
  {
    phone: { label: "Phone", mask: "(000) 000-0000" }, // model: "5551234567"
    name: { label: "Name", parse: (text) => text.trim() },
    income: { label: "Income", prefix: "₹", localized: true }, // "12,50,000" in hi-IN
    born: { label: "Born", type: "date", max: new Date() },
  },
);
```

- **`mask`**: `0` is a digit, `a` a letter, `*` either; anything else is shown as written.
  It formats while typing, keeps the caret in place, and stores only the typed characters.
  A partly filled mask is an error with kind `mask`. Backspace or Delete next to a literal
  removes the neighbouring character. Leading literals (`+1 (`, `8 (`) are typed for the
  user. Masked inputs stay left to right in right-to-left forms, and get a numeric keyboard
  when the mask is all digits.
- **`parse` and `format`** convert between text and value, through Angular's
  `transformedValue`. While the field has focus your text is kept as typed; on blur it shows
  `format(value)`. Throw an `Error` from `parse` to reject the text: its message is shown,
  the submit is refused and the model keeps its last good value.
- **`localized`** (`true` or `Intl.NumberFormat` options) shows numbers with the active
  locale's digits and separators: `1,234.5` in `en`, `1.234,5` in `de`, `12,34,567` in
  `hi`, `١٬٢٣٤٫٥` in `ar-EG`. Typing accepts the locale's separators, a `.` decimal from a
  Latin keyboard, currency or percent signs, a leading `+` and accounting parentheses. The
  value is rounded to the fraction digits the format shows, so the model matches the screen.
- **Digits from any script** (Arabic-Indic, Devanagari, full-width and others) are read as
  ASCII digits in masks and numbers.
- **`Date` values** become date inputs. Values are midnight UTC, as date inputs produce
  them. When the value can be `null`, `type: "date"` is required (TypeScript asks for it).
  `min` and `max` take a `Date` or an ISO string, set the input's `min`/`max`, and show
  messages with the date formatted for the locale. A `Date` with a time of day, such as
  `max: new Date()`, counts as that calendar day in the user's time zone. ISO string models
  keep working.

The date picker itself is the browser's and follows the browser's language.

## Dependent and derived values

```ts
readonly checkout = defineForm<Checkout>(initial, {
  country: { label: "Country", type: "select", options: COUNTRIES },
  state: {
    label: "State",
    type: "select",
    options: (m) => REGIONS[m.country] ?? [],
    required: (m) => (REGIONS[m.country]?.length ?? 0) > 0 && "Choose a state",
  },
  items: {
    newItem: { product: "", qty: 1, price: 0, amount: 0 },
    item: {
      product: {
        type: "select",
        options: PRODUCTS,
        onChange: (product, { patchItem }) => patchItem({ price: PRICES[product] }),
      },
      qty: "Qty",
      price: { label: "Price", prefix: "₹" },
      amount: { label: "Amount", compute: (_, item) => item.qty * item.price },
    },
  },
  sameAsBilling: {
    label: "Ship to the billing address",
    onChange: (same, { model, patch }) => same && patch({ shipping: { ...model.billing } }),
  },
  billing: { city: "City", zip: "ZIP" },
  shipping: { city: "City", zip: "ZIP" },
  total: { label: "Total", compute: (m) => m.items.reduce((s, i) => s + i.qty * i.price, 0) },
});
```

- **`options` as a function** of the model (and, in arrays, the item) makes cascading
  selects. When the list stops offering the current value, the value is cleared to `''`
  (or `null` for non-string values). A value that was never in the list, such as data loaded
  before its options, is left alone.
- **`compute`** derives a value. The field is read-only, updates live, and its value is part
  of the model and the submitted value. Computed values are filled before the form starts,
  so `def.initial` already has them.
- **`required` as a function** makes a field required while it returns `true` or a message
  string. The asterisk and the native `required` attribute follow it.
- **`onChange(value, ctx)`** runs after the user changes the field. `ctx` has `previous`,
  `model`, `scope` (the array item), `patch(partial)` for the model and `patchItem(partial)`
  for the current array item. Changes made in code, including the writes of another
  `onChange`, `patch`, `reset` and `compute`, never trigger it, so hooks cannot loop.
  Custom renderers count as user input when they react to a click, change or input event
  inside the field.

## Run-time fields

For fields that are only known at run time, such as survey questions from an API, type
the property as a record and give it a `fields` list. Plain array or signal both work.

```ts
readonly questions = httpResource<DynamicField[]>(() => '/api/survey/questions');

readonly survey = defineForm({ respondent: "", answers: {} as Record<string, string | number | boolean> }, {
  respondent: { label: "Your name", required: true },
  answers: { title: "Questions", cols: 2, fields: computed(() => this.questions.value() ?? []) },
});
```

A field definition is plain JSON:

```json
{ "key": "blocker", "label": "What is stopping you?", "type": "textarea", "required": true,
  "showIf": { "key": "signals", "equals": "no" } }
```

- **Supported**: every built-in and custom `type`, `options`, `default`, `required`,
  `minLength`, `maxLength`, `min`, `max`, `pattern`, `disabled`, `readonly`, `span`, `hint`,
  `prefix`, `suffix`, `counter`, `reveal`, `rows`, `maxRows`, `inputmode`, `enterkeyhint`,
  plus `validate` and `hidden` functions when you build the list in code. A string `pattern`
  must match the whole value.
- **New types** from the catalogue take their options in JSON too: `multiple`, `currency`,
  `length`, `characters`, `countries`, `country`, `policy`, `separators`, `fromLabel` and
  `toLabel`. A `checkbox` with `options`, a `tags` field or an array `default` holds a list.
- **`showIf`** shows a field only when a sibling `equals`, `notEquals` or is `in` a list of
  values. Hidden fields keep their value and are not validated.
- **The model follows the list.** A new field gets its `default`, or `''`, `0`, `false`,
  `[]` or `null` by type. A field that leaves the list loses its value unless you set `keepRemoved: true`.
- **Rules follow the list too.** One rule set covers every key, present or future, and looks
  up each key's current definition, so validation changes the moment the list does.
- **Async checks** work as on static fields: `validateAsync`, `debounce` and `pendingText`,
  plus `mask` and `errorsOn`, when you build the list in code.
- Overrides work by key: `nguField="answers.blocker"`.
- Not supported yet: run-time fields inside array items.

## Submitting, server errors, reset and patch

```html
<ngu-form [form]="signup" [action]="register" submitLabel="Create account" (submitted)="done($event)" />
```

```ts
register: SubmitAction<Signup> = async (value) => {
  const res = await api.register(value);
  if (res.emailTaken) {
    return { "account.email": "Already registered" } satisfies SubmitErrors<Signup>;
  }
  if (!res.ok) {
    return "The server is busy. Please try again.";   // form-level message
  }
};
```

- **`action`** runs only for a valid form, after pending async checks settle. While it runs
  the submit button is disabled and the form is `aria-busy`. It receives the payload: the
  model, unless `omitHidden` or `mapValue` is set.
- **Return nothing on success.** `(submitted)` then emits the payload, and the form counts as
  saved: it is no longer dirty and `changes()` starts again from the submitted value.
- **Return errors by field path** to show them on the fields. Array items use their index:
  `"items.0.sku"`. Each message clears as soon as its field changes. A string, or the
  `$form` key, shows a form-level message above the submit button.
- **Paths are typed** through `SubmitErrors<T>`. Add `satisfies SubmitErrors<T>` to the
  returned object so a mistyped path is a compile error; TypeScript does not check excess
  keys on function return values by itself. An unknown path at run time falls back to a
  form-level message and logs a warning in dev mode.
- **A thrown error** is passed to Angular's `ErrorHandler` and shows `failureText`.
- **`(invalidSubmit)`** emits when a submit is refused, by validation or by the action.
- **`def.reset()`** restores the initial value, or `def.reset(value)` a new one. It clears
  touched, dirty, server errors and the submitted state, so no messages remain.
- **`def.patch(partial)`** deep-merges values, for example data loaded from an API.
  Arrays are replaced as a whole and fields are not marked dirty.
- Values emitted for arrays carry a symbol key Angular uses for item identity. It is
  ignored by `JSON.stringify` and `Object.keys`, but strict deep-equality checks in tests
  will see it.

## Shaping the submitted value

```ts
readonly signup = defineForm<Signup, SignupRequest>(initial, spec, {
  omitHidden: true,
  mapValue: ({ account, ...rest }) => ({ ...rest, email: account.email, password: account.password }),
});

register: SubmitAction<Signup, SignupRequest> = async (request) => { /* ... */ };
```

- **`omitHidden: true`** leaves the values of hidden fields (and hidden groups, list rows'
  hidden fields, run-time fields hidden by `showIf`) out of what is submitted. Off by default.
  Declare such properties optional in the model (`company?: string`) if you want the type
  to say so.
- **`mapValue`** turns the model into the request body. It runs after `omitHidden`.
  `(submitted)` and the action receive its result; server errors still use model paths.
- **`def.payload()`** is the same value as a signal, handy for previews and debugging.
- With explicit type arguments, pass both: `defineForm<Signup, SignupRequest>(...)`.
  TypeScript cannot infer one type argument and take the other.

## Form state, changes and unsaved changes

```ts
form.dirty();       // the user changed something since the last load, reset or save
form.touched();
form.valid();       // every visible field valid and no async check running
form.pending();     // an async check is running
form.submitting();  // <ngu-form> is waiting for checks or running the action
form.changes();     // { address: { city: "Pune" } } – only what differs from the saved state
```

- **`changes()`** compares the model with the last saved state: the initial value, a value
  given to `reset(value)` or `patch(partial)`, or the last successful submit. Groups are
  compared field by field; arrays and custom-type values are included whole. A field typed
  in and changed back is not a change. Use it for `PATCH` requests.
- **Router guard.** Add `nguUnsavedChangesGuard` to a route. It finds every `defineForm`
  result on the routed component and asks before leaving if one is dirty and has changes.

  ```ts
  { path: "profile", component: ProfilePage, canDeactivate: [nguUnsavedChangesGuard] }
  ```

  Replace the browser's `confirm` with your own dialog through
  `provideNguFormConfig({ confirmLeave: () => dialog.ask("Discard changes?") })`.
- **Closing the tab.** `<ngu-form [warnOnUnload]="true">` asks the browser to confirm before
  the tab is closed or reloaded while there are unsaved changes. The listener is only
  attached while needed, so the page stays eligible for the back/forward cache.

## Loading, drafts and undo

```ts
readonly user = httpResource<Profile>(() => `/api/profile/${this.id()}`);

readonly profile = defineForm<Profile>(EMPTY, spec, {
  load: this.user,                     // placeholders until the record arrives
  draft: { key: `profile:${this.id()}` }, // unsent edits survive a reload
  history: true,                       // undo and redo
});
```

- **`load`** takes any `{ value, isLoading, error?, status? }`, such as a `resource` or
  `httpResource`. An `'idle'` status (no request, as in a create form) shows the form at once. Fields show placeholders and the submit is held while it loads; each value
  it delivers resets the form to it, so `reset()` returns to the loaded record. If loading
  fails, the form shows a message instead of empty fields that could overwrite the record.
  `def.loading()` and `def.loadError()` expose the state.
- **`draft`** saves after a pause in typing (`debounce`, default 800 ms) and when the tab is
  hidden, to `localStorage` by default. Use `storage: "session"`, `nguIndexedDbDrafts()`, or
  your own `{ load, save, remove }` (promises allowed) for a server. A restored draft shows a
  notice with a Discard button. A successful submit, `reset()` or `def.draft.discard()`
  removes it. Password fields are never stored; set `persist: false` on any other field to
  keep it out. Dates survive the round trip, and a draft from an older form version is
  fitted to the current shape.
- **`history`** records changes; typing in one field is one step until a pause. Use
  `def.history.undo()`, `redo()`, `canUndo()` and `canRedo()` for buttons. Inside the form,
  Ctrl+Z / ⌘Z undoes and Ctrl+Shift+Z / ⌘⇧Z / Ctrl+Y redoes; when there is nothing to undo the
  browser keeps the shortcut. Undo announces itself and moves focus to the field it changed.

## Messages and translation

Every text ngu-form renders comes from a message catalog. Reword or translate it with
`provideNguMessages`:

```ts
provideNguMessages({
  required: "{label} is mandatory",
  minItems: "{label} needs {min, plural, one {# entry} other {# entries}}",
  add: "Add another",
}),
```

Messages are ICU-style templates: `{name}` inserts a parameter (numbers and dates are
formatted for the locale), `{n, plural, ...}` picks a form with `Intl.PluralRules` (`zero`,
`one`, `two`, `few`, `many`, `other`, `=0`), and `{v, select, ...}` picks by value. A
function `(params) => string` works too. See `NGU_DEFAULT_MESSAGES` for every key.

To plug in an i18n library, give it a `translate` function. It resolves your labels, hints,
placeholders, titles, option labels and validator messages, and built-in messages as
`ngu.<key>` with their parameters. Return `undefined` or the key itself to keep the original.
A factory can return a signal, so a language switch re-renders every form:

```ts
provideNguMessages(() => {
  const transloco = inject(TranslocoService);
  const lang = toSignal(transloco.langChanges$, { initialValue: transloco.getActiveLang() });
  return computed(() => ({ locale: lang(), translate: (key, params) => transloco.translate(key, params) }));
}),
```

`locale` sets plural rules and number and date formats; it defaults to `LOCALE_ID`, and an
unusable value such as `en_US` is corrected rather than thrown. Provide it at the app level,
a lazy route or a component; inner providers add to outer ones key by key, so a component's
`{ required }` keeps the app's `translate`. With `@angular/localize`,
write `$localize` strings in specs and messages as usual.

**Right to left.** Components use logical CSS properties throughout, so `dir="rtl"` on any
ancestor mirrors the layout. The demo has a complete Hindi and Arabic catalog
(`examples/languages/translations.ts`) to copy.

## Overriding a field

Two template slots cover the cases the generated markup does not:

```html
<ngu-form [form]="signup">
  <!-- replace the whole field: label, control and messages -->
  <ng-template nguField="account.email" let-field let-def="def" let-message="message">
    <my-input [formField]="field" [label]="def.label" [error]="message" />
  </ng-template>

  <!-- replace only the control; the library keeps label, hint and errors -->
  <ng-template nguControl="profile.bio" let-field let-id="id">
    <textarea [id]="id" [formField]="field" rows="3"></textarea>
  </ng-template>
</ngu-form>
```

Import `NguFieldTemplate` or `NguControlTemplate` next to `NguForm`. Paths are dot
separated; array items use `[]`, as in `items[].sku`. The template context has `field`
(also `$implicit`), `def`, `state`, `id`, `message` and `showErrors`.

## Custom field types

Register a component per `type` name, declare which value type it edits, and, if it has
options of its own, declare those too:

```ts
declare module "ngu-form" {
  interface NguFieldTypeMap { mood: number }
  interface NguFieldOptionsMap { mood: { faces?: readonly string[] } }
}

@Component({ template: `...` })
export class MoodPicker {
  readonly field = input.required<Field<number>>();
  readonly id = input<string>();        // optional: the control's id; the label is id + "-label"
  readonly def = input<LeafDef>();      // optional: the spec, with its own options
  readonly invalid = input<boolean>();  // optional: true while an error shows
  readonly describedBy = input<string>(); // optional: ids of the hint or error
}

// in the component or app providers
provideNguFieldTypes({ mood: MoodPicker })
```

```ts
mood: { label: "Mood", type: "mood", faces: ["😞", "🙂", "😄"], min: 1 }
```

The renderer receives only the inputs it declares. It binds the field itself, with
`[formField]` or by writing to `field().value`. Thanks to the type maps, `type: "mood"` is
accepted on `number` properties only, with the number rules (`min`, `max`) and its own
`faces` option; any other option is a compile error. Object and array properties can also
take a custom type. A custom type registered under a built-in name, such as `rating`,
replaces the built-in renderer.

## Rich text (recipe)

ngu-form does not bundle an editor. Any editor becomes a custom type; this one uses Tiptap 3.

```ts
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

declare module "ngu-form" {
  interface NguFieldTypeMap { richText: string }
}

@Component({ selector: "app-rich-text", template: `<div #host class="editor"></div>` })
export class RichText {
  readonly field = input.required<Field<string>>();
  readonly id = input<string>();
  readonly invalid = input(false);
  readonly describedBy = input<string>();
  private readonly host = viewChild.required<ElementRef<HTMLElement>>("host");
  private editor?: Editor;

  constructor() {
    afterNextRender(() => {
      const state = this.field()();
      this.editor = new Editor({
        element: this.host().nativeElement,
        extensions: [StarterKit],
        content: state.value(),
        editorProps: { attributes: this.attributes() },
        onUpdate: ({ editor }) => {
          state.value.set(editor.isEmpty ? "" : editor.getHTML());
          state.markAsDirty();
        },
        onBlur: () => state.markAsTouched(),
      });
    });
    // Values written by code (reset, patch, loaded data) replace the content.
    effect(() => {
      const html = this.field()().value();
      if (this.editor && html !== (this.editor.isEmpty ? "" : this.editor.getHTML())) {
        this.editor.commands.setContent(html, { emitUpdate: false });
      }
    });
    // Keep the error state and description in step with the field.
    effect(() => {
      const attributes = this.attributes(); // read first, so the effect tracks the inputs
      this.editor?.setOptions({ editorProps: { attributes } });
    });
    inject(DestroyRef).onDestroy(() => this.editor?.destroy());
  }

  private attributes(): Record<string, string> {
    return {
      id: this.id() ?? "",
      role: "textbox",
      "aria-multiline": "true",
      "aria-labelledby": `${this.id()}-label`,
      "aria-describedby": this.describedBy() ?? "",
      "aria-invalid": String(this.invalid()),
    };
  }
}

// providers: [provideNguFieldTypes({ richText: RichText })]
body: { label: "Body", type: "richText", required: true },
```

- The field's label has the id `<id>-label`, for editors that are not form controls.
- Store HTML, Markdown or JSON, whatever `onUpdate` writes. Sanitize HTML on the server
  before showing it to anyone else.

## Accessibility

The generated markup is checked with axe-core (WCAG 2.1 A and AA plus best practices) and
keyboard-tested in Chrome.

- **Labels and descriptions.** Every control has a `<label>`; hints and errors are linked
  with `aria-describedby`. Required fields carry the native `required` attribute (set by
  Angular), so the visual asterisk is hidden from screen readers.
- **`aria-invalid`** is set only while a field shows its error, so untouched fields stay
  neutral.
- **Refused submit.** Focus moves to the first problem in page order (field, list or group
  message, or the form-level message) and a polite live region says how many fields need
  attention. Field errors are not `role="alert"`, which would fire one alert per field at
  once. Turn focusing off with `[focusOnInvalid]="false"`; translate the announcement with
  `[invalidAnnouncement]="(n) => ..."`.
- **Busy submit.** The button uses `aria-disabled` while a submit runs, so keyboard focus
  stays on it; repeat submits are ignored.
- **Structure.** Groups and lists with a `title` are `role="group"` named by their heading.
  Radio fields are a named `radiogroup`. Array rows form a list.
- **Arrays.** "Add" moves focus into the new row; "Remove" moves it to the row that took
  the removed one's place, or to the add button.
- **Custom renderers and templates** receive `invalid` and `describedBy` (template context
  and optional inputs) to wire the same attributes on their own controls.
- **Show password** has a name that matches its visible text ("Show password", "Hide
  password"), points at the input with `aria-controls`, and announces the new state.
- **Counters and adornments** are part of the field description, so screen readers read
  "₹", "kg" or "188 characters remaining" with the field instead of as loose text.
- **Error summary.** `<ngu-form errorSummary>` lists every problem at the top after a
  refused submit, each linking to its field, and moves focus there (the GOV.UK pattern).
  Fixed problems drop out of the list. Without it, focus moves to the first problem.
- **Warnings** carry an icon and a hidden "Warning:" prefix, so they never rely on color,
  and are linked like hints. They do not set `aria-invalid`.
- **Password strength.** The meter bar is decorative; its text value ("Password strength:
  Good") is linked to the input and announced politely when the level changes. Each
  checklist item says "done" or "not yet" to screen readers.
- **Loading** sets `aria-busy` on the form and announces "Loading…" once. The restored-draft
  notice is a status message.
- **Undo and redo** are announced and move focus to the field that changed.
- **High contrast.** In forced-colors mode (Windows high contrast), invalid borders get
  thicker, and the meter, focus rings and buttons use system colors.
- Errors that appear on blur, before any submit, are shown and linked but not announced.
  Screen-reader users hear them when they return to the field.
- **Choices.** Checkbox groups, radios, segmented controls and ratings are native inputs in a
  `fieldset` named by its legend; radios, segments and stars form a `radiogroup`, so arrow
  keys work. Checkbox groups mark each checkbox invalid, since groups take no
  `aria-invalid`. Multiple selects explain Ctrl or ⌘ on devices with a mouse.
- **Composite inputs.** Date ranges label both inputs. The phone country picker is named
  "Country code". One-time codes are a single text field under the boxes. Tags announce
  each addition, removal and refused duplicate, and every tag has a named remove button.
- **Switches** have `role="switch"`; sliders read their value with its unit
  (`aria-valuetext`).
- **Consent** policy links say they open in a new tab. Captchas sit in a named group.
- **Uploads.** The file input is labelled by the field and by its "Choose files" button.
  Additions, removals and failed uploads are announced, and removing a file returns focus
  to the file button. The crop dialog is a native modal `<dialog>` with sliders for zoom
  and position. Signatures offer "Type instead", so no pointer is needed.

## Theming

Components use CSS custom properties. Set them on `ngu-form` or any ancestor:

```css
ngu-form {
  --ngu-gap: 1.25rem;
  --ngu-radius: 0.5rem;
  --ngu-border-color: #d0d0d0;
  --ngu-primary: #0b57d0;
  --ngu-error-color: #b3261e;
  --ngu-readonly-bg: #f3f3f3;   /* computed and read-only inputs */
  --ngu-warning-color: #8a5300; /* warning text, icon and border */
  --ngu-success-color: #1e7a3c; /* met password rules, strong meter */
  --ngu-skeleton-color: #eee;   /* loading placeholders */
  --ngu-notice-bg: #f5f5f5;     /* "draft restored" notice */
  --ngu-surface: #fff;          /* the crop dialog */
  --ngu-on-primary: #fff;       /* text on the submit button and chosen segments */
  --ngu-rating-color: #b25f00;  /* filled stars */
  --ngu-switch-off: #767676;    /* a switch that is off */
  --ngu-tag-bg: #eee;           /* tags */
  --ngu-drop-bg: #e8f0fe;       /* a file drop zone while dragging */
}
```

## Roadmap

The full plan, with a checklist per release, lives in `ROADMAP.md` at the repository root.

## License

MIT
