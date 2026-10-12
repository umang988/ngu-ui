import type { DocPage } from 'docs-kit/docs/model';

export const PAGES: Record<string, DocPage> = {
  'from-formly': {
    title: 'From ngx-formly',
    description:
      'Map formly field configs to ngu-form specs, by hand or with a codemod for the common cases.',
    sections: [
      {
        id: 'difference',
        title: 'The main difference',
        text: [
          'formly describes fields as a list with string keys and an untyped model. ngu-form describes the model itself: the spec has the same shape as the value, so a renamed property or a wrong type is a compile error, and logic functions receive the typed model.',
        ],
      },
      {
        id: 'codemod',
        title: 'The codemod',
        text: [
          '`ng g ngu-form:from-formly` reads the `FormlyFieldConfig[]` arrays in a file and writes `<file>.ngu-form.ts` next to it: a model interface, an initial value and a spec for each. Your file stays as it is. Expressions, custom validators and dynamic options become TODO comments.',
        ],
        code: [
          { code: 'ng g ngu-form:from-formly src/app/signup/signup.component.ts', lang: 'bash' },
          {
            filename: 'signup.component.ngu-form.ts',
            code: `import type { FormSpec } from 'ngu-form';

export interface SignupModel {
  email: string;
  age: number;
  address: {
    city: string;
  };
  role: 'a' | 'u';
  agree: boolean;
}

export const signupInitial: SignupModel = { email: '', age: 0, address: { city: '' }, role: 'a', agree: false };

export const signupSpec: FormSpec<SignupModel> = {
  email: { label: 'Email address', type: 'email', required: true },
  age: { label: 'Age', min: 18 },
  address: { title: 'Address', fields: { city: 'City' } },
  role: { label: 'Role', type: 'radio', options: [ ... ] },
  agree: 'Agree' /* TODO: hideExpression → hidden: (model) => ... */,
};`,
          },
        ],
      },
      {
        id: 'mapping',
        title: 'Mapping table',
        table: {
          caption: 'formly to ngu-form',
          columns: ['formly', 'ngu-form'],
          rows: [
            ["`key: 'email'`", 'The property `email` in the model and the spec'],
            ["`key: 'address.city'`", 'A nested object: `address: { city: ... }`'],
            ["`type: 'input'`", 'Inferred from the value: text, number or checkbox'],
            ["`props.type: 'email'` (and number, password...)", "`type: 'email'`"],
            ["`type: 'textarea' / 'checkbox' / 'radio' / 'select'`", 'The same `type`'],
            ["`type: 'multicheckbox'`", "`type: 'checkbox'` with `options` on a `string[]`"],
            [
              '`props.label`, `props.placeholder`, `props.description`',
              '`label`, `placeholder`, `hint`',
            ],
            [
              '`props.required`, `minLength`, `maxLength`, `min`, `max`, `pattern`',
              'The same rules',
            ],
            ['`props.options`', '`options` (a list, a signal, or a function of the model)'],
            ['`defaultValue`', 'The initial value'],
            ['`fieldGroup` with a key', 'A group: `{ title, fields }`'],
            [
              '`fieldGroup` without a key, `fieldGroupClassName`',
              '`cols` and `span` on the parent',
            ],
            ['`fieldArray`', 'A list: `{ item, newItem }`'],
            ['`hideExpression`', '`hidden: (model) => boolean`'],
            [
              '`expressions` / `expressionProperties`',
              '`hidden`, `disabled`, `readonly`, `required` or `compute`, as functions of the model',
            ],
            ['`validators`, `asyncValidators`', '`validate`, `validateAsync`'],
            [
              '`validation.messages`',
              'Return the message from `validate`, or `provideNguMessages`',
            ],
            ['`props.change`', '`onChange`'],
            [
              'Custom types and wrappers',
              '`provideNguFieldTypes`, `provideNguFieldRenderers`, `nguField` templates',
            ],
          ],
        },
      },
    ],
  },

  'from-reactive-forms': {
    title: 'From reactive forms',
    description: 'The same form written with `FormGroup` and with ngu-form, side by side.',
    sections: [
      {
        id: 'reactive',
        title: 'With reactive forms',
        text: [
          'The model, the controls, the validators, the template and the error messages are written separately and kept in step by hand.',
        ],
        code: [
          {
            filename: 'signup.ts',
            code: `form = new FormGroup({
  email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  plan: new FormControl<'free' | 'pro'>('free', { nonNullable: true }),
});`,
          },
          {
            lang: 'angular-html',
            filename: 'signup.html',
            code: `<form [formGroup]="form" (ngSubmit)="save()">
  <label for="email">Email</label>
  <input id="email" type="email" formControlName="email" [attr.aria-invalid]="form.controls.email.invalid && form.controls.email.touched" aria-describedby="email-error" />
  @if (form.controls.email.touched && form.controls.email.errors?.['required']) {
    <p id="email-error">Enter your email</p>
  }
  <!-- ...the same for every field... -->
  <button type="submit">Create account</button>
</form>`,
          },
        ],
      },
      {
        id: 'ngu-form',
        title: 'With ngu-form',
        text: [
          'One spec in the shape of the model. Labels, errors, `aria-*`, focus on the first problem and the submit button come with it.',
        ],
        code: [
          {
            filename: 'signup.ts',
            code: `readonly form = defineForm(
  { email: '', password: '', plan: 'free' as 'free' | 'pro' },
  {
    email: { label: 'Email', type: 'email', required: true },
    password: { label: 'Password', type: 'password', required: true, minLength: 8 },
    plan: { label: 'Plan', type: 'radio', options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
  },
);`,
          },
          {
            lang: 'angular-html',
            code: '<ngu-form [form]="form" submitLabel="Create account" (submitted)="save($event)" />',
          },
        ],
      },
      {
        id: 'map',
        title: 'Where things go',
        table: {
          caption: 'Reactive forms to ngu-form',
          columns: ['Reactive forms', 'ngu-form'],
          rows: [
            ['`FormGroup`, `FormControl`', 'The initial value: groups are nested objects'],
            ['`FormArray`', 'A list: `{ item, newItem }`'],
            [
              '`Validators.required`, `email`, `minLength`...',
              "`required`, `type: 'email'`, `minLength`...",
            ],
            ['Custom `ValidatorFn`', '`validate: (value, model) => message | undefined`'],
            ['`AsyncValidatorFn`', '`validateAsync`, with `debounce`'],
            ['Cross-field validator on the group', '`validate` on the group'],
            ['`valueChanges` side effects', '`onChange`, or `compute` for derived values'],
            [
              '`disable()` / `enable()`',
              '`disabled: (model) => boolean`, or `disabled` on the whole form',
            ],
            ['`patchValue`, `reset`', '`form.patch()`, `form.reset()`'],
            ['`dirty`, `valid`, `pending`', '`form.dirty()`, `form.valid()`, `form.pending()`'],
            ['`setErrors` from the server', 'Return errors by path from `[action]`'],
          ],
        },
        after: [
          'Moving a large form one part at a time? `<ngu-field>` renders single fields inside a hand-written Signal Forms form: see [Single fields](/single-field).',
        ],
      },
    ],
  },
};
