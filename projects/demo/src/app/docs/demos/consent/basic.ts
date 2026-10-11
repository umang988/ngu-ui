import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-consent-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Create account" />`,
})
export class ConsentBasicDemo {
  readonly form = defineForm(
    { acceptedTerms: null as Date | null, marketing: false },
    {
      // The value is when it was accepted, or null.
      acceptedTerms: {
        label: 'I accept the terms of service',
        type: 'consent',
        required: true,
        policy: { href: 'https://angular.dev/license', label: 'Read the terms' },
      },
      marketing: { label: 'Send me product news', type: 'switch' },
    },
  );
}
