import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import type { DynamicDef, FormDefinition, LeafDef } from '../types';
import { NguGroup } from './ngu-group';
import { extendLook, injectOuterLook, NGU_LOOK } from '../look';

/**
 * Renders a run-time field list. Fields appear in list order once the model holds a value
 * for them; hiding, validation and overrides work as for static fields.
 */
@Component({
  selector: 'ngu-dynamic',
  providers: [{ provide: NGU_LOOK, useFactory: () => inject(NguDynamic).look }],
  imports: [forwardRef(() => NguGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ngu-unstyled]': "look().theme === 'none'",
    class: 'ngu-dynamic',
    '[class]': "def().class ?? ''",
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
    :host(:not(.ngu-unstyled)) {
      display: block;
      min-inline-size: 0;
    }
  `,
})
export class NguDynamic {
  /** The run-time field list's definition. Set by ngu-form; apps rarely need it. */
  readonly def = input.required<DynamicDef>();
  private readonly outerLook = injectOuterLook();
  /** The look around this field list with the `classes` of its spec. */
  readonly look = computed(() => extendLook(this.outerLook(), this.def().classes));
  /** The field node of the object that holds the run-time fields. Set by ngu-form; apps rarely need it. */
  readonly tree = input.required<Field<any>>();
  /** Dot path of this field list inside the form, for template overrides. */
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
