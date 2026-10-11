import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-checkbox-basic',
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Continue" />`,
})
export class CheckboxBasicDemo {
  readonly form = defineForm(
    { remember: true, terms: false },
    {
      remember: 'Keep me signed in', // a boolean is a checkbox
      terms: { label: 'I have read the terms', required: true },
    },
  );
}
