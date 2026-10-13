import type { DocPage } from 'docs-kit/docs/model';

export const PAGES: Record<string, DocPage> = {
  'single-field': {
    title: 'Single fields',
    description:
      'Use `<ngu-field>` alone in a hand-written Signal Forms form: its label, hint, messages and accessibility, without a spec.',
    sections: [
      {
        id: 'alone',
        title: 'In your own form',
        text: [
          '`<ngu-field>` takes a field from `form()` and a plain spec for how it looks. Rules stay in your schema; the spec only shapes the markup: the asterisk comes from `required`, the counter from `maxLength`, and so on.',
        ],
        demo: {
          src: 'single-field/single-field.ts',
          load: () => import('../demos/single-field/single-field').then((m) => m.SingleFieldDemo),
        },
      },
      {
        id: 'timing',
        title: 'When errors show',
        text: [
          "Outside `<ngu-form>` there is no submit attempt to reveal errors, so the default `errorsOn: 'dirty'` waits for a change. Set `errorsOn: 'touched'`: Signal Forms' `submit()` marks every field touched, and the errors appear.",
        ],
      },
    ],
  },

  debug: {
    title: 'Debug panel',
    description:
      'See a form’s value, state, unsaved changes and every error by path while you build it.',
    sections: [
      {
        id: 'panel',
        title: 'The panel',
        text: [
          '`<ngu-form-debug>` lives in `ngu-form/debug`, so production bundles that do not import it never include it. Type in the form and watch the panel follow.',
        ],
        demo: {
          src: 'debug/debug.ts',
          load: () => import('../demos/debug/debug').then((m) => m.DebugDemo),
          value: false,
        },
      },
      {
        id: 'rows',
        title: 'In tests and tools',
        text: [
          '`debugRows(form)` returns the same list the panel shows: every field, group and list with its path, state and errors.',
        ],
        code: [
          {
            code: `import { debugRows } from 'ngu-form/debug';

const invalid = debugRows(signup).filter((row) => row.errors.length);
// [{ path: 'items.0.sku', kind: 'field', errors: ['required: Enter a SKU'], dirty: false, ... }]`,
          },
        ],
      },
    ],
  },

  testing: {
    title: 'Testing',
    description:
      'Fill, submit and read forms in tests by model path, with Angular CDK harnesses for unit tests and a small helper for Playwright.',
    sections: [
      {
        id: 'harness',
        title: 'Component harnesses',
        text: [
          '`ngu-form/testing` has `NguFormHarness`, `NguFieldHarness` and `NguListHarness`, built on `@angular/cdk/testing`. Fields are found by model path, with numbers for list rows, or by label. Values go in the way a user enters them: text is typed, options are picked by label.',
        ],
        code: [
          {
            filename: 'signup.spec.ts',
            code: `import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { NguFormHarness } from 'ngu-form/testing';

it('signs up', async () => {
  const fixture = TestBed.createComponent(Signup);
  const form = await TestbedHarnessEnvironment.harnessForFixture(fixture, NguFormHarness);

  await form.fill({
    'account.email': 'ada@example.com',
    plan: 'Pro',              // an option, by its label
    topics: ['Tips'],         // a checkbox group
    remember: true,
    'items.0.sku': 'X-1',     // the first row of a list
  });
  await form.submit();

  expect(await form.getErrors()).toEqual({});
});

it('shows the server error', async () => {
  // ...
  await form.submit();
  expect(await form.getErrors()).toEqual({ 'account.email': 'Already registered' });
});`,
          },
        ],
      },
      {
        id: 'playwright',
        title: 'Playwright',
        text: [
          "CDK harnesses do not run inside Playwright, so `ngu-form/playwright` offers the same calls on a Playwright `page` or `locator`. It has no dependencies: it works with Playwright's own types.",
        ],
        code: [
          {
            filename: 'signup.e2e.ts',
            code: `import { test, expect } from '@playwright/test';
import { nguForm } from 'ngu-form/playwright';

test('signs up', async ({ page }) => {
  await page.goto('/signup');
  const form = nguForm(page);
  await form.fill({ 'account.email': 'ada@example.com', plan: 'Pro', remember: true });
  await form.submit();
  expect(await form.errors()).toEqual({});
});`,
          },
        ],
      },
      {
        id: 'paths',
        title: 'Paths in the DOM',
        text: [
          'Every field and list carries its model path as `data-ngu-path` (`items.0.sku`) and its type as `data-ngu-type`, so any test tool can find it: `page.locator(\'[data-ngu-path="account.email"] input\')`.',
        ],
      },
    ],
    api: [
      {
        id: 'form-harness',
        title: 'NguFormHarness',
        rows: [
          {
            name: 'field(pathOrLabel)',
            type: 'Promise<NguFieldHarness>',
            description: 'The field at a model path, else the one with this label.',
          },
          {
            name: 'fields(filter?)',
            type: 'Promise<NguFieldHarness[]>',
            description: 'Every field on screen, optionally filtered by label, path or type.',
          },
          {
            name: 'list(path)',
            type: 'Promise<NguListHarness>',
            description: 'The list at a model path.',
          },
          {
            name: 'fill(values)',
            type: 'Promise<void>',
            description: 'Enters each value into the field at its path or label, in order.',
          },
          { name: 'submit()', type: 'Promise<void>', description: 'Presses the submit button.' },
          { name: 'next(), back()', type: 'Promise<void>', description: 'Wizard buttons.' },
          {
            name: 'getStep()',
            type: 'Promise<string | null>',
            description: 'The heading of the step on screen.',
          },
          {
            name: 'getErrors()',
            type: 'Promise<Record<string, string>>',
            description: 'Errors on screen by path, with `$form` for the form-level error.',
          },
          {
            name: 'getFormError()',
            type: 'Promise<string | null>',
            description: 'The form-level error.',
          },
          {
            name: 'isBusy()',
            type: 'Promise<boolean>',
            description: 'True while submitting or loading.',
          },
        ],
      },
      {
        id: 'field-harness',
        title: 'NguFieldHarness',
        rows: [
          {
            name: 'with({ label, path, type })',
            type: 'HarnessPredicate',
            description: 'Find fields by label, model path or type.',
          },
          {
            name: 'getLabel(), getPath(), getType()',
            type: 'Promise<string>',
            description: 'What the field is.',
          },
          {
            name: 'getValue()',
            type: 'Promise<NguFieldValue>',
            description: 'The value as shown: text, `true`/`false`, option labels, tags.',
          },
          {
            name: 'setValue(value)',
            type: 'Promise<void>',
            description: 'Enters a value, then leaves the field.',
          },
          {
            name: 'getError(), getHint(), getWarning()',
            type: 'Promise<string | null>',
            description: 'The messages on screen.',
          },
          {
            name: 'isInvalid(), isRequired(), isDisabled(), isPending()',
            type: 'Promise<boolean>',
            description: 'State.',
          },
          { name: 'focus(), blur()', type: 'Promise<void>', description: 'Move focus.' },
        ],
      },
      {
        id: 'list-harness',
        title: 'NguListHarness',
        rows: [
          { name: 'getRowCount()', type: 'Promise<number>', description: 'Rows on screen.' },
          {
            name: 'addRow(), removeRow(index)',
            type: 'Promise<void>',
            description: 'Press add, or the remove button of a row.',
          },
          {
            name: 'getRowFields(index)',
            type: 'Promise<NguFieldHarness[]>',
            description: 'The fields of one row.',
          },
        ],
      },
    ],
  },

  schematics: {
    title: 'Schematics',
    description:
      'Set ngu-form up with `ng add`, and generate typed forms from an interface, a JSON Schema or an OpenAPI request body.',
    sections: [
      {
        id: 'ng-add',
        title: 'ng add',
        text: [
          '`ng add ngu-form` installs the package and asks four questions: a design system to render with (none, Angular Material or PrimeNG), whether to add file, image and signature fields, whether to create a sample form, and whether to add notes for [AI coding agents](/ai-agents). It writes the providers into `app.config.ts`.',
        ],
        code: [{ code: 'ng add ngu-form', lang: 'bash' }],
      },
      {
        id: 'form',
        title: 'From an interface',
        text: [
          '`ng g ngu-form:form` finds an interface or type alias in the project and writes a component with an initial value and a spec for every property: labels from names, types from TypeScript (string unions become radios or selects, `Date` a date field, arrays of objects lists), email, password, URL and phone fields from their names, and doc comments as hints.',
        ],
        code: [
          { code: 'ng g ngu-form:form signup --model=Signup', lang: 'bash' },
          {
            filename: 'signup-form.ts',
            code: `@Component({
  selector: 'app-signup-form',
  imports: [NguForm],
  template: \`<ngu-form [form]="form" submitLabel="Save" (submitted)="save($event)" />\`,
})
export class SignupForm {
  private readonly initial: Signup = {
    fullName: '',
    email: '',
    plan: 'free',
    birthday: null,
  };

  readonly form = defineForm(this.initial, {
    fullName: { label: 'Full name', hint: 'As on your ID', required: true },
    email: { label: 'Email', type: 'email', required: true },
    plan: { label: 'Plan', type: 'radio', options: [ ... ] },
    birthday: { label: 'Birthday', type: 'date' },
  });
}`,
          },
        ],
      },
      {
        id: 'schema',
        title: 'From JSON Schema or OpenAPI',
        text: [
          '`ng g ngu-form:from-schema` reads a JSON Schema, or an OpenAPI 3 document by schema or by operation, and writes a model interface plus a typed form component. Formats, enums, required lists, lengths, patterns, bounds, defaults and `$ref`s carry over; `readOnly` properties are left out. What it cannot express, such as `oneOf`, becomes a TODO that still compiles.',
        ],
        code: [
          {
            code: 'ng g ngu-form:from-schema new-user --schema=openapi.json --operation=createUser',
            lang: 'bash',
          },
          { code: 'ng g ngu-form:from-schema address --schema=schemas/address.json', lang: 'bash' },
        ],
        after: [
          'The code is yours to edit: it is generated once, not kept in sync. YAML documents need converting to JSON first.',
        ],
      },
      {
        id: 'formly',
        title: 'From ngx-formly',
        text: [
          '`ng g ngu-form:from-formly` converts the formly field arrays in a file; see [From ngx-formly](/from-formly).',
        ],
      },
    ],
  },

  diagnostics: {
    title: 'Diagnostics',
    description:
      'Every problem ngu-form reports has a code. This page explains each one and how to fix it.',
    sections: [
      {
        id: 'about',
        title: 'Codes',
        text: [
          'Mistakes in a spec throw from `defineForm`. Paths that match no field, missing providers and conflicts between forms log a warning in development builds only. Every message ends with a link to its entry below.',
        ],
      },
      {
        id: 'ngu-101',
        title: 'NGU-101: unknown layout',
        text: ['`layout` must be `steps`, `tabs` or `accordion`.'],
      },
      {
        id: 'ngu-102',
        title: 'NGU-102: layout needs groups or lists',
        text: [
          'Steps and tabs show groups and lists, one per step or tab. Move loose fields into a group.',
        ],
      },
      {
        id: 'ngu-103',
        title: 'NGU-103: described but missing from the model',
        text: [
          'The spec has a key the initial value does not. It is often a typo; the message suggests the nearest model key. Every key must also be in the initial value, even optional ones.',
        ],
      },
      {
        id: 'ngu-104',
        title: 'NGU-104: not a label or options',
        text: ['A field spec is a label string or an options object.'],
      },
      {
        id: 'ngu-105',
        title: 'NGU-105: array spec',
        text: [
          'A list needs `{ item, newItem }`. Items that are lists themselves need an object around them.',
        ],
      },
      {
        id: 'ngu-106',
        title: 'NGU-106: table layout',
        text: ["`layout: 'table'` needs object items of plain fields and has no `summary` line."],
      },
      {
        id: 'ngu-107',
        title: 'NGU-107: steps inside a group',
        text: ["Only the whole form can be a wizard: put `layout: 'steps'` on `defineForm`."],
      },
      {
        id: 'ngu-108',
        title: 'NGU-108: static content',
        text: [
          'Keys starting with `$` are static content: `{ heading }`, `{ text }` or `{ divider: true }`.',
        ],
      },
      {
        id: 'ngu-109',
        title: 'NGU-109: type does not fit the value',
        text: [
          'The `type` needs another value shape or `options`, such as `radio` on a list. The message names what is missing.',
        ],
      },
      {
        id: 'ngu-110',
        title: 'NGU-110: type cannot be inferred',
        text: [
          'From `null`, `undefined` or an unusual value ngu-form cannot pick an input. Set `type`.',
        ],
      },
      {
        id: 'ngu-111',
        title: 'NGU-111: duplicate run-time key',
        text: [
          'Two run-time fields have the same `key`. Keys are model properties, so they must be unique.',
        ],
      },
      {
        id: 'ngu-201',
        title: 'NGU-201: template path matches no field',
        text: [
          'An `nguField`, `nguControl`, `nguPrefix` or `nguSuffix` path names no field, so the template is never used. Paths are dot separated, list rows use `[]` (`items[].sku`); the message suggests the nearest path.',
        ],
      },
      {
        id: 'ngu-202',
        title: 'NGU-202: server error path matches no field',
        text: [
          'The action returned an error for a path that is not a field; it shows as a form-level error. Use `satisfies SubmitErrors<T>` to catch typos at compile time.',
        ],
      },
      {
        id: 'ngu-301',
        title: 'NGU-301: no renderer for a type',
        text: [
          'The field renders as a text input because nothing renders its type. For `file`, `image` and `signature` add `provideNguUpload()`, for `dropdown` add `provideNguDropdown()`, for your own types register them with `provideNguFieldTypes`.',
        ],
      },
      {
        id: 'ngu-302',
        title: 'NGU-302: unknown icon',
        text: [
          'A `prefixIcon` or `suffixIcon` names an icon that is not registered. Add it with `provideNguIcons`.',
        ],
      },
      {
        id: 'ngu-303',
        title: 'NGU-303: captcha without a provider',
        text: ['A `captcha` field needs `captcha` in its spec or `provideNguCaptcha()`.'],
      },
      {
        id: 'ngu-304',
        title: 'NGU-304: registered class is not a component',
        text: [
          '`provideNguFieldTypes` and `provideNguFieldRenderers` take components, or functions that load them.',
        ],
      },
      {
        id: 'ngu-401',
        title: 'NGU-401: two forms share a draft key',
        text: [
          "Two forms alive at once save drafts under the same key and overwrite each other. Include the record id: `draft: { key: 'profile:' + id }`.",
        ],
      },
    ],
  },
};
