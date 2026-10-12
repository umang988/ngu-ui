import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NguBind, type NguFieldRenderContext } from 'ngu-form';
import { InputNumber } from 'primeng/inputnumber';
import { messageId, NguPrimeFrame } from './frame';

/** Numbers and amounts with `p-inputnumber`, formatted for the form's locale. */
@Component({
  selector: 'ngu-prime-number',
  imports: [NguBind, NguPrimeFrame, InputNumber],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @let d = c.def;
    @let f = fractions();
    <ngu-prime-frame [context]="c">
      <p-inputnumber
        [nguBind]="c.field"
        [inputId]="c.id"
        [mode]="d.type === 'currency' && d.currency ? 'currency' : 'decimal'"
        [currency]="d.currency"
        [locale]="c.i18n.locale()"
        [minFractionDigits]="f.min"
        [maxFractionDigits]="f.max"
        [useGrouping]="d.type === 'currency' || !!d.localized"
        [min]="bound(d.min)"
        [max]="bound(d.max)"
        [step]="d.step ?? 1"
        [prefix]="c.prefix ? c.prefix + ' ' : undefined"
        [suffix]="c.suffix ? ' ' + c.suffix : undefined"
        [placeholder]="c.placeholder"
        [invalid]="c.showErrors"
        [required]="c.required"
        [ariaLabelledBy]="c.label ? c.id + '-label' : undefined"
        [ariaDescribedBy]="describedBy() ?? undefined"
        [fluid]="true"
      />
    </ngu-prime-frame>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class NguPrimeNumber {
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly describedBy = computed(() => messageId(this.context()));

  /** Fraction digits: two for amounts, the `localized` options when set, else as typed. */
  protected readonly fractions = computed(() => {
    const d = this.context().def;
    if (d.type === 'currency') {
      return { min: 2, max: 2 };
    }
    const options = typeof d.localized === 'object' ? d.localized : {};
    const stepDigits = d.step != null && !Number.isInteger(d.step) ? String(d.step).split('.')[1]?.length ?? 0 : 0;
    return {
      min: options.minimumFractionDigits ?? 0,
      max: options.maximumFractionDigits ?? Math.max(stepDigits, d.localized ? 3 : 10),
    };
  });

  protected bound(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }
}
