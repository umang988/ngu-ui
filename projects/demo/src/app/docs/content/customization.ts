import type { DocPage } from 'docs-kit/docs/model';

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
        id: 'list',
        title: 'Every token',
        table: {
          caption: 'CSS custom properties',
          columns: ['Property', 'Default', 'Used for'],
          rows: [
            [
              '`--ngu-primary`',
              '`#1a73e8`',
              'Submit button, add buttons, chosen segments, switches',
            ],
            ['`--ngu-on-primary`', '`#fff`', 'Text on the submit button and chosen segments'],
            ['`--ngu-focus-color`', '`#1a73e8`', 'Focus ring'],
            ['`--ngu-border-color`', '`#c7c7c7`', 'Input borders, list rows, dividers'],
            ['`--ngu-input-bg`', '`transparent`', 'Input background'],
            ['`--ngu-readonly-bg`', 'a light grey tint', 'Read-only and computed inputs'],
            ['`--ngu-radius`', '`0.375rem`', 'Corners of inputs and buttons'],
            ['`--ngu-gap`', '`1rem`', 'Space between fields'],
            [
              '`--ngu-field-gap`',
              '`0.375rem`',
              'Space between a label, its control and its message',
            ],
            ['`--ngu-input-padding`', '`0.5rem 0.75rem`', 'Padding inside inputs'],
            ['`--ngu-button-padding`', '`0.5rem 1.25rem`', 'Padding inside buttons'],
            ['`--ngu-label-size`', '`0.875rem`', 'Label text size'],
            ['`--ngu-label-color`', '`inherit`', 'Label text color'],
            ['`--ngu-title-size`', '`1rem`', 'Group, list and heading size'],
            ['`--ngu-hint-color`', '`#6b6b6b`', 'Hints, counters, descriptions'],
            ['`--ngu-error-color`', '`#c62828`', 'Error text and invalid borders'],
            ['`--ngu-error-bg`', '`#fdecea`', 'Form-level error box'],
            ['`--ngu-warning-color`', '`#8a5300`', 'Warning text, its icon and border'],
            ['`--ngu-warning-on`', '`#fff`', 'The "!" inside the warning icon'],
            ['`--ngu-success-color`', '`#1e7a3c`', 'Met password rules and a strong meter'],
            [
              '`--ngu-skeleton-color`',
              'a light grey tint',
              'Loading placeholders and the empty meter',
            ],
            ['`--ngu-notice-bg`', 'a light grey tint', 'The "draft restored" notice'],
            ['`--ngu-row-padding`', '`0.75rem`', 'Padding inside list rows'],
            ['`--ngu-textarea-line-height`', '`1.5`', 'Textarea lines, used by autosize'],
            ['`--ngu-actions-justify`', '`flex-start`', 'Submit button alignment'],
            ['`--ngu-rating-color`', '`#b25f00`', 'Filled rating stars'],
            ['`--ngu-switch-off`', '`#767676`', 'A switch that is off'],
            ['`--ngu-tag-bg`', 'a light grey tint', 'Tags'],
            ['`--ngu-surface`', '`#fff`', 'The crop dialog'],
            ['`--ngu-drop-bg`', 'a light blue tint', 'A file drop zone while dragging'],
            ['`--ngu-mono`', '`ui-monospace`', 'One-time code boxes and color values'],
          ],
        },
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
