import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Field, ValidationError } from '@angular/forms/signals';
import { injectNguI18n, isLeafDef, type AnyFieldDef, type FormDef, type FormDefinition, type LeafDef } from 'ngu-form';

/** One field, group or list in the debug panel, with its state. */
export interface NguDebugRow {
  /** Model path, with numbers for list rows: `items.0.sku`. */
  readonly path: string;
  readonly kind: 'field' | 'group' | 'list';
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly hidden: boolean;
  readonly pending: boolean;
  /** Its own errors, as `kind: message`. */
  readonly errors: readonly string[];
}

/**
 * Walks a form along its definition and lists every field, group and list with its state.
 * `<ngu-form-debug>` renders this; tests and tools can use it directly.
 */
export function debugRows(form: FormDef<any, any>, message: (error: ValidationError, def: LeafDef | undefined) => string = plain): NguDebugRow[] {
  const rows: NguDebugRow[] = [];
  const visit = (def: AnyFieldDef, node: Field<any>, path: string) => {
    if (def.__ngu === 'static') {
      return;
    }
    const state = node();
    const leaf = def.__ngu === 'leaf' ? def : undefined;
    rows.push({
      path,
      kind: def.__ngu === 'leaf' ? 'field' : def.__ngu === 'array' ? 'list' : 'group',
      dirty: state.dirty(),
      touched: state.touched(),
      hidden: state.hidden(),
      pending: state.pending(),
      errors: state.errors().map((e) => `${e.kind}: ${message(e, leaf)}`),
    });
    const children = node as unknown as Record<string, Field<any>>;
    switch (def.__ngu) {
      case 'group':
        walk(def.fields, node, path);
        break;
      case 'array': {
        const items = state.value() as readonly unknown[];
        items.forEach((_, i) => {
          const item = children[i];
          if (isLeafDef(def.item)) {
            visit(def.item, item, `${path}.${i}`);
          } else {
            visit({ __ngu: 'group', fields: def.item }, item, `${path}.${i}`);
          }
        });
        break;
      }
      case 'dynamic':
        for (const [key, entry] of def.entries()) {
          if (children[key]) {
            visit(entry.leaf, children[key], `${path}.${key}`);
          }
        }
        break;
    }
  };
  const walk = (fields: FormDefinition, node: Field<any>, base: string) => {
    const children = node as unknown as Record<string, Field<any>>;
    for (const [key, def] of Object.entries(fields)) {
      if (def.__ngu !== 'static' && children[key]) {
        visit(def, children[key], base ? `${base}.${key}` : key);
      }
    }
  };
  walk(form.fields, form.tree as unknown as Field<any>, '');
  return rows;
}

function plain(error: ValidationError): string {
  return error.message ?? error.kind;
}

/** JSON for the panel: dates as ISO strings, files by name and size, signals unwrapped. */
function show(value: unknown): string {
  return JSON.stringify(
    value,
    function (this: Record<string, unknown>, key, v) {
      const raw = key ? this[key] : v;
      if (raw instanceof Date) {
        return Number.isNaN(raw.getTime()) ? 'Invalid Date' : raw.toISOString();
      }
      if (typeof File !== 'undefined' && raw instanceof File) {
        return `File(${raw.name}, ${raw.size} bytes)`;
      }
      return v;
    },
    2,
  );
}

/**
 * Shows a form's model, state, unsaved changes and every error by path, for development.
 * Import it from `ngu-form/debug`, so production bundles never include it.
 *
 * ```html
 * <ngu-form [form]="signup" />
 * <ngu-form-debug [form]="signup" />
 * ```
 */
@Component({
  selector: 'ngu-form-debug',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-form-debug' },
  template: `
    @let f = form();
    <details [open]="open()">
      <summary>{{ title() }}</summary>
      <ul class="ngu-debug__flags" aria-label="Form state">
        @for (flag of flags(); track flag.name) {
          <li class="ngu-debug__flag" [class.ngu-debug__flag--on]="flag.on">{{ flag.name }}: {{ flag.on ? 'yes' : 'no' }}</li>
        }
      </ul>
      <div class="ngu-debug__grid">
        <section>
          <h3>Value</h3>
          <pre tabindex="0" aria-label="Value">{{ value() }}</pre>
        </section>
        <section>
          <h3>Changes since saved</h3>
          <pre tabindex="0" aria-label="Changes since saved">{{ changes() }}</pre>
        </section>
      </div>
      <section>
        <h3>Errors ({{ errorRows().length }})</h3>
        @if (errorRows().length) {
          <table>
            <thead>
              <tr><th scope="col">Path</th><th scope="col">Errors</th><th scope="col">State</th></tr>
            </thead>
            <tbody>
              @for (row of errorRows(); track row.path) {
                <tr>
                  <td><code>{{ row.path }}</code></td>
                  <td>{{ row.errors.join('; ') }}</td>
                  <td>{{ stateOf(row) }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p>None.</p>
        }
      </section>
      <section>
        <h3>Changed fields</h3>
        @if (dirtyPaths().length) {
          <p>
            @for (path of dirtyPaths(); track path; let last = $last) {
              <code>{{ path }}</code>@if (!last) {, }
            }
          </p>
        } @else {
          <p>None.</p>
        }
      </section>
      @if (f.history.canUndo() || f.history.canRedo() || f.draft.savedAt()) {
        <p class="ngu-debug__note">
          @if (f.draft.savedAt(); as at) {Draft saved {{ at.toLocaleTimeString() }}. }
          Undo: {{ f.history.canUndo() ? 'yes' : 'no' }}, redo: {{ f.history.canRedo() ? 'yes' : 'no' }}.
        </p>
      }
    </details>
  `,
  styles: `
    :host {
      display: block;
      font: 0.8125rem/1.5 var(--ngu-mono, ui-monospace, monospace);
      border: 1px dashed var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      padding: 0.5rem 0.75rem;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    h3 {
      margin: 0.75rem 0 0.25rem;
      font-size: inherit;
    }
    pre {
      margin: 0;
      max-block-size: 16rem;
      overflow: auto;
      padding: 0.5rem;
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-readonly-bg, rgba(127, 127, 127, 0.08));
    }
    pre:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
    }
    .ngu-debug__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
      gap: 0 1rem;
    }
    .ngu-debug__flags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      margin: 0.5rem 0 0;
      padding: 0;
      list-style: none;
    }
    .ngu-debug__flag {
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-debug__flag--on {
      color: inherit;
      font-weight: 600;
    }
    table {
      border-collapse: collapse;
      inline-size: 100%;
    }
    th,
    td {
      text-align: start;
      vertical-align: top;
      padding: 0.25rem 0.5rem 0.25rem 0;
      border-block-end: 1px solid var(--ngu-border-color, #c7c7c7);
    }
    p {
      margin: 0;
    }
    .ngu-debug__note {
      margin-block-start: 0.75rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
  `,
})
export class NguFormDebug {
  readonly form = input.required<FormDef<any, any>>();
  /** Start expanded. Default `true`. */
  readonly open = input(true);
  /** The summary line. Default "ngu-form debug". */
  readonly title = input('ngu-form debug');

  private readonly i18n = injectNguI18n();

  protected readonly flags = computed(() => {
    const f = this.form();
    return [
      { name: 'valid', on: f.valid() },
      { name: 'dirty', on: f.dirty() },
      { name: 'touched', on: f.touched() },
      { name: 'pending', on: f.pending() },
      { name: 'submitting', on: f.submitting() },
      { name: 'loading', on: f.loading() },
    ];
  });
  protected readonly value = computed(() => show(this.form().value()));
  protected readonly changes = computed(() => show(this.form().changes()));
  private readonly rows = computed(() =>
    debugRows(this.form(), (error, def) => (def ? this.i18n.error(error, def) : (error.message ?? error.kind))),
  );
  protected readonly errorRows = computed(() => this.rows().filter((r) => r.errors.length));
  protected readonly dirtyPaths = computed(() => this.rows().filter((r) => r.kind === 'field' && r.dirty).map((r) => r.path));

  protected stateOf(row: NguDebugRow): string {
    return [row.touched ? 'touched' : '', row.dirty ? 'dirty' : '', row.hidden ? 'hidden' : '', row.pending ? 'pending' : '']
      .filter(Boolean)
      .join(', ') || '—';
  }
}
