import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-static',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class StaticDemo {
  readonly form = defineForm(
    { email: '', city: '', zip: '' },
    {
      $contact: { heading: 'Contact' },
      email: { label: 'Email', type: 'email' },
      $divider: { divider: true },
      $shipping: { heading: 'Shipping' },
      $note: { text: 'We only use your address for delivery.' },
      city: 'City',
      zip: 'PIN code',
    },
  );
}
