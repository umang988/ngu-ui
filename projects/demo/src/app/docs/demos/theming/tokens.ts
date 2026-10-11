import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-tokens',
  imports: [NguForm],
  template: `<ngu-form class="brand" [form]="form" submitLabel="Join the waitlist" />`,
  // Custom properties on ngu-form or any ancestor restyle every field.
  styles: `
    .brand {
      --ngu-primary: #0f766e;
      --ngu-on-primary: #ffffff; /* text on the button and chosen segments */
      --ngu-focus-color: #0f766e;
      --ngu-radius: 999px;
      --ngu-input-padding: 0.625rem 1rem;
      --ngu-border-color: #94a3b8;
      --ngu-gap: 1.25rem;
    }
  `,
})
export class TokensDemo {
  readonly form = defineForm(
    { email: '', role: 'dev' },
    {
      email: { label: 'Work email', type: 'email', required: true },
      role: {
        label: 'Role',
        type: 'segmented',
        options: [
          { value: 'dev', label: 'Developer' },
          { value: 'lead', label: 'Lead' },
        ],
      },
    },
  );
}
