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
        id: 'ng-add',
        title: 'With ng add',
        text: [
          '`ng add ngu-form` installs it and asks whether to render with Angular Material or PrimeNG, whether to add uploads, and whether to create a sample form; it writes the providers into `app.config.ts`. See [Schematics](/schematics) for generating forms from interfaces and API schemas.',
        ],
        code: [{ code: 'ng add ngu-form', lang: 'bash' }],
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
        id: 'ssr',
        title: 'Server-side rendering',
        text: [
          'Forms render on the server and hydrate in the browser without mismatches; every example on this site is checked that way on each change. Wizards, tabs, accordions, table lists and the field types that load on first use (phone, tags, one-time code, rating, date range and others) sit in `@defer` blocks. With incremental hydration they render on the server too; without it the server sends an empty placeholder for them and the browser fills it in after start-up.',
        ],
        code: [
          {
            filename: 'app.config.ts',
            code: `import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';

providers: [provideClientHydration(withEventReplay(), withIncrementalHydration())]`,
          },
        ],
        after: [
          "Drafts, undo shortcuts and the unsaved-changes prompt start in the browser only. Data passed to `load` should come from a `resource` (or `httpResource`), which the server waits for, so the form arrives filled in.",
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

  'ai-agents': {
    title: 'AI coding agents',
    description:
      'Give Claude Code, Codex, Cursor or Copilot the docs of the version you installed, so they write ngu-form code that compiles and can build a form from a screenshot.',
    sections: [
      {
        id: 'setup',
        title: 'Set up a project',
        text: [
          '`ng add ngu-form` asks whether to add notes for AI coding agents. In a project that already has ngu-form, run the `ai` schematic. It writes a short block into `AGENTS.md`: the rules agents get wrong most often, how to check generated code, and an index of the docs inside `node_modules/ngu-form/docs`.',
          'Claude Code reads `CLAUDE.md` instead of `AGENTS.md` when a project has one, and Gemini CLI reads `GEMINI.md`, so those get the same block when they exist, unless they already import `AGENTS.md`. The block sits between markers: run the schematic again after updating ngu-form, or with `--remove` to take it out.',
        ],
        code: [{ code: 'ng g ngu-form:ai', lang: 'bash' }],
      },
      {
        id: 'contents',
        title: 'What agents get',
        text: [
          'Everything comes from the package itself, so it matches the installed version and works offline. Agents learn about ngu-form from these files instead of from training data, which predates it.',
        ],
        table: {
          caption: 'Files for AI agents',
          columns: ['Path', 'Contents'],
          rows: [
            [
              '`node_modules/ngu-form/docs/`',
              'Every page of this site as Markdown, with the source of every demo and example.',
            ],
            [
              '`node_modules/ngu-form/docs/AGENTS.md`',
              'The block the schematic writes, to copy by hand into any instructions file.',
            ],
            [
              '`node_modules/ngu-form/docs/guides/from-image.md`',
              'How to turn a screenshot or mockup into a form, and check the result against it.',
            ],
            [
              '`node_modules/ngu-form/skills/`',
              'The same knowledge as Agent Skills: `ngu-form` and `ngu-form-from-image`.',
            ],
            [
              '`/llms.txt`, `/llms-full.txt` on this site',
              'The docs for agents that read the web, such as chat assistants.',
            ],
          ],
        },
        after: [
          'Any page of this site is also available as Markdown: add `.md` to its address, as in `/layout.md`.',
        ],
      },
      {
        id: 'from-image',
        title: 'Forms from a screenshot',
        text: [
          'Attach a screenshot, a photo of a sketch, or a design export, and ask for the form, as in "Build the form in signup.png with ngu-form, on the /signup route". The notes send the agent to the screenshot guide: it lists every field in the image, maps each one to a field type, writes a typed model and spec, matches colors and spacing with [theme tokens](/theming), then renders the page and compares it with the image.',
        ],
        code: [
          {
            lang: 'bash',
            code: `# How the agent checks its render (needs: npm i -D playwright-core)
node node_modules/ngu-form/skills/ngu-form-from-image/scripts/snap.mjs http://localhost:4200/signup signup-render.png`,
          },
        ],
        after: [
          '`snap.mjs` saves a screenshot, prints the browser console, where ngu-form reports mistakes as [diagnostics](/diagnostics), and lists the rendered fields row by row with their labels, types and required marks, so the agent can compare them with the image.',
        ],
      },
      {
        id: 'checks',
        title: 'How agents check their work',
        list: [
          'Types: the spec is checked against the model, so a field type that does not fit its value fails the build. The notes tell agents to fix the model or the type, never to cast.',
          'Diagnostics: development builds log mistakes TypeScript cannot see, such as a path that matches no field, as `ngu-form [NGU-xxx]` with a link to the fix.',
          'The render: for screenshots, the agent compares its own screenshot with the original before it reports back.',
        ],
      },
      {
        id: 'skills',
        title: 'Agent Skills',
        text: [
          'The skills in `node_modules/ngu-form/skills` follow the Agent Skills format. Tools that collect skills from packages can use them where they are; to make one always available in Claude Code, copy it into the project. A copy does not update with the package, but the `AGENTS.md` block always points at the installed files.',
        ],
        code: [
          {
            code: 'mkdir -p .claude/skills\ncp -R node_modules/ngu-form/skills/ngu-form-from-image .claude/skills/',
            lang: 'bash',
          },
        ],
      },
    ],
  },

  versioning: {
    title: 'Versioning and support',
    description:
      'Which Angular versions and browsers ngu-form supports, what counts as its public API, how long a deprecated API keeps working, and what it costs in size and speed.',
    sections: [
      {
        id: 'semver',
        title: 'Version numbers',
        text: [
          'ngu-form follows semantic versioning from 1.0.0 on. A patch release fixes bugs, a minor release adds features without breaking your code, and only a major release removes or changes public API. Before 1.0.0, a minor release could break things; each one says how in the [changelog](/changelog).',
        ],
      },
      {
        id: 'angular',
        title: 'Angular versions',
        text: [
          'Each ngu-form major supports one Angular major. Support for a new Angular major comes in a new ngu-form major, released after Angular\'s and before its next minor. Node.js and TypeScript versions follow what that Angular major supports.',
        ],
        table: {
          caption: 'Supported Angular versions',
          columns: ['ngu-form', 'Angular', 'Status'],
          rows: [
            ['1.x', '22.2 or newer 22.x', 'Active'],
            ['0.6', '22.2 or newer 22.x', 'Superseded by 1.0'],
          ],
        },
      },
      {
        id: 'public-api',
        title: 'Public API',
        text: ['Semantic versioning covers what you can use without reading the source:'],
        list: [
          'Everything exported from `ngu-form` and its entry points (`ngu-form/upload`, `ngu-form/material`, `ngu-form/primeng`, `ngu-form/dropdown`, `ngu-form/tailwind`, `ngu-form/testing`, `ngu-form/playwright`, `ngu-form/debug`), as listed in the [API reference](/api/define-form).',
          'Spec options, `DynamicField` JSON, component inputs and outputs, and template directives.',
          'The documented [theme tokens](/theming) (`--ngu-*` custom properties), the [class map](/tailwind#class-map) slot names, and the `data-*` state attributes on fields.',
          'Diagnostic codes (`NGU-xxx`) and their meaning.',
        ],
        after: [
          "Not public: ngu-form's internal CSS classes and DOM structure beyond the class map slots, the exact wording of built-in messages (translate them with [messages](/languages) instead of matching them), and anything whose TSDoc says `@internal` or `@experimental`. A change to these can come in any release.",
        ],
      },
      {
        id: 'deprecations',
        title: 'Deprecations',
        text: [
          'An API is deprecated in a minor release and keeps working through the next major: deprecated in a 1.x release, it still works in all of 2.x and can be removed in 3.0. While it is deprecated, its TSDoc says `@deprecated` with the replacement, your editor strikes it through, and development builds log a diagnostic once. Each removal is listed in the changelog with a migration note.',
        ],
      },
      {
        id: 'size',
        title: 'Bundle size',
        text: [
          'Every change is measured on a login form with three fields, built once with ngu-form and once written by hand with Signal Forms. The difference is what ngu-form adds to the first JavaScript an app loads; CI fails when it grows past the budget, and each release lists it in its notes.',
        ],
        table: {
          caption: 'Initial JavaScript of the login form, measured for 0.6',
          columns: ['Login form', 'Gzip', 'Brotli'],
          rows: [
            ['Written by hand with Signal Forms', '57.9 kB', '51.2 kB'],
            ['With ngu-form', '130.9 kB', '113.1 kB'],
            ['**Added by ngu-form**', '**73.0 kB**', '**62.0 kB**'],
          ],
        },
        after: [
          'Field types beyond the everyday inputs, wizards, tabs and table lists load on first use, and uploads live in `ngu-form/upload`, so they are not part of this number.',
        ],
      },
      {
        id: 'performance',
        title: 'Performance',
        text: [
          'A 500-field form is part of the end-to-end suite. It renders in about 0.2 s, typing in any field spends about 3 ms in event handlers, well inside one frame, and checking all 500 fields after a refused submit takes about 0.1 s. CI fails when render, typing or checking go past their budgets (1 s, no long tasks while typing, and 0.3 s).',
        ],
      },
      {
        id: 'browsers',
        title: 'Browser support',
        text: [
          'ngu-form supports the last two major versions of the evergreen browsers. Every pull request runs the end-to-end suite in Chromium, Firefox and WebKit.',
        ],
        table: {
          caption: 'Supported browsers',
          columns: ['Browser', 'Versions'],
          rows: [
            ['Chrome and Edge', 'Last two'],
            ['Firefox', 'Last two, and the current ESR'],
            ['Safari on macOS', 'Last two'],
            ['Safari on iOS and iPadOS', 'Last two'],
            ['Chrome on Android', 'Last two'],
          ],
        },
        after: [
          'Older browsers may work, but issues that only appear there are not fixed. Some field types depend on the platform: date, time, month and week pickers come from the browser, and so differ between browsers.',
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
