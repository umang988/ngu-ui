import { computed, Directive, inject, input, output, type Signal } from '@angular/core';

/**
 * Marks a part of the form that can be out of view: a wizard step, a tab panel, an accordion
 * panel or a collapsed row. Fields inside read it to know whether they are shown and whether
 * their errors are due, and the error summary uses `reveal()` before focusing them.
 */
@Directive({
  selector: '[nguSection]',
})
export class NguSection {
  /** Whether this part is on screen, ignoring the parts around it. */
  readonly open = input(true, { alias: 'nguSectionOpen' });
  /** Whether Next was pressed on this part, so its errors show. */
  readonly tried = input(false, { alias: 'nguSectionTried' });
  /** Asks the owner to show this part. */
  readonly revealRequest = output<void>({ alias: 'nguSectionReveal' });

  private readonly parent = inject(NguSection, { optional: true, skipSelf: true });

  /** True when this part and every part around it are on screen. */
  readonly shown: Signal<boolean> = computed((): boolean => this.open() && (this.parent?.shown() ?? true));
  readonly attempted: Signal<boolean> = computed((): boolean => this.tried() || (this.parent?.attempted() ?? false));

  /** Opens this part and the parts around it. */
  reveal(): void {
    this.parent?.reveal();
    if (!this.open()) {
      this.revealRequest.emit();
    }
  }
}
