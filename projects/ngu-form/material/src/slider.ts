import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import type { NguFieldRenderContext } from 'ngu-form';
import { NguMatSubscript, subscriptId } from './messages';
import { SUBSCRIPT_STYLES } from './shared';

/** Sliders (`type: 'range'`) as `mat-slider`, with the value shown next to the label. */
@Component({
  selector: 'ngu-mat-slider',
  imports: [FormField, MatSlider, MatSliderThumb, NguMatSubscript],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @let d = c.def;
    <span class="ngu-mat-slider-head">
      @if (c.label) {
        <label class="ngu-mat-legend ngu-label" [for]="c.id">{{ c.label }}</label>
      }
      <output class="ngu-mat-slider-value" [attr.for]="c.id" aria-hidden="true">{{ shown() }}</output>
    </span>
    <mat-slider [min]="bound(d.min, 0)" [max]="bound(d.max, 100)" [step]="d.step ?? 1" discrete [displayWith]="display">
      <input matSliderThumb [formField]="c.field" [id]="c.id" [attr.aria-describedby]="describedBy()" [attr.aria-valuetext]="shown()" />
    </mat-slider>
    <ngu-mat-subscript [context]="c" />
  `,
  styles: `
    ${SUBSCRIPT_STYLES}
    .ngu-mat-slider-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
    .ngu-mat-slider-value {
      font: var(--mat-sys-body-medium);
      font-variant-numeric: tabular-nums;
    }
    mat-slider {
      inline-size: 100%;
      margin-inline: 0;
    }
  `,
})
export class NguMatSlider {
  /** The field's render context: texts, state and options, from ngu-form. */
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly describedBy = computed(() => subscriptId(this.context()));
  /** "40 kg", "₹ 1,200": the value with its prefix and suffix. */
  protected readonly shown = computed(() => {
    const c = this.context();
    const value = c.state.value();
    const text = typeof value === 'number' && !Number.isNaN(value) ? c.i18n.number(value) : '';
    return [c.prefix, text, c.suffix].filter(Boolean).join(' ');
  });
  protected readonly display = (value: number) => this.context().i18n.number(value);

  protected bound(value: unknown, fallback: number): number {
    return typeof value === 'number' ? value : fallback;
  }
}
