import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import type { NguFieldRenderContext } from 'ngu-form';
import { NguMatSubscript, subscriptId } from './messages';
import { SUBSCRIPT_STYLES } from './shared';

/** Radios as `mat-radio-group`, segmented controls as `mat-button-toggle-group`. */
@Component({
  selector: 'ngu-mat-choice',
  imports: [FormField, MatRadioGroup, MatRadioButton, MatButtonToggleGroup, MatButtonToggle, NguMatSubscript],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @if (c.label) {
      <span class="ngu-mat-legend ngu-label" [id]="c.id + '-label'">{{ c.label }}@if (c.required) {<span aria-hidden="true"> *</span>}</span>
    }
    @if (c.def.type === 'segmented') {
      <mat-button-toggle-group
        hideSingleSelectionIndicator
        [formField]="c.field"
        [attr.aria-labelledby]="c.label ? c.id + '-label' : null"
        [attr.aria-describedby]="describedBy()"
      >
        @for (o of c.choices; track $index) {
          <mat-button-toggle [value]="o.value" [disabled]="o.disabled ?? false" [id]="$index === 0 ? c.id : c.id + '-' + $index">{{ o.label }}</mat-button-toggle>
        }
      </mat-button-toggle-group>
    } @else {
      <mat-radio-group
        class="ngu-mat-radios"
        [formField]="c.field"
        [attr.aria-labelledby]="c.label ? c.id + '-label' : null"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="c.showErrors || null"
      >
        @for (o of c.choices; track $index) {
          <mat-radio-button [value]="o.value" [disabled]="o.disabled ?? false" [id]="$index === 0 ? c.id : c.id + '-' + $index">{{ o.label }}</mat-radio-button>
        }
      </mat-radio-group>
    }
    <ngu-mat-subscript [context]="c" />
  `,
  styles: `
    ${SUBSCRIPT_STYLES}
    .ngu-mat-radios {
      display: flex;
      flex-wrap: wrap;
      gap: 0 1rem;
    }
    mat-button-toggle-group {
      align-self: flex-start;
    }
  `,
})
export class NguMatChoice {
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly describedBy = computed(() => subscriptId(this.context()));
}
