import type { DocPage } from 'docs-kit/docs/model';

export const PAGES: Record<string, DocPage> = {
  'define-form': {
    title: 'defineForm',
    description:
      'Creates a form from an initial value (or a `WritableSignal`) and a spec that mirrors it.',
    sections: [
      {
        id: 'signature',
        title: 'Signature',
        code: [
          {
            code: `function defineForm<TModel extends object, TPayload = TModel>(
  modelOrInitial: WritableSignal<TModel> | TModel,
  spec: FormSpec<TModel>,
  options?: FormDefOptions<TModel, TPayload>,
): FormDef<TModel, TPayload>;`,
          },
        ],
        text: ['Call it where `inject()` works, or pass `options.injector`.'],
      },
      {
        id: 'options',
        title: 'Options',
        table: {
          caption: 'defineForm options',
          columns: ['Name', 'Type', 'Description'],
          rows: [
            ['`cols`', '`number | { base?, sm?, md?, lg? }`', 'Grid columns at the root.'],
            ['`omitHidden`', '`boolean`', 'Leave hidden fields out of the payload.'],
            [
              '`mapValue`',
              '`(model) => TPayload`',
              'Shapes what `(submitted)` and the action receive.',
            ],
            [
              '`schema`',
              '`StandardSchemaV1`',
              'A Zod, Valibot or ArkType schema for the whole model.',
            ],
            [
              '`load`',
              '`FormLoader<TModel>`',
              'A `resource` or `httpResource` with the initial data.',
            ],
            ['`draft`', '`{ key, storage?, debounce? }`', 'Save unsent changes and restore them.'],
            ['`history`', '`boolean | { limit? }`', 'Keep an undo history.'],
            ['`injector`', '`Injector`', 'For calls outside an injection context.'],
          ],
        },
      },
      {
        id: 'form-def',
        title: 'FormDef',
        text: ['What `defineForm` returns.'],
        table: {
          caption: 'FormDef members',
          columns: ['Member', 'Type', 'Description'],
          rows: [
            ['`model`', '`WritableSignal<TModel>`', 'The model.'],
            ['`value`', '`Signal<TModel>`', 'A read-only view of the model.'],
            ['`payload`', '`Signal<TPayload>`', 'The value after `omitHidden` and `mapValue`.'],
            ['`tree`', '`FieldTree<TModel>`', 'The Signal Forms field tree.'],
            [
              '`dirty`, `touched`, `valid`, `pending`, `submitting`',
              '`Signal<boolean>`',
              'Form state.',
            ],
            [
              '`changes`',
              '`Signal<DeepPartial<TModel>>`',
              'Values that differ from the last saved state.',
            ],
            ['`reset(value?)`', '`void`', 'Back to the initial value, or to `value`.'],
            ['`patch(partial)`', '`void`', 'Deep-merges into the model.'],
            ['`loading`, `loadError`', '`Signal`', 'State of `load`.'],
            ['`draft`', '`FormDraft`', '`restoredAt`, `savedAt`, `discard()`.'],
            ['`history`', '`FormHistory`', '`canUndo`, `canRedo`, `undo()`, `redo()`, `clear()`.'],
          ],
        },
      },
    ],
  },

  spec: {
    title: 'Spec options',
    description:
      "Everything a field, group, list or run-time field can take. Field types add their own; see each type's API tab.",
    sections: [
      {
        id: 'field',
        title: 'Every field',
        table: {
          caption: 'Options every field takes',
          columns: ['Name', 'Type', 'Description'],
          rows: [
            ['`label`', '`string`', 'The label; a translation key when `translate` is set.'],
            ['`type`', '`string`', 'The input; inferred from the value when left out.'],
            ['`placeholder`, `hint`', '`string`', 'Texts in and under the control.'],
            [
              '`required`',
              '`boolean | string | (model, scope) => boolean | string`',
              'A string is the message.',
            ],
            ['`hidden`', '`(model, scope) => boolean`', 'Hidden fields are not validated.'],
            ['`disabled`, `readonly`', '`boolean | (model, scope) => boolean`', 'States.'],
            [
              '`validate`',
              '`Validator | Validator[]`',
              '`(value, model, scope) => message | { kind, message } | undefined`',
            ],
            ['`validateAsync`', '`(value, model, scope, abort) => Promise<…>`', 'A server check.'],
            ['`debounce`', '`number`', 'Delay before typing reaches the model and validators.'],
            ['`warn`', '`Validator | Validator[]`', 'Non-blocking messages.'],
            ['`errorsOn`', "`'dirty' | 'touched' | 'submit'`", 'When this field shows errors.'],
            ['`compute`', '`(model, scope) => V`', 'A read-only, derived value.'],
            [
              '`onChange`',
              '`(value, ctx) => void`',
              "Runs after the user's own change; `ctx.patch`, `ctx.patchItem`.",
            ],
            ['`options`', '`Choice[] | Signal | (model, scope) => Choice[]`', 'For choice types.'],
            ['`span`', '`number`', 'Grid columns this field takes.'],
            [
              '`autocomplete`, `inputmode`, `enterkeyhint`',
              '`string`',
              'Browser and keyboard hints.',
            ],
            ['`persist`', '`boolean`', '`false` keeps the field out of drafts.'],
          ],
        },
      },
      {
        id: 'group',
        title: 'Groups',
        table: {
          caption: 'Group options',
          columns: ['Name', 'Type', 'Description'],
          rows: [
            ['`fields`', '`FormSpec`', "The group's fields."],
            [
              '`title`, `description`',
              '`string`',
              'Shown above the fields; a titled group is a named group.',
            ],
            ['`cols`', '`number | { base?, sm?, md?, lg? }`', 'Grid columns.'],
            ['`span`, `hidden`, `validate`', '', 'As on fields.'],
          ],
        },
      },
      {
        id: 'list',
        title: 'Lists',
        table: {
          caption: 'List options',
          columns: ['Name', 'Type', 'Description'],
          rows: [
            [
              '`item`',
              '`FormSpec | FieldSpec`',
              'One row: a field map, or a field spec for primitives.',
            ],
            ['`newItem`', '`T | () => T`', 'The value of a new row.'],
            ['`min`, `max`', '`number`', 'Row limits.'],
            ['`addLabel`, `removeLabel`', '`string`', "`''` hides the button."],
            ['`title`, `description`, `cols`, `span`, `hidden`, `validate`', '', 'As on groups.'],
          ],
        },
      },
      {
        id: 'dynamic',
        title: 'Run-time fields',
        table: {
          caption: 'Run-time field options',
          columns: ['Name', 'Type', 'Description'],
          rows: [
            ['`fields`', '`DynamicField[] | Signal<DynamicField[]>`', 'The list, as JSON.'],
            ['`keepRemoved`', '`boolean`', 'Keep values of fields that leave the list.'],
            ['`key`', '`string`', 'Per field: the property name.'],
            ['`default`', '`V`', 'Per field: the value when it appears.'],
            [
              '`showIf`',
              '`{ key, equals?, notEquals?, in? }`',
              'Per field: a JSON condition on a sibling.',
            ],
          ],
        },
      },
      {
        id: 'static',
        title: 'Static content',
        table: {
          caption: 'Static content under $ keys',
          columns: ['Name', 'Type', 'Description'],
          rows: [
            ['`heading`', '`string`', 'With `level` 2 to 6, default 3.'],
            ['`text`', '`string`', 'A paragraph.'],
            ['`divider`', '`true`', 'A rule.'],
          ],
        },
      },
    ],
  },

  'ngu-form': {
    title: '<ngu-form>',
    description:
      'Renders a form definition with its submit button, form-level messages and focus handling.',
    sections: [
      {
        id: 'inputs',
        title: 'Inputs',
        table: {
          caption: 'Inputs',
          columns: ['Name', 'Type', 'Default', 'Description'],
          rows: [
            ['`form`', '`FormDef`', '', 'Required. The form to render.'],
            ['`submitLabel`', '`string`', '', 'Shows a submit button with this text.'],
            [
              '`action`',
              '`SubmitAction<T>`',
              '',
              'Runs on a valid submit; returns errors or nothing.',
            ],
            [
              '`errorsOn`',
              "`'dirty' | 'touched' | 'submit'`",
              "`'dirty'`",
              'When fields show errors.',
            ],
            [
              '`errorSummary`',
              '`boolean`',
              '`false`',
              'List every problem at the top after a refused submit.',
            ],
            [
              '`focusOnInvalid`',
              '`boolean`',
              '`true`',
              'Focus the first problem after a refused submit.',
            ],
            [
              '`warnOnUnload`',
              '`boolean`',
              '`false`',
              'Warn when the tab closes with unsaved changes.',
            ],
            ['`failureText`', '`string`', '', 'Message when the action throws.'],
            [
              '`invalidAnnouncement`',
              '`(count) => string`',
              '',
              'The announcement after a refused submit.',
            ],
          ],
        },
      },
      {
        id: 'outputs',
        title: 'Outputs',
        table: {
          caption: 'Outputs',
          columns: ['Name', 'Type', 'Description'],
          rows: [
            ['`submitted`', '`TPayload`', 'After a successful submit.'],
            ['`invalidSubmit`', '`void`', 'When a submit was refused.'],
          ],
        },
      },
      {
        id: 'templates',
        title: 'Templates',
        table: {
          caption: 'Override directives',
          columns: ['Directive', 'Description'],
          rows: [
            [
              '`ng-template nguField="path"`',
              'Replaces the whole field. See [Overrides](/overrides).',
            ],
            ['`ng-template nguControl="path"`', 'Replaces only the control.'],
          ],
        },
      },
    ],
  },

  providers: {
    title: 'Providers and helpers',
    description: 'Functions for app setup, routing and translation.',
    sections: [
      {
        id: 'providers',
        title: 'Providers',
        table: {
          caption: 'Providers',
          columns: ['Function', 'Description'],
          rows: [
            [
              '`provideNguFormConfig({ breakpoints?, confirmLeave? })`',
              'Responsive breakpoints and the leave dialog.',
            ],
            ['`provideNguMessages(config | factory)`', 'Texts, `locale` and the `translate` hook.'],
            ['`provideNguFieldTypes({ name: Component })`', 'Custom field types.'],
            ['`provideNguCaptcha(adapter)`', 'The captcha provider.'],
            ['`provideNguUpload()`', 'File, image and signature types, from `ngu-form/upload`.'],
          ],
        },
      },
      {
        id: 'helpers',
        title: 'Helpers',
        table: {
          caption: 'Helpers',
          columns: ['Function', 'Description'],
          rows: [
            ['`nguUnsavedChangesGuard`', 'A `canDeactivate` guard for routes with forms.'],
            ['`hasUnsavedChanges(form)`', 'True when a form has unsaved changes.'],
            ['`nguIndexedDbDrafts()`', 'IndexedDB storage for drafts.'],
            ['`nguTurnstile`, `nguHCaptcha`, `nguRecaptcha`', 'Captcha adapters.'],
            ['`injectNguI18n()`', 'Messages and translation, for custom renderers.'],
            ['`formatMessage(template, params, locale)`', 'Fills an ICU template.'],
          ],
        },
      },
    ],
  },
};
