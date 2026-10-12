import { Directive, inject, input, TemplateRef } from '@angular/core';
import type { Field, FieldState } from '@angular/forms/signals';
import type { LeafDef } from '../types';

/** Template context for `nguField` and `nguControl` templates. */
export interface NguFieldContext {
  /** The field node; bind it with `[formField]`. */
  readonly $implicit: Field<any>;
  readonly field: Field<any>;
  readonly def: LeafDef;
  readonly state: FieldState<any>;
  /** Id used for the label's `for` attribute. */
  readonly id: string;
  /** First error message, when errors should be shown. */
  readonly message: string | undefined;
  readonly showErrors: boolean;
  /** Id of the hint or error text; put it in `aria-describedby` on your control. */
  readonly describedBy: string | undefined;
}

/**
 * Replaces a whole field (label, control and messages) at the given path.
 *
 * ```html
 * <ngu-form [form]="signup">
 *   <ng-template nguField="account.email" let-field let-def="def">
 *     <input [formField]="field" [placeholder]="def.label" />
 *   </ng-template>
 * </ngu-form>
 * ```
 *
 * Array items use `[]`: `nguField="items[].sku"`.
 */
@Directive({ selector: 'ng-template[nguField]' })
export class NguFieldTemplate {
  readonly path = input.required<string>({ alias: 'nguField' });
  readonly template = inject<TemplateRef<NguFieldContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: NguFieldTemplate, ctx: unknown): ctx is NguFieldContext {
    return true;
  }
}

/** Replaces only the control at the given path; label, hint and errors stay. */
@Directive({ selector: 'ng-template[nguControl]' })
export class NguControlTemplate {
  readonly path = input.required<string>({ alias: 'nguControl' });
  readonly template = inject<TemplateRef<NguFieldContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: NguControlTemplate, ctx: unknown): ctx is NguFieldContext {
    return true;
  }
}

/**
 * An icon before the control of the field at the given path, inside its border, such as a
 * search glass. Decorative: it is hidden from screen readers, so the label must still say
 * what the field is. The context is the same as `nguField`'s.
 *
 * ```html
 * <ng-template nguPrefix="query"><svg viewBox="0 0 24 24">…</svg></ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[nguPrefix]' })
export class NguPrefixTemplate {
  readonly path = input.required<string>({ alias: 'nguPrefix' });
  readonly template = inject<TemplateRef<NguFieldContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: NguPrefixTemplate, ctx: unknown): ctx is NguFieldContext {
    return true;
  }
}

/** An icon after the control of the field at the given path; see `nguPrefix`. */
@Directive({ selector: 'ng-template[nguSuffix]' })
export class NguSuffixTemplate {
  readonly path = input.required<string>({ alias: 'nguSuffix' });
  readonly template = inject<TemplateRef<NguFieldContext>>(TemplateRef);

  static ngTemplateContextGuard(_dir: NguSuffixTemplate, ctx: unknown): ctx is NguFieldContext {
    return true;
  }
}
