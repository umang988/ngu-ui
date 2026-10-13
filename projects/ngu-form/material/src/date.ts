import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
  MatDateRangeInput,
  MatDateRangePicker,
  MatEndDate,
  MatStartDate,
} from '@angular/material/datepicker';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type { NguFieldRenderContext } from 'ngu-form';
import { errorMatcher, fromPicker, NGU_MATERIAL_OPTIONS, toPicker } from './shared';

/**
 * Date fields with Material's datepicker. The model keeps ngu-form's shape: a `Date` at
 * midnight UTC, or an ISO date string when the model holds strings.
 */
@Component({
  selector: 'ngu-mat-date',
  imports: [MatFormField, MatLabel, MatHint, MatError, MatSuffix, MatInput, MatDatepicker, MatDatepickerInput, MatDatepickerToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    <mat-form-field [appearance]="options.appearance!" [floatLabel]="options.floatLabel!" [subscriptSizing]="options.subscriptSizing!">
      @if (c.label) {
        <mat-label class="ngu-label">{{ c.label }}</mat-label>
      }
      <input
        matInput
        [matDatepicker]="picker"
        [id]="c.id"
        [value]="value()"
        [min]="min()"
        [max]="max()"
        [placeholder]="c.placeholder"
        [required]="c.required"
        [disabled]="c.state.disabled()"
        [readonly]="c.state.readonly()"
        [errorStateMatcher]="matcher"
        (dateChange)="write($event.value)"
        (blur)="c.touch()"
      />
      <mat-datepicker-toggle matSuffix [for]="picker" />
      <mat-datepicker #picker (closed)="c.touch()" />
      @if (c.error) {
        <mat-error class="ngu-error">{{ c.error }}</mat-error>
      } @else if (c.hint) {
        <mat-hint class="ngu-hint">{{ c.hint }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-form-field {
      inline-size: 100%;
    }
  `,
})
export class NguMatDate<D = unknown> {
  /** The field's render context: texts, state and options, from ngu-form. */
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly options = inject(NGU_MATERIAL_OPTIONS);
  protected readonly matcher = errorMatcher(this.context);
  private readonly adapter = inject<DateAdapter<D>>(DateAdapter);

  protected readonly value = computed(() => toPicker(this.adapter, this.context().state.value()));
  protected readonly min = computed(() => toPicker(this.adapter, this.context().def.min));
  protected readonly max = computed(() => toPicker(this.adapter, this.context().def.max));

  protected write(picked: D | null): void {
    const c = this.context();
    c.state.value.set(fromPicker(this.adapter, picked, typeof c.state.value() === 'string'));
    c.state.markAsDirty();
  }
}

/** `{ from, to }` date ranges with Material's range picker. */
@Component({
  selector: 'ngu-mat-date-range',
  imports: [MatFormField, MatLabel, MatHint, MatError, MatSuffix, MatDateRangeInput, MatStartDate, MatEndDate, MatDateRangePicker, MatDatepickerToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    <mat-form-field [appearance]="options.appearance!" [floatLabel]="options.floatLabel!" [subscriptSizing]="options.subscriptSizing!">
      @if (c.label) {
        <mat-label class="ngu-label">{{ c.label }}</mat-label>
      }
      <mat-date-range-input [rangePicker]="picker" [min]="min()" [max]="max()" [required]="c.required" [disabled]="c.state.disabled()">
        <input
          matStartDate
          [id]="c.id"
          [value]="from()"
          [placeholder]="c.i18n.text(c.def.fromLabel) ?? c.i18n.message('dateFrom')"
          [errorStateMatcher]="matcher"
          (dateChange)="write('from', $event.value)"
          (blur)="c.touch()"
        />
        <input
          matEndDate
          [value]="to()"
          [placeholder]="c.i18n.text(c.def.toLabel) ?? c.i18n.message('dateTo')"
          [errorStateMatcher]="matcher"
          (dateChange)="write('to', $event.value)"
          (blur)="c.touch()"
        />
      </mat-date-range-input>
      <mat-datepicker-toggle matSuffix [for]="picker" />
      <mat-date-range-picker #picker (closed)="c.touch()" />
      @if (c.error) {
        <mat-error class="ngu-error">{{ c.error }}</mat-error>
      } @else if (c.hint) {
        <mat-hint class="ngu-hint">{{ c.hint }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-form-field {
      inline-size: 100%;
    }
  `,
})
export class NguMatDateRange<D = unknown> {
  /** The field's render context: texts, state and options, from ngu-form. */
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly options = inject(NGU_MATERIAL_OPTIONS);
  protected readonly matcher = errorMatcher(this.context);
  private readonly adapter = inject<DateAdapter<D>>(DateAdapter);

  private readonly range = computed(() => (this.context().state.value() ?? {}) as { from?: unknown; to?: unknown });
  protected readonly from = computed(() => toPicker(this.adapter, this.range().from));
  protected readonly to = computed(() => toPicker(this.adapter, this.range().to));
  protected readonly min = computed(() => toPicker(this.adapter, this.context().def.min));
  protected readonly max = computed(() => toPicker(this.adapter, this.context().def.max));

  protected write(end: 'from' | 'to', picked: D | null): void {
    const c = this.context();
    const current = this.range();
    const asString = typeof current.from === 'string' || typeof current.to === 'string';
    c.state.value.set({ ...current, [end]: fromPicker(this.adapter, picked, asString) });
    c.state.markAsDirty();
  }
}
