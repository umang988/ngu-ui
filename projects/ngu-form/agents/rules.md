ngu-form builds Angular forms from a typed object. It is not ngx-formly and not reactive forms: no `FormGroup`, `FormControl`, `ngModel`, `fieldGroup`, `templateOptions` or `kind`. It runs on Angular Signal Forms (Angular 22.2+).

**The shape of every form**

```ts
import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

interface Signup { name: string; email: string; plan: 'free' | 'pro'; birthday: Date | null; news: boolean }

@Component({
  selector: 'app-signup',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Create account" (submitted)="save($event)" />`,
})
export class SignupPage {
  // A field initializer or the constructor: defineForm needs an injection context.
  readonly form = defineForm<Signup>(
    { name: '', email: '', plan: 'free', birthday: null, news: false },
    {
      name: { label: 'Full name', required: true },
      email: { label: 'Email', type: 'email', required: true },
      plan: { label: 'Plan', type: 'radio', options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
      birthday: { label: 'Birthday', type: 'date' },
      news: 'Send me product news', // a string is just the label
    },
    { cols: { base: 1, md: 2 } },
  );
  save(value: Signup) {}
}
```

**Rules**

1. The spec mirrors the model exactly: every key of the initial value needs an entry, and nothing else may appear (except `$` keys). Nested objects are groups; arrays of objects are lists with `item`.
2. `type` must suit the value's TypeScript type, or it does not compile:
   - `string`: `text` (default), `email`, `password`, `textarea`, `url`, `search`, `tel`, `color`, `date` (`YYYY-MM-DD`), `time`, `datetime-local`, `month`, `week`, `phone`, `otp`, `captcha`; `select`, `radio`, `segmented` with `options`
   - `number`: `number` (default), `currency`, `range` (slider), `rating`; `select`, `radio`, `segmented` with `options`. Never `null`: start at `0`, or `NaN` for an empty box (`required` treats it as empty).
   - `boolean`: `checkbox` (default) or `switch`
   - `Date | null`: `type: 'date'` (needed because `null` says nothing), or `consent`
   - `string[]` / `number[]`: `checkbox` (a group of boxes) or `select` (multiple), with `options`; `string[]` also `tags`
   - `{ from, to }`: `daterange`
   - From `ngu-form/upload` (import it and add `provideNguUpload()`): `file` and `image` on `File[]` or `File | null`, `signature` on a `string` (a data URL)
   - From `ngu-form/dropdown`: `dropdown`, a searchable select with server paging (needs `ngu-dropdown` and `provideNguDropdown()`)
3. Give the model an interface (`defineForm<Model>(...)`) whenever a value is a union, `null`, or an empty array; or write `[] as string[]` and `null as Date | null` inline. Option values must be assignable to the property type.
4. Options are `{ value, label }` objects. They can also be a signal or `(model) => options` for cascading selects.
5. `submitLabel`, `errorsOn`, `errorSummary`, `density`, `size` and `classes` are inputs on `<ngu-form>`, not spec options. Get the value from `(submitted)`, or use `[action]` for an async save that can return server errors.
6. Layout: `cols` (number or `{ base, sm, md, lg }`) on the defineForm options or on a group `{ title, cols, fields }`; `span` on a field. Breakpoints are measured on the form itself: a plain `cols: 2` falls back to one column while the form is narrower than 480px, so a narrow card that keeps two columns needs `cols: { base: 2 }`. Use `$name: { heading }`, `{ text }` or `{ divider: true }` for content without a value. `layout: 'steps' | 'tabs' | 'accordion'` in the defineForm options turns top-level groups into a wizard, tabs or panels.
7. Conditional UI is a function of the model: `hidden: (m) => !m.company`, `required: (m) => m.plan === 'pro'`. Inside list rows the second argument is the row.
8. Restyle with CSS custom properties (`--ngu-primary`, `--ngu-radius`, `--ngu-border-color`, ...) on `ngu-form` or an ancestor, never by targeting internal class names. Angular Material, PrimeNG and Tailwind have ready renderers and presets; see the design-system pages.
9. A widget ngu-form lacks becomes a custom type (`provideNguFieldTypes`) or an `nguControl` template override. Never build a parallel form with raw inputs next to `<ngu-form>`.
10. Never silence a spec type error with `as any`, `@ts-ignore` or a cast on the spec. The error means the `type` or an option does not fit the value: fix the model type or pick a valid `type` from rule 2.

**Before you say it's done**

1. Build: `npx ng build --configuration development` (or read the running `ng serve` output). Zero errors, zero warnings from your files.
2. Open the page with the dev build and read the browser console. ngu-form explains mistakes as `ngu-form [NGU-xxx]: ...` with a fix; see [Diagnostics](/diagnostics). Fix every one.
3. From a screenshot or mockup, follow [Build a form from a screenshot](/guides/from-image) and compare your render with the image before finishing.
