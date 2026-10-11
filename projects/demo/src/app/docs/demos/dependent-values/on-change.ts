import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-on-change',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class OnChangeDemo {
  readonly form = defineForm(
    { billing: { city: 'Pune', zip: '411001' }, same: false, shipping: { city: '', zip: '' } },
    {
      billing: { title: 'Billing', cols: 2, fields: { city: 'City', zip: 'PIN code' } },
      // Runs after the user's own change only, so hooks never loop.
      same: {
        label: 'Ship to the billing address',
        onChange: (same, { model, patch }) => same && patch({ shipping: { ...model.billing } }),
      },
      shipping: { title: 'Shipping', cols: 2, fields: { city: 'City', zip: 'PIN code' } },
    },
  );
}
