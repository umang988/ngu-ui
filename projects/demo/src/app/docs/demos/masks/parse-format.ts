import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-parse-format',
  imports: [NguForm],
  template: `<ngu-form [form]="form" />`,
})
export class ParseFormatDemo {
  readonly form = defineForm(
    { name: '', code: '' },
    {
      name: {
        label: 'Display name',
        parse: (text) => text.trim(),
        hint: 'Spaces around it are dropped',
      },
      code: {
        label: 'Coupon',
        parse: (text) => text.toUpperCase().replace(/\s/g, ''),
        format: (value) => value.replace(/(.{4})(?=.)/g, '$1 '),
      },
    },
  );
}
