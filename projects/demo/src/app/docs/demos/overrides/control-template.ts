import { Component } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { defineForm, NguControlTemplate, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-control-template',
  imports: [NguForm, NguControlTemplate, FormField],
  template: `
    <ngu-form [form]="form">
      <!-- Replaces only the control; the label, hint and errors stay. -->
      <ng-template nguControl="size" let-field let-id="id" let-describedBy="describedBy">
        <input type="range" [id]="id" [formField]="field" [attr.aria-describedby]="describedBy" />
      </ng-template>
    </ngu-form>
  `,
})
export class ControlTemplateDemo {
  // min and max reach the range input through [formField].
  readonly form = defineForm(
    { size: 3 },
    { size: { label: 'Team size', min: 1, max: 5, hint: 'From 1 to 5' } },
  );
}
