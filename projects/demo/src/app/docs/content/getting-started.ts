import type { DocPage } from 'docs-kit/docs/model';

export const PAGES: Record<string, DocPage> = {
  introduction: {
    title: 'Introduction',
    description:
      'ngu-form turns a typed TypeScript object into an accessible Angular form. You describe the model; labels, inputs, validation and layout follow from it. Underneath, it is Angular Signal Forms.',
    sections: [
      {
        id: 'first-form',
        title: 'A first form',
        text: [
          '`defineForm` takes the initial value and a spec with one entry per key. `<ngu-form>` renders it, and `(submitted)` fires only for a valid form.',
        ],
        demo: {
          src: 'introduction/first-form.ts',
          load: () => import('../demos/introduction/first-form').then((m) => m.FirstFormDemo),
        },
      },
      {
        id: 'typed',
        title: 'Typed from the model',
        text: [
          'The spec mirrors the model, so TypeScript catches a missing key, an extra key, or an input that does not fit the value. Mistakes show up in your editor, not in testing.',
        ],
        code: [
          {
            code: `defineForm({ email: '', age: 0 }, {
  email: { label: 'Email', type: 'email' },
  // Error: Property 'age' is missing
});

defineForm({ age: 0 }, {
  age: { label: 'Age', type: 'email' }, // Error: 'email' is not a number input
});`,
          },
        ],
      },
      {
        id: 'signal-forms',
        title: 'Built on Signal Forms',
        text: [
          "Validation, state and binding are Angular's own. `form.tree` is an ordinary Signal Forms field tree, and `form.value()` is a signal, so your tests and tools keep working.",
        ],
        list: [
          '**Accessible by default:** labels, descriptions, `aria-invalid` only while an error shows, focus on the first problem after a refused submit, and one polite announcement.',
          '**Plain objects:** a spec is data. Fields can come from JSON sent by your server, with their rules and conditions.',
          '**Small core:** heavy inputs load on first use, and uploads live in the separate `ngu-form/upload` entry point.',
        ],
      },
      {
        id: 'next',
        title: 'Next steps',
        list: [
          '[Install ngu-form](/installation) in an Angular 22.2 app.',
          'Learn [how a spec maps to a form](/defining-forms).',
          'Browse the [field types](/text), each with live demos.',
          'Open the [examples](/examples) for complete forms next to their code.',
        ],
      },
    ],
  },

  installation: {
    title: 'Installation',
    description: 'Set up ngu-form in an Angular CLI project.',
    sections: [
      {
        id: 'download',
        title: 'Download',
        text: ['ngu-form is on npm. It has no runtime dependencies besides Angular.'],
        code: [{ code: 'npm install ngu-form', lang: 'bash' }],
      },
      {
        id: 'requirements',
        title: 'Requirements',
        table: {
          caption: 'Required packages',
          columns: ['Package', 'Version'],
          rows: [
            ['`@angular/core`, `@angular/common`', '22.2 or newer'],
            ['`@angular/forms`', '22.2 or newer, for Signal Forms'],
            ['TypeScript', 'The version your Angular release supports'],
          ],
        },
        after: ['Components are standalone and work with zoneless change detection.'],
      },
      {
        id: 'import',
        title: 'Import',
        text: [
          'Import `NguForm` into the component that shows the form, and create the form where `inject()` works: a field initializer or a constructor.',
        ],
        code: [
          {
            filename: 'newsletter.ts',
            code: `import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'app-newsletter',
  imports: [NguForm],
  template: \`<ngu-form [form]="form" submitLabel="Subscribe" (submitted)="save($event)" />\`,
})
export class Newsletter {
  readonly form = defineForm({ email: '' }, { email: { label: 'Email', type: 'email', required: true } });

  save(value: { email: string }) {
    console.log(value);
  }
}`,
          },
        ],
      },
      {
        id: 'verify',
        title: 'Verify',
        text: [
          'The form below is that component. Press Subscribe with an empty field to see validation.',
        ],
        demo: {
          src: 'installation/verify.ts',
          load: () => import('../demos/installation/verify').then((m) => m.VerifyDemo),
        },
      },
      {
        id: 'uploads',
        title: 'Uploads',
        text: [
          'File, image and signature fields live in `ngu-form/upload`, so apps without them do not ship the code. Add the provider where you use them.',
        ],
        code: [
          {
            code: `import { provideNguUpload } from 'ngu-form/upload';\n\nproviders: [provideNguUpload()]`,
          },
        ],
      },
      {
        id: 'problems',
        title: 'Common problems',
        table: {
          caption: 'Error messages and their fixes',
          columns: ['Message', 'Fix'],
          rows: [
            [
              '`NG0203: inject() must be called from an injection context`',
              '`defineForm` ran outside a constructor or field initializer. Pass `{ injector }` as the third argument.',
            ],
            [
              '`"email" is described but missing from the model value`',
              'Every key in the spec needs a value in the initial object, even an empty string.',
            ],
            [
              "`Property 'email' is missing in type …`",
              'The spec has to describe every model key. Add at least a label string.',
            ],
            [
              '`Type \'"email"\' is not assignable to type …`',
              'The input type does not fit the value; see the [field types](/text).',
            ],
          ],
        },
      },
      {
        id: 'next',
        title: 'Next steps',
        list: [
          '[Configuration](/configuration): providers for the whole app.',
          '[Defining a form](/defining-forms): how a spec maps to a form.',
        ],
      },
    ],
  },

  configuration: {
    title: 'Configuration',
    description: 'App-wide options, set once with providers in `app.config.ts` or on a component.',
    sections: [
      {
        id: 'form-config',
        title: 'Breakpoints and leaving',
        text: [
          '`provideNguFormConfig` sets the widths behind responsive `cols`, and the dialog the unsaved-changes guard uses instead of `confirm()`.',
        ],
        code: [
          {
            filename: 'app.config.ts',
            code: `import { provideNguFormConfig } from 'ngu-form';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNguFormConfig({
      // Form widths, in CSS pixels, for responsive cols
      breakpoints: { sm: 480, md: 720, lg: 960 },
      confirmLeave: () => dialog.confirm('Discard your changes?'),
    }),
  ],
};`,
          },
        ],
      },
      {
        id: 'messages',
        title: 'Messages and languages',
        text: [
          '`provideNguMessages` rewords or translates every text ngu-form renders. See [Messages and languages](/languages).',
        ],
        code: [
          { code: `provideNguMessages({ required: '{label} is mandatory', add: 'Add another' })` },
        ],
      },
      {
        id: 'field-types',
        title: 'Your own field types',
        text: [
          '`provideNguFieldTypes` registers a component per `type` name. See [Custom types](/custom-types).',
        ],
        code: [{ code: `provideNguFieldTypes({ mood: MoodPicker })` }],
      },
      {
        id: 'captcha',
        title: 'Captcha',
        text: [
          "`provideNguCaptcha` sets the provider for `type: 'captcha'` fields. See [Captcha](/captcha).",
        ],
        code: [{ code: `provideNguCaptcha(nguTurnstile({ siteKey: '0x4AAAA...' }))` }],
      },
      {
        id: 'guard',
        title: 'Unsaved changes',
        text: [
          '`nguUnsavedChangesGuard` finds the forms on the routed component and asks only when something changed.',
        ],
        code: [
          {
            filename: 'app.routes.ts',
            code: `{ path: 'profile', component: ProfilePage, canDeactivate: [nguUnsavedChangesGuard] }`,
          },
        ],
      },
    ],
  },

  changelog: {
    title: 'Changelog',
    description: 'What changed in each release, with migration notes for breaking changes.',
    sections: [{ id: 'releases', title: 'Releases', markdown: 'CHANGELOG.md' }],
  },
};
