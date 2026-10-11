import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-text-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class TextBasicDemo {
  readonly form = defineForm(
    { name: '', email: '', password: '', bio: '' },
    {
      name: 'Full name', // a string is the label
      email: { label: 'Email', type: 'email', autocomplete: 'email' },
      password: { label: 'Password', type: 'password', minLength: 8 },
      bio: { label: 'About you', type: 'textarea', placeholder: 'A sentence or two' },
    },
  );
}
