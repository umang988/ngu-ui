import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NguBind, type NguFieldRenderContext } from 'ngu-form';
import { RadioButton } from 'primeng/radiobutton';
import { SelectButton } from 'primeng/selectbutton';
import { messageId, NguPrimeFrame } from './frame';

let nextGroup = 0;

/** Radios with `p-radiobutton`, segmented controls with `p-selectbutton`. */
@Component({
  selector: 'ngu-prime-choice',
  imports: [NguBind, NguPrimeFrame, RadioButton, SelectButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    <ngu-prime-frame [context]="c" [group]="true">
      @if (c.def.type === 'segmented') {
        <p-selectbutton
          [nguBind]="c.field"
          [options]="$any(c.choices)"
          optionLabel="label"
          optionValue="value"
          optionDisabled="disabled"
          [allowEmpty]="false"
          [invalid]="c.showErrors"
          [ariaLabelledBy]="c.label ? c.id + '-label' : undefined"
        />
      } @else {
        <div class="ngu-prime-options" role="radiogroup" [attr.aria-labelledby]="c.label ? c.id + '-label' : null" [attr.aria-describedby]="describedBy()" [attr.aria-required]="c.required || null">
          @for (o of c.choices; track $index) {
            <span class="ngu-prime-option">
              <p-radiobutton
                [nguBind]="c.field"
                [name]="name"
                [value]="o.value"
                [inputId]="$index === 0 ? c.id : c.id + '-' + $index"
                [invalid]="c.showErrors"
                [disabled]="o.disabled ?? false"
              />
              <label [for]="$index === 0 ? c.id : c.id + '-' + $index">{{ o.label }}</label>
            </span>
          }
        </div>
      }
    </ngu-prime-frame>
  `,
  styles: `
    :host {
      display: block;
    }
    .ngu-prime-options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
    }
    .ngu-prime-option {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
  `,
})
export class NguPrimeChoice {
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly name = `ngu-prime-radio-${nextGroup++}`;
  protected readonly describedBy = computed(() => messageId(this.context()));
}
