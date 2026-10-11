import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-summary',
  imports: [NguForm],
  // After a refused submit, a list of problems with links to each field.
  template: `<ngu-form [form]="form" errorSummary submitLabel="Apply" />`,
})
export class SummaryDemo {
  readonly form = defineForm(
    { name: '', email: '', reason: '' },
    {
      name: { label: 'Full name', required: true },
      email: { label: 'Email', type: 'email', required: true },
      reason: {
        label: 'Why do you want to join?',
        type: 'textarea',
        required: true,
        minLength: 20,
      },
    },
  );
}
