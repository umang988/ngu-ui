import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-rules',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
export class RulesDemo {
  readonly form = defineForm(
    { username: '', email: '', age: 0 },
    {
      username: {
        label: 'Username',
        required: true,
        minLength: 3,
        maxLength: 16,
        pattern: /^[a-z0-9-]+$/,
      },
      email: { label: 'Email', type: 'email', required: 'Where should we write to you?' },
      age: { label: 'Age', min: 18, max: 120 },
    },
  );
}
