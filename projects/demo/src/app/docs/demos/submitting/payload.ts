import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-payload',
  imports: [NguForm, JsonPipe],
  template: `
    <ngu-form [form]="form" />
    <p class="demo-status">What (submitted) and the action receive:</p>
    <pre class="demo-result">{{ form.payload() | json }}</pre>
  `,
})
export class PayloadDemo {
  readonly form = defineForm(
    { name: 'Ana Rao', plan: 'free', company: 'Acme' },
    {
      name: 'Name',
      plan: {
        label: 'Business plan',
        type: 'select',
        options: [
          { value: 'free', label: 'Free' },
          { value: 'business', label: 'Business' },
        ],
      },
      company: { label: 'Company', hidden: (m) => m.plan === 'free' },
    },
    {
      omitHidden: true, // hidden fields are left out
      mapValue: (m) => ({ fullName: m.name, plan: m.plan.toUpperCase(), company: m.company }),
    },
  );
}
