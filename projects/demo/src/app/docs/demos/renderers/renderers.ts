import { Component } from '@angular/core';
import { defineForm, NguForm, provideNguFieldRenderers } from 'ngu-form';
import { BoxedField } from './boxed-field';

@Component({
  selector: 'demo-renderers',
  imports: [NguForm],
  // Every text and email field renders through BoxedField; other types keep the built-ins.
  providers: [provideNguFieldRenderers({ text: BoxedField, email: BoxedField })],
  template: `<ngu-form [form]="form" submitLabel="Send" />`,
})
export class RenderersDemo {
  readonly form = defineForm(
    { name: '', email: '', urgent: false },
    {
      name: { label: 'Name', required: true, placeholder: 'Ada Lovelace' },
      email: { label: 'Email', type: 'email', required: true, hint: 'We reply within a day' },
      urgent: 'This is urgent',
    },
  );
}
