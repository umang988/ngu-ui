import type { DocPage } from 'docs-kit/docs/model';
import { NGU_TOKENS } from 'ngu-form';

export const PAGES: Record<string, DocPage> = {
  'custom-types': {
    title: 'Custom types',
    description:
      'Your own input for a `type` name: a component that receives the field, typed through two interfaces.',
    sections: [
      {
        id: 'renderer',
        title: 'A custom type',
        text: [
          'Register a component with `provideNguFieldTypes` and declare its value type in `NguFieldTypeMap`. Its own spec options go in `NguFieldOptionsMap`; anything else is a compile error.',
        ],
        demo: {
          src: 'custom-types/mood.ts',
          files: ['custom-types/mood-picker.ts'],
          load: () => import('../demos/custom-types/mood').then((m) => m.MoodDemo),
        },
      },
      {
        id: 'inputs',
        title: 'Renderer inputs',
        text: ['The renderer declares the inputs it needs; only those are passed.'],
        table: {
          caption: 'Inputs a renderer may declare',
          columns: ['Input', 'Type', 'Meaning'],
          rows: [
            [
              '`field`',
              '`Field<V>`',
              'Required. Bind it with `[formField]`, or write to `field().value`.',
            ],
            ['`def`', '`LeafDef`', "The spec, with the type's own options."],
            [
              '`id`',
              '`string`',
              "The id the label points at. The label itself is `id + '-label'`.",
            ],
            ['`invalid`', '`boolean`', 'True while an error shows; use it for `aria-invalid`.'],
            ['`describedBy`', '`string`', 'Ids of the hint or error, for `aria-describedby`.'],
          ],
        },
        after: [
          'A type registered under a built-in name, such as `rating`, replaces the built-in renderer.',
        ],
      },
      {
        id: 'lazy',
        title: 'Loading a type on first use',
        text: [
          'A type whose renderer pulls in a large library, such as an editor, can load when a form first needs it. Pass a function that imports the component; the field shows a placeholder with its label until it arrives, and the code loads once for every field of that type.',
        ],
        code: [
          {
            filename: 'app.config.ts',
            code: `provideNguFieldTypes({
  mood: MoodPicker,
  richText: () => import('./rich-text').then((m) => m.RichText),
})`,
          },
        ],
        after: [
          'With server rendering, the server waits for the renderer, but the browser starts from the placeholder; register such types eagerly on server-rendered pages.',
        ],
      },
      {
        id: 'rich-text',
        title: 'Rich text',
        text: [
          'ngu-form does not bundle an editor. Any editor becomes a custom type; this one uses Tiptap 3.',
        ],
        code: [
          {
            filename: 'rich-text.ts',
            code: `import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

declare module 'ngu-form' {
  interface NguFieldTypeMap { richText: string }
}

@Component({ selector: 'app-rich-text', template: \`<div #host class="editor"></div>\` })
export class RichText {
  readonly field = input.required<Field<string>>();
  readonly id = input<string>();
  readonly invalid = input(false);
  readonly describedBy = input<string>();
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
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
          state.value.set(editor.isEmpty ? '' : editor.getHTML());
          state.markAsDirty();
        },
        onBlur: () => state.markAsTouched(),
      });
    });
    // Values written by code (reset, patch, loaded data) replace the content.
    effect(() => {
      const html = this.field()().value();
      if (this.editor && html !== (this.editor.isEmpty ? '' : this.editor.getHTML())) {
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
      id: this.id() ?? '',
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-labelledby': \`\${this.id()}-label\`,
      'aria-describedby': this.describedBy() ?? '',
      'aria-invalid': String(this.invalid()),
    };
  }
}`,
          },
        ],
        after: [
          'Store HTML, Markdown or JSON, whatever `onUpdate` writes. Sanitize HTML on the server before showing it to anyone else.',
        ],
      },
    ],
  },

  overrides: {
    title: 'Overrides',
    description: 'Replace one field, or only its control, with your own template, by its path.',
    sections: [
      {
        id: 'field',
        title: 'A whole field',
        text: [
          '`nguField` replaces the label, control and messages of the field at a path. The template context has `field` (also `$implicit`), `def`, `state`, `id`, `message` and `showErrors`.',
        ],
        demo: {
          src: 'overrides/field-template.ts',
          load: () => import('../demos/overrides/field-template').then((m) => m.FieldTemplateDemo),
        },
      },
      {
        id: 'control',
        title: 'Only the control',
        text: [
          '`nguControl` replaces only the control; the label, hint and errors stay. Bind `describedBy` to keep them linked.',
        ],
        demo: {
          src: 'overrides/control-template.ts',
          load: () =>
            import('../demos/overrides/control-template').then((m) => m.ControlTemplateDemo),
        },
      },
      {
        id: 'paths',
        title: 'Paths',
        text: [
          'Paths are dot separated; list rows use `[]`, as in `items[].sku`, and run-time fields their key, as in `answers.blocker`.',
        ],
      },
    ],
  },

  theming: {
    title: 'Theming',
    description:
      'Every field reads CSS custom properties. Set them on `<ngu-form>` or any ancestor.',
    sections: [
      {
        id: 'tokens',
        title: 'Restyling with tokens',
        text: ['A few properties restyle every field: color, corners, spacing and padding.'],
        demo: {
          src: 'theming/tokens.ts',
          load: () => import('../demos/theming/tokens').then((m) => m.TokensDemo),
          value: false,
        },
      },
      {
        id: 'dark',
        title: 'Dark mode',
        text: [
          'Set the properties per theme. This site does it with `prefers-color-scheme` and a `data-theme` attribute.',
        ],
        code: [
          {
            lang: 'css',
            filename: 'styles.css',
            code: `:root {
  --ngu-primary: #2547d0;
  --ngu-border-color: #c3cad6;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ngu-primary: #8fa6ff;
    --ngu-border-color: #3a4562;
    --ngu-error-color: #ff9b8f;
  }
}`,
          },
        ],
      },
      {
        id: 'density',
        title: 'Density and size',
        text: [
          '`density` (`compact`, `normal`, `spacious`) sets the space between and inside fields; `size` (`sm`, `md`, `lg`) sets the text size of controls, labels and buttons, and the paddings follow it. Set them on `<ngu-form>`, or for every form with `provideNguFormConfig`.',
        ],
        demo: {
          src: 'theming/density.ts',
          load: () => import('../demos/theming/density').then((m) => m.DensityDemo),
          value: false,
        },
        after: [
          'They change the defaults of the spacing and text tokens marked "scaled" below; a token you set yourself always wins.',
        ],
      },
      {
        id: 'unstyled',
        title: 'No styles at all',
        text: [
          "`theme=\"none\"` drops ngu-form's CSS and keeps the markup and its classes, for design systems and utility CSS. See [Unstyled and Tailwind](/tailwind).",
        ],
      },
      {
        id: 'list',
        title: 'Every token',
        text: ['The list is exported as `NGU_TOKENS`, for tools that build themes; a test checks it against the styles.'],
        table: {
          caption: 'CSS custom properties',
          columns: ['Property', 'Default', 'Used for'],
          rows: NGU_TOKENS.map((t) => [`\`${t.name}\``, t.default.startsWith('rgba') ? 'a grey tint' : `\`${t.default}\``, t.scaled ? `${t.use} (scaled)` : t.use]),
        },
      },
    ],
  },

  icons: {
    title: 'Icons',
    description: 'An icon before or after a control, inside its border: by name from a registry, or as a template for one field.',
    sections: [
      {
        id: 'icons',
        title: 'Icons',
        text: [
          'Register icon components with `provideNguIcons`, then name them with `prefixIcon` or `suffixIcon`. Names are plain strings, so run-time fields from JSON can use them too. `nguPrefix` and `nguSuffix` templates put anything next to one field, with the field\'s context.',
        ],
        demo: {
          src: 'icons/icons.ts',
          load: () => import('../demos/icons/icons').then((m) => m.IconsDemo),
        },
      },
      {
        id: 'meaning',
        title: 'Icons and meaning',
        list: [
          'Icons are hidden from screen readers. The label must say what the field is; an icon only repeats it.',
          'A click on an icon focuses the control, as a click on the label does.',
          'Text that matters, such as a currency, belongs in `prefix` or `suffix`, which screen readers do read.',
        ],
      },
    ],
  },

  languages: {
    title: 'Messages and languages',
    description:
      'Reword or translate every text ngu-form renders, plug in your i18n library, and lay forms out right to left.',
    sections: [
      {
        id: 'messages',
        title: 'Rewording messages',
        text: [
          '`provideNguMessages` takes ICU templates (with plural and select) or functions. Provide it for the app, a route or one component; inner providers win key by key.',
        ],
        demo: {
          src: 'languages/messages.ts',
          load: () => import('../demos/languages/messages').then((m) => m.MessagesDemo),
        },
      },
      {
        id: 'translate',
        title: 'Translation libraries',
        text: [
          'One `translate` hook resolves labels, hints, options and validator messages, and built-in texts as `ngu.<key>`. A factory may return a signal, so a language switch re-renders the form.',
        ],
        code: [
          {
            code: `provideNguMessages(() => {
  const transloco = inject(TranslocoService);
  const lang = toSignal(transloco.langChanges$);
  return computed(() => ({
    locale: lang(),
    translate: (key, params) => transloco.translate(key, params),
  }));
})`,
          },
        ],
        after: [
          'The [In three languages](/examples/languages) example switches between English, Hindi and Arabic.',
        ],
      },
      {
        id: 'rtl',
        title: 'Right to left',
        text: [
          'Every style uses logical CSS properties, so `dir="rtl"` on any ancestor mirrors the form. Masked values such as phone numbers stay left to right.',
        ],
        demo: {
          src: 'languages/rtl.ts',
          load: () => import('../demos/languages/rtl').then((m) => m.RtlDemo),
        },
      },
    ],
  },

  accessibility: {
    title: 'Accessibility',
    description:
      'The generated markup is checked with axe (WCAG 2.1 A and AA plus best practices) and tested by keyboard.',
    sections: [
      {
        id: 'fields',
        title: 'Fields',
        list: [
          'Every control has a label. Hints, errors, counters, prefixes and suffixes are linked with `aria-describedby`.',
          '`aria-invalid` is set only while an error shows, so untouched fields stay neutral.',
          'Required fields carry the native `required` attribute; the visual asterisk is hidden from screen readers.',
          'Choices are native inputs in named fieldsets; radios, segments and stars form a `radiogroup`.',
        ],
      },
      {
        id: 'submitting',
        title: 'Submitting',
        list: [
          'A refused submit moves focus to the first problem and announces how many fields need attention, once.',
          'The busy submit button keeps focus (`aria-disabled`, not `disabled`); repeat clicks are ignored.',
          '`errorSummary` lists every problem with links to the fields.',
        ],
      },
      {
        id: 'feedback',
        title: 'Announcements',
        list: [
          'Warnings carry an icon and a hidden "Warning:" prefix, so they never rely on color.',
          'Password strength, tags, uploads, undo and redo announce their changes politely.',
          'Loading sets `aria-busy` on the form; the restored-draft notice is a status message.',
        ],
      },
      {
        id: 'display',
        title: 'Display',
        list: [
          'In Windows high contrast mode, borders, focus rings and states use system colors.',
          'Logical CSS throughout: right-to-left layouts mirror correctly.',
          'Animations stop under `prefers-reduced-motion`.',
        ],
      },
    ],
  },
};
