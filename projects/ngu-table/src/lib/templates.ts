import { Directive, TemplateRef, inject, input } from '@angular/core';
import type { NguTableCellContext, NguTableRowContext } from './types';

/**
 * Draws one column's cells, for a column with `template: true`:
 *
 * ```html
 * <ng-template nguTableCell="status" let-value let-row="row">…</ng-template>
 * ```
 *
 * A directive rather than a `{ status: template }` map, so the compiler checks the context.
 */
@Directive({ selector: '[nguTableCell]' })
export class NguTableCell<T = any> {
  /** The `field` of the column this template draws. */
  readonly nguTableCell = input.required<string>();

  /** The template itself. */
  readonly template = inject<TemplateRef<NguTableCellContext<T>>>(TemplateRef);

  /** Types the template's variables as `NguTableCellContext` for the type checker. */
  static ngTemplateContextGuard<T>(
    _dir: NguTableCell<T>,
    _ctx: unknown,
  ): _ctx is NguTableCellContext<T> {
    return true;
  }
}

/**
 * Extra buttons in each row, after view, edit and delete:
 *
 * ```html
 * <ng-template nguTableRowActions let-row>…</ng-template>
 * ```
 */
@Directive({ selector: '[nguTableRowActions]' })
export class NguTableRowActions<T = any> {
  /** The template itself. */
  readonly template = inject<TemplateRef<NguTableRowContext<T>>>(TemplateRef);

  /** Types the template's variables as `NguTableRowContext` for the type checker. */
  static ngTemplateContextGuard<T>(
    _dir: NguTableRowActions<T>,
    _ctx: unknown,
  ): _ctx is NguTableRowContext<T> {
    return true;
  }
}

/**
 * Replaces the notice shown when there are no rows (not the error notice):
 *
 * ```html
 * <ng-template nguTableEmpty>No orders yet. <a routerLink="new">Create one</a></ng-template>
 * ```
 */
@Directive({ selector: '[nguTableEmpty]' })
export class NguTableEmpty {
  /** The template itself. */
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}
