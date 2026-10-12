import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NguBind, type NguFieldRenderContext } from 'ngu-form';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { NguPrimeFrame } from './frame';

/** Selects with `p-select`, and lists with `p-multiselect`. Option values keep their type. */
@Component({
  selector: 'ngu-prime-select',
  imports: [NguBind, NguPrimeFrame, Select, MultiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    <ngu-prime-frame [context]="c">
      @if (c.def.multiple) {
        <p-multiselect
          [nguBind]="c.field"
          [options]="$any(c.choices)"
          optionLabel="label"
          optionValue="value"
          optionDisabled="disabled"
          display="chip"
          [inputId]="c.id"
          [placeholder]="c.placeholder"
          [invalid]="c.showErrors"
          [required]="c.required"
          [readonly]="c.state.readonly()"
          [ariaLabelledBy]="c.label ? c.id + '-label' : undefined"
          [showToggleAll]="false"
          [fluid]="true"
        />
      } @else {
        <p-select
          [nguBind]="c.field"
          [options]="$any(c.choices)"
          optionLabel="label"
          optionValue="value"
          optionDisabled="disabled"
          [inputId]="c.id"
          [placeholder]="c.placeholder"
          [invalid]="c.showErrors"
          [required]="c.required"
          [readonly]="c.state.readonly()"
          [ariaLabelledBy]="c.label ? c.id + '-label' : undefined"
          [fluid]="true"
        />
      }
    </ngu-prime-frame>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class NguPrimeSelect {
  readonly context = input.required<NguFieldRenderContext>();
}
