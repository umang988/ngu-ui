import { Component } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { defineForm, NguFieldTemplate, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-field-template',
  imports: [NguForm, NguFieldTemplate, FormField],
  template: `
    <ngu-form [form]="form">
      <!-- Replaces the whole field: label, control and messages. -->
      <ng-template nguField="newsletter" let-field let-id="id">
        <label class="demo-callout" [for]="id">
          <input type="checkbox" [id]="id" [formField]="field" />
          <span
            ><strong>Monthly newsletter.</strong> One email, the first Monday of each month.</span
          >
        </label>
      </ng-template>
    </ngu-form>
  `,
})
export class FieldTemplateDemo {
  readonly form = defineForm(
    { email: '', newsletter: true },
    { email: { label: 'Email', type: 'email' }, newsletter: 'Newsletter' },
  );
}
