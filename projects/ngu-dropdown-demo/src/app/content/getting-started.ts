import type { DocPage } from 'docs-kit/docs/model';

/** Demos against the fake server show its source as a second tab. */
export const FAKE = ['fake-server.ts'];

export const PAGES: Record<string, DocPage> = {
  introduction: {
    title: 'Introduction',
    description:
      'ngu-dropdown is a select for Angular that pages through your server as people scroll and search. You write one `fetchFn`; the dropdown handles paging, search, loading states and a virtual list.',
    sections: [
      {
        id: 'server',
        title: 'A list from your server',
        text: [
          'Bind `fetchFn` to a method that loads one page. Nothing is asked for until the list opens; then page 0, then only the pages under the scroll position. Drag the scrollbar to the middle of these 50,000 customers: the list asks for that one page, not every page before it.',
        ],
        demo: {
          src: 'basic.ts',
          load: () => import('../demos/basic').then((m) => m.DropdownBasicDemo),
          files: FAKE,
        },
      },
      {
        id: 'how',
        title: 'How paging works',
        list: [
          'The scrollbar is sized to `totalElements` from the first response, so it shows the whole result set from the start.',
          'Loaded rows are kept by page, at most twelve pages, dropping the furthest from where the list is scrolled. Memory stays bounded however far people scroll.',
          'A row whose page has not arrived shows a placeholder of the same height, so nothing jumps when it lands.',
          'Only about fifteen rows are in the DOM at any time, whatever the size of the list.',
          'A new search, filter or sort cancels the requests in flight (Observables are unsubscribed, the `AbortSignal` is aborted) and starts again from page 0. Late answers to an older query are dropped.',
        ],
      },
      {
        id: 'client',
        title: 'A list already in hand',
        text: [
          'Without `fetchFn`, `[options]` is searched in the browser, ignoring case and accents: type "osterreich" or "mexico". It is still a virtual list, so a few thousand options cost no more than a few. The search box appears above eight options.',
        ],
        after: ['More in [Static options](/static-options).'],
        demo: {
          src: 'client.ts',
          load: () => import('../demos/client').then((m) => m.DropdownClientDemo),
        },
      },
      {
        id: 'next',
        title: 'Next steps',
        list: [
          '[Install it](/installation) in an Angular 22.2 app.',
          'Connect [your API](/server-data): the query, filters, and naming saved ids.',
          'Or pass [static options](/static-options) and search them in the browser.',
          'Pick [several values](/selection) or disable some options.',
          'Use it in [Signal Forms, reactive forms or ngModel](/forms).',
          'Change [rows](/templates), [text](/messages) and [colors](/theming).',
        ],
      },
    ],
  },

  installation: {
    title: 'Installation',
    description: 'Add ngu-dropdown to an Angular CLI project.',
    sections: [
      {
        id: 'download',
        title: 'Download',
        text: ['ngu-dropdown is on npm. It has no runtime dependencies besides Angular.'],
        code: [{ code: 'npm install ngu-dropdown', lang: 'bash' }],
      },
      {
        id: 'requirements',
        title: 'Requirements',
        table: {
          caption: 'Required packages',
          columns: ['Package', 'Version'],
          rows: [
            ['`@angular/core`, `@angular/common`', '22.2 or newer'],
            ['`@angular/forms`', '22.2 or newer'],
            ['RxJS', 'Optional: `fetchFn` may return a Promise instead'],
          ],
        },
        after: ['The component is standalone and works with zoneless change detection.'],
      },
      {
        id: 'import',
        title: 'Import',
        text: [
          'Import `NguDropdown` where you use it, and give it a method that loads one page. Keep the method a class field, not an arrow written in the template.',
        ],
        code: [
          {
            filename: 'customer-picker.ts',
            code: `import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NguDropdown, type NguDropdownPage, type NguDropdownQuery } from 'ngu-dropdown';

@Component({
  selector: 'app-customer-picker',
  imports: [NguDropdown],
  template: \`
    <label for="customer">Customer</label>
    <ngu-dropdown inputId="customer" [fetchFn]="loadCustomers" [(value)]="customerId"
                  optionValue="id" optionLabel="name" />
  \`,
})
export class CustomerPicker {
  private readonly http = inject(HttpClient);
  readonly customerId = signal<number | null>(null);

  readonly loadCustomers = (q: NguDropdownQuery) =>
    this.http.get<NguDropdownPage<Customer>>('/api/customers', {
      params: { page: q.page, size: q.size, search: q.search },
    });
}`,
          },
        ],
      },
      {
        id: 'defaults',
        title: 'App-wide defaults',
        text: [
          'If your API names its fields `id` and `name` everywhere, say so once instead of on every dropdown. The same provider sets page size, row height and every built-in string.',
        ],
        code: [
          {
            filename: 'app.config.ts',
            code: `import { provideNguDropdownConfig } from 'ngu-dropdown';

export const appConfig: ApplicationConfig = {
  providers: [provideNguDropdownConfig({ optionValue: 'id', optionLabel: 'name' })],
};`,
          },
        ],
      },
      {
        id: 'with-ngu-form',
        title: 'With ngu-form',
        text: [
          'ngu-dropdown reads the same `--ngu-*` CSS variables as [ngu-form](https://ngu-form.netlify.app), so a form theme styles both. Each package works without the other.',
        ],
      },
    ],
  },

  'ai-agents': {
    title: 'AI coding agents',
    description:
      'Give Claude Code, Codex, Cursor or Copilot the docs of the version you installed, so they wire up fetchFn, keys and labels correctly.',
    sections: [
      {
        id: 'setup',
        title: 'Set up a project',
        text: [
          '`ng add ngu-dropdown` asks whether to add notes for AI coding agents; in a project that already has it, run the `ai` schematic. It writes a short block into `AGENTS.md` with the rules agents get wrong most often, how to check the result, and an index of the docs inside `node_modules/ngu-dropdown/docs`.',
          'Claude Code reads `CLAUDE.md` instead of `AGENTS.md` when a project has one, and Gemini CLI reads `GEMINI.md`, so those get the same block when they exist, unless they already import `AGENTS.md`. Run the schematic again after an update, or with `--remove` to take the block out.',
        ],
        code: [{ code: 'ng g ngu-dropdown:ai', lang: 'bash' }],
      },
      {
        id: 'contents',
        title: 'What agents get',
        table: {
          caption: 'Files for AI agents',
          columns: ['Path', 'Contents'],
          rows: [
            [
              '`node_modules/ngu-dropdown/docs/`',
              'Every page of this site as Markdown, with the source of every demo.',
            ],
            [
              '`node_modules/ngu-dropdown/docs/AGENTS.md`',
              'The block the schematic writes, to copy by hand into any instructions file.',
            ],
            [
              '`node_modules/ngu-dropdown/skills/ngu-dropdown`',
              'The same notes as an Agent Skill.',
            ],
            [
              '`/llms.txt`, `/llms-full.txt` on this site',
              'The docs for agents that read the web.',
            ],
          ],
        },
        after: [
          'Any page of this site is also available as Markdown: add `.md` to its address, as in `/server-data.md`. In an [ngu-form](https://ngu-form.netlify.app/ai-agents) project, its own notes cover the `dropdown` field type too.',
        ],
      },
    ],
  },

  changelog: {
    title: 'Changelog',
    description: 'What changed in each release.',
    sections: [{ id: 'releases', title: 'Releases', markdown: 'CHANGELOG.md' }],
  },
};
