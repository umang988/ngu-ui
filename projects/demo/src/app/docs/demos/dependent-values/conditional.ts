import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-conditional',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Continue" />`,
})
export class ConditionalDemo {
  readonly form = defineForm(
    { plan: 'free', company: '' },
    {
      plan: {
        label: 'Plan',
        type: 'segmented',
        options: [
          { value: 'free', label: 'Free' },
          { value: 'business', label: 'Business' },
        ],
      },
      company: {
        label: 'Company',
        hidden: (m) => m.plan === 'free',
        required: (m) => (m.plan === 'business' ? 'Business plans need a company name' : false),
      },
    },
  );
}
