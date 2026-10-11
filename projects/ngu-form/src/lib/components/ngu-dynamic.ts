import { ChangeDetectionStrategy, Component, computed, forwardRef, input } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import type { DynamicDef, FormDefinition, LeafDef } from '../types';
import { NguGroup } from './ngu-group';

/**
 * Renders a run-time field list. Fields appear in list order once the model holds a value
 * for them; hiding, validation and overrides work as for static fields.
 */
@Component({
  selector: 'ngu-dynamic',
  imports: [forwardRef(() => NguGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngu-dynamic',
  },
  template: `
    @let d = def();
    <ngu-group
      [fields]="fields()"
      [tree]="tree()"
      [cols]="d.cols"
      [title]="d.title"
      [description]="d.description"
      [path]="path()"
    />
  `,
  styles: `
    :host {
      display: block;
      min-inline-size: 0;
    }
  `,
})
export class NguDynamic {
  readonly def = input.required<DynamicDef>();
  readonly tree = input.required<Field<any>>();
  readonly path = input<string>('');

  /** Keys currently in the model; recomputes only when keys change, not on every keystroke. */
  private readonly keys = computed(
    () => new Set(Object.keys((this.tree()().value() as object | null) ?? {})),
    { equal: (a, b) => a.size === b.size && [...a].every((k) => b.has(k)) },
  );

  protected readonly fields = computed<FormDefinition>(() => {
    const present = this.keys();
    const out: Record<string, LeafDef> = {};
    for (const [key, entry] of this.def().entries()) {
      if (present.has(key)) {
        out[key] = entry.leaf;
      }
    }
    return out;
  });
}
