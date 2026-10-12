import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-unstyled',
  imports: [NguForm],
  // theme="none": no ngu-form CSS; the markup, its ngu-* classes and the behavior stay.
  template: `<ngu-form [form]="form" theme="none" submitLabel="Subscribe" />`,
})
export class UnstyledDemo {
  readonly form = defineForm(
    { email: '', topics: [] as string[] },
    {
      email: { label: 'Email', type: 'email', required: true },
      topics: {
        label: 'Topics',
        type: 'checkbox',
        options: [
          { value: 'releases', label: 'Releases' },
          { value: 'guides', label: 'Guides' },
        ],
      },
    },
  );
}
