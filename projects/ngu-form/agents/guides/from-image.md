# Build a form from a screenshot

> Turn a screenshot, photo, mockup or design export of a form into an ngu-form component, then render it and compare it with the image before calling it done.

Work in this order. Skipping the inventory is the most common reason a result misses fields or gets the layout wrong.

## 1. Take an inventory of the image

Before writing code, list every element from top to bottom, left to right:

- **Each field**: its label exactly as written, the kind of control, the value it holds, a required marker (`*`), placeholder text inside the control, help text under it, anything before or after the value (an icon, `$`, `@`, `.com`), a value already filled in or selected, and which row and column it sits in.
- **Structure**: the page or card title, section headings and their fields, step indicators, tabs, collapsible panels, repeated rows with Add or Remove buttons, dividers, paragraphs of text.
- **Buttons**: every label, which one is primary, and where they sit (left, right, full width).
- **Look**: the primary color (button, focus, checked controls), corner radius, input height and padding, label above or beside the control, spacing, font size, light or dark.

Text you cannot read, and choices hidden inside a closed select, are unknowns: make a sensible choice and list it in your final message.

## 2. Map what you see to the spec

| In the image | Model value | Spec |
| --- | --- | --- |
| One-line box | `string` | default text; `type: 'email'` / `'url'` / `'tel'` / `'search'` from the label or icon |
| Box with dots or an eye icon | `string` | `type: 'password'` (show/hide is built in); a meter below it: `strength: true` |
| Multi-line box | `string` | `type: 'textarea'`; a `0/280` counter: `maxLength: 280` |
| Number box, spinner | `number` | default number; start at `0`, or `NaN` when the box is empty |
| Amount with a currency sign | `number` | `type: 'currency'`, or `prefix: '$'` on a number |
| Slider | `number` | `type: 'range'` with `min`, `max` |
| Stars | `number` | `type: 'rating'`, `max` = number of stars |
| Single checkbox with a sentence | `boolean` | default checkbox; the sentence is the label |
| Toggle switch | `boolean` | `type: 'switch'` |
| "I agree to the terms" that must be ticked | `Date \| null` | `type: 'consent'`; see [Consent](/consent) |
| Round radio buttons | union or `string` | `type: 'radio'`, `options` |
| Joined buttons, one highlighted | union or `string` | `type: 'segmented'`, `options` |
| Box with a chevron | union, `string` or `number` | `type: 'select'`, `options`, `placeholder` for "Select…" |
| Search-as-you-type select backed by an API | key type | `type: 'dropdown'`; see [Server dropdown](/dropdown) |
| Several checkboxes under one label | `string[]` | `type: 'checkbox'`, `options` |
| Chips with × in one box | `string[]` | `type: 'tags'` (free text) or `type: 'select'` (from a list) |
| Date with a calendar icon | `Date \| null` or `string` | `type: 'date'` |
| From and to dates | `{ from, to }` | `type: 'daterange'` |
| Time, month, week | `string` | `type: 'time'` / `'month'` / `'week'` |
| Phone with a country code or flag | `string` | `type: 'phone'` |
| Card number, PAN, other patterns | `string` | `mask: '0000 0000 0000 0000'` (`0` digit, `a` letter); see [Masks](/masks) |
| Expiry `MM/YY` | `string` | `mask: '00/00'`, `placeholder: 'MM/YY'` |
| Row of single-digit boxes | `string` | `type: 'otp'` with `length` |
| Drop zone, "Choose files" | `File[]` / `File \| null` | `type: 'file'` (`ngu-form/upload`) |
| Avatar or photo picker | `File \| null` | `type: 'image'` (`ngu-form/upload`) |
| Signature pad | `string` | `type: 'signature'` (`ngu-form/upload`) |
| Color swatch | `string` | `type: 'color'` |
| Icon inside a box | | `prefixIcon` / `suffixIcon` with `provideNguIcons`; see [Icons](/icons) |
| Text before or after the value | | `prefix: 'https://'`, `suffix: 'kg'` |
| Red `*` | | `required: true` |
| Grey text under the control | | `hint` |
| Grey text inside the control | | `placeholder` |
| Section heading with its fields | nested object | a group: `{ title: 'Address', cols: 2, fields: { … } }` |
| Heading or paragraph with no value | | `$intro: { heading: '…' }`, `$note: { text: '…' }`, `$hr: { divider: true }` |
| Two or three fields in one row | | `cols` on their group (or the defineForm options), `span` for wider fields; in a card narrower than 480px use `cols: { base: 2 }`, since a plain number collapses to one column there |
| Steps "1 Account · 2 Address · 3 Pay" | one object per step | `layout: 'steps'` in the defineForm options, a titled group per step; a summary step: `review: true` |
| Tabs | one object per tab | `layout: 'tabs'` |
| Collapsible sections | one object per section | `layout: 'accordion'`, or `collapsed` on a group |
| Repeated rows with "+ Add" | array of objects | a list: `{ item: { … }, newItem: { … }, addLabel: '+ Add' }`; see [Lists](/lists) |
| Rows under column headers | array of objects | the same list with `layout: 'table'` |
| Drag handles on rows | | `reorder: true` |
| Values shown as text, not inputs | | `<ngu-view>`; see [View mode](/view-mode) |

When a value can be one of a few fixed options, type it as a union (`'monthly' | 'yearly'`) and use those as option values.

Tabs and steps usually show only one panel. Build all of them anyway, with ngu-form's `layout` and a group per tab or step, never a hand-made tab bar or stepper around the form (those lose the keyboard support, the screen reader roles and the per-tab error counts). Give the panels you cannot see the fields their names suggest (Notifications: a few switches; Payment: card number, expiry, CVC) and list them as guesses.

## 3. Write the model, then the spec

1. An interface for the model, with camelCase keys named after the labels. Empty values: `''`, `NaN` or `0` for numbers, `false`, `null` for `Date | null` and `File | null`, `[]`.
2. Key order is render order. Write the keys in the image's reading order; use `order` only when the model must differ.
3. Copy text exactly: labels, placeholders, hints, option labels, headings and button labels. Do not reword or fix capitalization.
4. Rules come from what the image shows (an asterisk, "at least 8 characters", "optional") or what the user asked. Do not invent others.
5. Page chrome is not part of the spec. A logo, page title above the card, card border and background go in the component's own template and styles around `<ngu-form>`.

## 4. Buttons

- One main button: `submitLabel="…"` on `<ngu-form>`. Align it with `--ngu-actions-justify` (`flex-end` for right, `center`).
- A full-width main button: add a class with `[classes]="{ submit: 'full' }"` and style `.full { width: 100% }` in the global stylesheet (classes from the class map land inside ngu-form, out of reach of the component's own styles).
- Buttons beside the main one, such as Cancel or Save draft: leave out `submitLabel` and put your own row inside `<ngu-form>`. Content inside it renders after the fields, and a `type="submit"` button there submits the form with all of ngu-form's checks:

```html
<ngu-form [form]="form" (submitted)="save($event)">
  <div class="actions">
    <button type="button" (click)="cancel()">Cancel</button>
    <button type="submit">Save changes</button>
  </div>
</ngu-form>
```

  Those buttons are part of your template, so style them in the component's own styles to match the design (ngu-form's button styles do not reach them).
- A wizard (`layout: 'steps'`) has its own Back and Next; `submitLabel` labels the last step's button.

## 5. Match the look

1. Check what the app already uses before styling anything. With `@angular/material` or `primeng` in `package.json`, use that renderer ([Angular Material](/material), [PrimeNG](/primeng)); with Tailwind, use the preset ([Tailwind](/tailwind)). The image probably came from that design system.
2. Otherwise keep ngu-form's own styles and set its tokens on a class on `<ngu-form>`, in the component's styles. The ones that matter most for a design:

```css
.signup {
  --ngu-primary: #4f46e5;        /* button, checked controls, switches */
  --ngu-on-primary: #fff;        /* text on the button */
  --ngu-focus-color: #4f46e5;
  --ngu-radius: 0.5rem;          /* inputs and buttons */
  --ngu-border-color: #d1d5db;
  --ngu-input-bg: #fff;
  --ngu-input-padding: 0.625rem 0.875rem;
  --ngu-gap: 1.25rem;            /* between fields */
  --ngu-label-color: #374151;
  --ngu-label-size: 0.875rem;
  --ngu-actions-justify: flex-end;
}
```

3. ngu-form uses the page's font. Set `font-family` (and the page background) on the component host or the global styles to match the design.
4. `density="compact" | "spacious"` and `size="sm" | "lg"` on `<ngu-form>` cover most spacing and text-size differences in one step. Every token is listed in [Theming](/theming).
5. For details tokens do not reach, add classes through the class map and style them in the global stylesheet: `[classes]` on `<ngu-form>`, or `classes` on a group, list or field, with slots such as `label`, `control`, `title`, `button` (add and remove buttons), `submit`, `option` and `row` (all listed in [Tailwind](/tailwind)). A link-style "+ Add" button, for example, is `classes: { button: 'link-button' }` on the list.
6. Never style ngu-form's internal class names (`.ngu-…`, `::ng-deep`): they change between versions. When neither tokens nor slots reach a detail, leave ngu-form's look for it and list the difference in your report.

## 6. Render and compare

1. Show the component on a route (add one if needed) and make sure a dev server serves it. Reuse one that is already running.
2. Take a screenshot and list what rendered:

```bash
node node_modules/ngu-form/skills/ngu-form-from-image/scripts/snap.mjs http://localhost:4200/signup signup.png
```

It needs `playwright-core` in the project (`npm i -D playwright-core`) and uses the installed Chrome. It saves the screenshot, prints the browser console (ngu-form reports mistakes as `NGU-xxx`), and lists the fields row by row with their labels, types and required marks.

3. Open the screenshot you just took (read the PNG; the field list alone cannot show colors, sizes or spacing) and the original image, and compare them in this order: every field present, same order, same fields per row, same control kinds, same texts, same buttons, then colors, corners and spacing.
4. Fix and repeat, opening the new screenshot each round. Stop after three rounds and report what still differs.
5. Any console error or `NGU-` warning must be fixed first; see [Diagnostics](/diagnostics).

## 7. Report

Finish with a short list: the route, what matches, any differences and why (for example a widget ngu-form does not have, built as a [custom type](/custom-types)), and every guess you made about content the image did not show (option lists, rules, what submit does).
