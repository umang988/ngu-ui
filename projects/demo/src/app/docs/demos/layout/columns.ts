import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-columns',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ColumnsDemo {
  readonly form = defineForm(
    { first: '', last: '', email: '', phone: '', company: '', role: '' },
    {
      first: 'First name',
      last: 'Last name',
      email: { label: 'Email', type: 'email', span: 2 },
      phone: 'Phone',
      company: 'Company',
      role: 'Role',
    },
    // One column on narrow forms, two from the md width (720px), three from lg (960px).
    { cols: { base: 1, md: 2, lg: 3 } },
  );
}
