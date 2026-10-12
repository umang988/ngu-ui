import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  notes: string;
}

@Component({
  selector: 'demo-layout-order',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class OrderDemo {
  // The model comes from an API in this order; the form shows email first and notes last.
  readonly form = defineForm<Contact>(
    { notes: '', lastName: '', firstName: '', email: '' } as Contact,
    {
      notes: { label: 'Notes', type: 'textarea', order: 1, span: 2 },
      lastName: { label: 'Last name' },
      firstName: { label: 'First name', order: -1 },
      email: { label: 'Email', type: 'email', order: -2, span: 2 },
    },
    { cols: { base: 1, sm: 2 } },
  );
}
