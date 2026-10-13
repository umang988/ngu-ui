import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatOption } from '@angular/material/core';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import type { NguFieldRenderContext } from 'ngu-form';
import { errorMatcher, NGU_MATERIAL_OPTIONS } from './shared';

/** Selects, single or multiple, as `mat-select`. Option values keep their type. */
@Component({
  selector: 'ngu-mat-select',
  imports: [FormField, MatFormField, MatLabel, MatHint, MatError, MatSelect, MatOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    <mat-form-field [appearance]="options.appearance!" [floatLabel]="options.floatLabel!" [subscriptSizing]="options.subscriptSizing!">
      @if (c.label) {
        <mat-label class="ngu-label">{{ c.label }}</mat-label>
      }
      @if (c.def.multiple) {
        <mat-select multiple [formField]="c.field" [id]="c.id" [placeholder]="c.placeholder" [errorStateMatcher]="matcher">
          @for (o of c.choices; track $index) {
            <mat-option [value]="o.value" [disabled]="o.disabled ?? false">{{ o.label }}</mat-option>
          }
        </mat-select>
      } @else {
        <mat-select [formField]="c.field" [id]="c.id" [placeholder]="c.placeholder" [errorStateMatcher]="matcher">
          @for (o of c.choices; track $index) {
            <mat-option [value]="o.value" [disabled]="o.disabled ?? false">{{ o.label }}</mat-option>
          }
        </mat-select>
      }
      @if (c.error) {
        <mat-error class="ngu-error">{{ c.error }}</mat-error>
      } @else if (c.pending) {
        <mat-hint class="ngu-hint">{{ c.pending }}</mat-hint>
      } @else if (c.warning) {
        <mat-hint class="ngu-hint">{{ c.warning }}</mat-hint>
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
export class NguMatSelect {
  /** The field's render context: texts, state and options, from ngu-form. */
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly options = inject(NGU_MATERIAL_OPTIONS);
  protected readonly matcher = errorMatcher(this.context);
}
