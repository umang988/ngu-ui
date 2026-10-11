import { Directive, TemplateRef, inject } from '@angular/core';
import type { NguDropdownOptionContext, NguDropdownSelectionContext } from './types';

/**
 * Renders one option: `<ng-template nguDropdownOption let-row let-selected="selected">`.
 *
 * Each row sits in a slot `optionHeight` tall, because the virtual scroller positions rows
 * by `optionHeight × index`. Content taller than that is clipped; raise `[optionHeight]` for
 * two-line rows.
 */
@Directive({ selector: '[nguDropdownOption]' })
export class NguDropdownOption<T = any> {
  readonly template = inject<TemplateRef<NguDropdownOptionContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: NguDropdownOption<T>,
    _ctx: unknown,
  ): _ctx is NguDropdownOptionContext<T> {
    return true;
  }
}

/**
 * Renders the closed control's value: `<ng-template nguDropdownSelection let-row>`. Single
 * selection only; with `multiple` the control shows chips.
 */
@Directive({ selector: '[nguDropdownSelection]' })
export class NguDropdownSelection<T = any> {
  readonly template = inject<TemplateRef<NguDropdownSelectionContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _dir: NguDropdownSelection<T>,
    _ctx: unknown,
  ): _ctx is NguDropdownSelectionContext<T> {
    return true;
  }
}
