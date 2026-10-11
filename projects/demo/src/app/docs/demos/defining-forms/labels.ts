import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-labels',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class LabelsDemo {
  // A string is the label; the input comes from the value's type.
  readonly form = defineForm(
    { name: '', age: 30, newsletter: true },
    { name: 'Name', age: 'Age', newsletter: 'Send me the newsletter' },
  );
}
