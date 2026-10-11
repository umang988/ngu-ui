import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-list-primitives',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ListPrimitivesDemo {
  readonly form = defineForm(
    { emails: ['ana@example.com'] },
    {
      // For a list of strings or numbers, item is one field spec.
      emails: { title: 'Email addresses', newItem: '', item: { label: 'Email', type: 'email' } },
    },
  );
}
