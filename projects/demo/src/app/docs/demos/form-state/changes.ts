import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-changes',
  imports: [NguForm, JsonPipe],
  template: `
    <ngu-form [form]="form" submitLabel="Save" />
    <p class="demo-status">changes(), the body of a PATCH request:</p>
    <pre class="demo-result">{{ form.changes() | json }}</pre>
  `,
})
export class ChangesDemo {
  readonly form = defineForm(
    { name: 'Ana Rao', email: 'ana@example.com', address: { city: 'Pune', zip: '411001' } },
    {
      name: 'Name',
      email: { label: 'Email', type: 'email' },
      address: { city: 'City', zip: 'PIN code' },
    },
  );
}
