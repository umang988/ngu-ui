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
            [
              '`layout`',
              "`'steps' | 'tabs' | 'accordion'`",
              'Show the top-level groups and lists as wizard steps, tabs or collapsible panels.',
            ],
            ['`review`', '`boolean | string`', 'Wizard: end with a review step; a string is its title.'],
            ['`stepParam`', '`string`', 'Wizard: keep the current step in this URL query parameter.'],
            ['`disabled`, `readonly`', '`boolean | Signal<boolean> | () => boolean`', 'One switch for every field.'],
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
            ['`layout`', "`'steps' | 'tabs' | 'accordion' | undefined`", 'The layout option.'],
            ['`steps`', '`FormSteps`', 'The wizard; inert without `layout: \'steps\'`.'],
          ],
        },
      },
      {
        id: 'form-steps',
        title: 'FormSteps',
        text: [
          '`def.steps` drives a wizard from your own controls. `<ngu-form>` already renders the step list and the Back and Next buttons.',
        ],
        table: {
          caption: 'FormSteps members',
          columns: ['Member', 'Type', 'Description'],
          rows: [
            ['`keys`', '`Signal<string[]>`', "Steps that are not skipped, in order; `'$review'` last when `review` is on."],
            ['`current`, `index`, `count`', '`Signal`', 'The step on screen and its position.'],
            ['`first`, `last`', '`Signal<boolean>`', 'Whether the current step is the first or the last.'],
            ['`next()`', '`boolean`', "Shows the step's errors; moves on when it is valid."],
            ['`back()`', '`void`', 'The previous step. Values are kept.'],
            ['`goTo(key)`, `canGoTo(key)`', '`boolean`', 'Earlier steps are always open; later ones once the steps before them are valid.'],
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
            ['`order`', '`number`', 'Position in the group, like CSS `order`; default `0`.'],
            ['`display`', '`(value, model) => string`', 'The text for the value in view mode and the review step.'],
            ['`class`', '`string`', 'Classes on the `<ngu-field>`.'],
            ['`classes`', '`NguClassMap`', 'Classes for the class map slots inside this field.'],
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
            ["`layout`", "`'tabs' | 'accordion'`", 'Show child groups and lists as tabs or collapsible panels.'],
            ['`collapsed`', '`boolean`', 'A collapsible panel; `true` starts closed.'],
            ['`class`', '`string`', 'Classes on the `<ngu-group>`.'],
            ['`classes`', '`NguClassMap`', 'Classes for the class map slots of everything inside the group.'],
            ['`span`, `hidden`, `validate`, `order`', '', 'As on fields.'],
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
            ['`reorder`', '`boolean`', 'Move up and Move down buttons, and a drag handle.'],
            ['`duplicate`', '`boolean | string`', 'A button that copies a row; a string is its label.'],
            ['`summary`', '`(item, index) => string`', 'Collapse rows to this line; expand to edit.'],
            ["`layout`", "`'table'`", 'Edit object rows as a table with column headers.'],
            ['`virtual`', '`boolean`', 'Render only the rows in view, in a scrolling box.'],
            [
              '`title`, `description`, `cols`, `span`, `hidden`, `validate`, `order`, `collapsed`, `class`, `classes`',
              '',
              'As on groups; `class` goes on the `<ngu-array>`.',
            ],
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
            ['`order`, `collapsed`, `class`, `classes`', '', 'As on groups; `class` goes on the `<ngu-dynamic>`.'],
            ['`key`', '`string`', 'Per field: the property name.'],
            ['`default`', '`V`', 'Per field: the value when it appears.'],
            ['`class`, `classes`', '`string`, `NguClassMap`', 'Per field: as on static fields.'],
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
            ['`class`', '`string`', 'Classes on the heading, paragraph or divider.'],
            ['`span`, `hidden`, `order`', '', 'As on fields.'],
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
            ["`theme`", "`'default' | 'none'`", "`'default'`", "`'none'` drops ngu-form's CSS. See [Theming](/theming)."],
            ["`density`", "`'compact' | 'normal' | 'spacious'`", "`'normal'`", 'Space between and inside fields.'],
            ["`size`", "`'sm' | 'md' | 'lg'`", "`'md'`", 'Text size of controls, labels and buttons.'],
            [
              '`classes`',
              '`NguClassMap`',
              '',
              'Classes for this form, added to the app-wide class map. See [Tailwind](/tailwind#levels).',
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
      {
        id: 'wizard',
        title: 'Wizard',
        text: [
          "With `layout: 'steps'` the form shows a step list, one step at a time, and Back, Next and submit buttons. Next shows the current step's errors and stays while it is invalid; Enter in a field does the same. A refused submit returns to the first step with problems. See [Steps](/steps).",
        ],
      },
    ],
  },

  'ngu-view': {
    title: '<ngu-view>',
    description: 'Shows a form as label and value pairs, for detail and confirmation pages.',
    sections: [
      {
        id: 'inputs',
        title: 'Inputs',
        table: {
          caption: 'Inputs',
          columns: ['Name', 'Type', 'Default', 'Description'],
          rows: [
            ['`form`', '`FormDef`', '', 'Required. The form to show.'],
            ['`keys`', '`string[]`', '', 'Only these top-level entries, in this order.'],
            ['`section`', '`string`', '', 'One top-level group or list, without its title.'],
            ["`theme`", "`'default' | 'none'`", '', "Defaults to the surrounding form's theme."],
            ['`classes`', '`NguClassMap`', '', 'Classes for this view, added to the class map.'],
          ],
        },
        after: ['Values follow the spec: option labels, locale formats, `display`, and `order`. Hidden fields and captchas are left out. See [View mode](/view-mode).'],
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
              '`provideNguFormConfig({ breakpoints?, confirmLeave?, theme?, density?, size?, classes?, mergeClasses? })`',
              'Responsive breakpoints, the leave dialog, and the look of every form.',
            ],
            ['`provideNguMessages(config | factory)`', 'Texts, `locale` and the `translate` hook.'],
            ['`provideNguFieldTypes({ name: Component | loader })`', 'Custom field types: the control only.'],
            ['`provideNguFieldRenderers({ type: Component | loader })`', 'Whole-field renderers per type.'],
            ['`provideNguIcons({ name: Component })`', 'Icons for `prefixIcon` and `suffixIcon`.'],
            ['`provideNguCaptcha(adapter)`', 'The captcha provider.'],
            ['`provideNguUpload()`', 'File, image and signature types, from `ngu-form/upload`.'],
            ['`provideNguMaterial(options?)`', 'Angular Material renderers, from `ngu-form/material`.'],
            ['`provideNguPrimeNG()`', 'PrimeNG renderers, from `ngu-form/primeng`.'],
            ['`provideNguDropdown()`', 'The server dropdown type, from `ngu-form/dropdown`.'],
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
            ['`injectNguLook()`', 'The theme, density, size and class map, for custom renderers.'],
            ['`nguTailwind`', 'A complete Tailwind 4 class map, from `ngu-form/tailwind`.'],
            ['`nguBind`', 'Binds a `ControlValueAccessor` to a field without `[formField]`.'],
            ['`NGU_TOKENS`', 'Every CSS custom property, with its default and use.'],
            ['`debugRows(form)`', 'Every field with its path, state and errors, from `ngu-form/debug`.'],
            ['`formatMessage(template, params, locale)`', 'Fills an ICU template.'],
          ],
        },
      },
    ],
  },
};
