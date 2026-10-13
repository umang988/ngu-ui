import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NguBind, type NguFieldRenderContext } from 'ngu-form';
import { DatePicker } from 'primeng/datepicker';
import { Rating } from 'primeng/rating';
import { Slider } from 'primeng/slider';
import { fromLocal, toLocal } from './dates';
import { NguPrimeFrame } from './frame';

/** Sliders with `p-slider`, the value shown next to the label. */
@Component({
  selector: 'ngu-prime-slider',
  imports: [NguBind, NguPrimeFrame, Slider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @let d = c.def;
    <ngu-prime-frame [context]="c" [group]="true">
      <output class="ngu-prime-value" aria-hidden="true">{{ shown() }}</output>
      <p-slider
        [nguBind]="c.field"
        [min]="bound(d.min, 0)"
        [max]="bound(d.max, 100)"
        [step]="d.step ?? 1"
        [ariaLabelledBy]="c.label ? c.id + '-label' : undefined"
        [tabindex]="0"
      />
    </ngu-prime-frame>
  `,
  styles: `
    :host {
      display: block;
    }
    .ngu-prime-value {
      align-self: flex-end;
      margin-block-start: -1.75rem;
      font-variant-numeric: tabular-nums;
    }
    p-slider {
      margin-block: 0.5rem;
    }
  `,
})
export class NguPrimeSlider {
  /** The field's render context: texts, state and options, from ngu-form. */
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly shown = computed(() => {
    const c = this.context();
    const value = c.state.value();
    return [c.prefix, typeof value === 'number' ? c.i18n.number(value) : '', c.suffix].filter(Boolean).join(' ');
  });
  protected bound(value: unknown, fallback: number): number {
    return typeof value === 'number' ? value : fallback;
  }
}

/**
 * Dates and `{ from, to }` ranges with `p-datepicker`. The model keeps ngu-form's shape: a
 * `Date` at midnight UTC, or ISO strings when the model holds strings.
 */
@Component({
  selector: 'ngu-prime-date',
  imports: [NguBind, NguPrimeFrame, DatePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    <ngu-prime-frame [context]="c">
      <p-datepicker
        [nguBind]="c.field"
        [nguBindFormat]="format"
        [nguBindParse]="parse"
        [selectionMode]="range() ? 'range' : 'single'"
        [inputId]="c.id"
        [placeholder]="c.placeholder"
        [minDate]="min()"
        [maxDate]="max()"
        [showIcon]="true"
        iconDisplay="input"
        [invalid]="c.showErrors"
        [required]="c.required"
        [ariaLabelledBy]="c.label ? c.id + '-label' : undefined"
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
export class NguPrimeDate {
  /** The field's render context: texts, state and options, from ngu-form. */
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly range = computed(() => this.context().def.type === 'daterange');
  protected readonly min = computed(() => toLocal(this.context().def.min));
  protected readonly max = computed(() => toLocal(this.context().def.max));

  protected readonly format = (value: unknown): Date | (Date | null)[] | null => {
    if (!this.range()) {
      return toLocal(value);
    }
    const r = (value ?? {}) as { from?: unknown; to?: unknown };
    return [toLocal(r.from), toLocal(r.to)];
  };
  protected readonly parse = (picked: unknown): unknown => {
    const current = this.context().state.value();
    if (!this.range()) {
      return fromLocal(picked, typeof current === 'string');
    }
    const r = (current ?? {}) as { from?: unknown; to?: unknown };
    const asString = typeof r.from === 'string' || typeof r.to === 'string';
    const [from, to] = Array.isArray(picked) ? picked : [null, null];
    return { ...r, from: fromLocal(from, asString), to: fromLocal(to, asString) };
  };
}

/** Ratings with `p-rating`; `max` is the number of stars. */
@Component({
  selector: 'ngu-prime-rating',
  imports: [NguBind, NguPrimeFrame, Rating],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    <ngu-prime-frame [context]="c" [group]="true">
      <p-rating [nguBind]="c.field" [stars]="stars()" [attr.aria-labelledby]="c.label ? c.id + '-label' : null" />
    </ngu-prime-frame>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class NguPrimeRating {
  /** The field's render context: texts, state and options, from ngu-form. */
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly stars = computed(() => {
    const max = this.context().def.max;
    return typeof max === 'number' && max > 0 ? Math.round(max) : 5;
  });
}
