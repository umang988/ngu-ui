import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-phone-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class PhoneBasicDemo {
  readonly form = defineForm(
    { mobile: '' },
    {
      // Stored as E.164, such as +919876543210. Paste +44 7911 123456 to see the country change.
      mobile: { label: 'Mobile number', type: 'phone', country: 'IN' },
    },
  );
}
