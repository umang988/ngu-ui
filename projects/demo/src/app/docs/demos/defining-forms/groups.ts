import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-groups',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class GroupsDemo {
  readonly form = defineForm(
    { name: '', address: { street: '', city: '', zip: '' } },
    {
      name: 'Name',
      // A nested object is a group: written directly, or with options around its fields.
      address: {
        title: 'Address',
        cols: 2,
        fields: {
          street: { label: 'Street', span: 2 },
          city: 'City',
          zip: { label: 'PIN code', inputmode: 'numeric' },
        },
      },
    },
  );
}
